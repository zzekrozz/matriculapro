import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { SITE_URL } from '@/config/site';
import { recoveryRequestSchema } from '@/domain/auth/validation';
import { RECOVERY_STATE_COOKIE, recoveryCookieOptions } from '@/lib/auth/recovery-flow';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimitedResponse } from '@/server/security/http';

export const dynamic = 'force-dynamic';

const neutralMessage = 'Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.';

export async function POST(request: Request) {
  const globalLimit = await rateLimitedResponse(request, 'auth:recover:ip', {
    limit: 12,
    windowSeconds: 3_600,
  });
  if (globalLimit) return globalLimit;

  const parsed = recoveryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return neutralResponse();

  const emailLimit = await rateLimitedResponse(
    request,
    `auth:recover:${parsed.data.email}`,
    { limit: 4, windowSeconds: 3_600 },
  );
  if (emailLimit) return emailLimit;

  const callback = new URL('/auth/callback', SITE_URL);
  const recoveryState = randomBytes(32).toString('base64url');
  callback.searchParams.set('type', 'recovery');
  callback.searchParams.set('next', '/restablecer-contrasena');
  callback.searchParams.set('state', recoveryState);

  try {
    const supabase = await createSupabaseServerClient();
    // Provider errors (including an unknown email) deliberately receive the
    // same response to avoid exposing whether the account exists.
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: callback.toString(),
    });
    const response = neutralResponse();
    response.cookies.set(
      RECOVERY_STATE_COOKIE,
      recoveryState,
      recoveryCookieOptions(15 * 60),
    );
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'No se ha podido procesar la solicitud.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

function neutralResponse() {
  return NextResponse.json(
    { ok: true, message: neutralMessage },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
