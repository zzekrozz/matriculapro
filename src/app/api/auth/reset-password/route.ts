import { NextResponse, type NextRequest } from 'next/server';
import { firstValidationMessage, newPasswordSchema } from '@/domain/auth/validation';
import {
  isRecoveryToken,
  RECOVERY_AUTHORIZED_COOKIE,
  recoveryCookieOptions,
} from '@/lib/auth/recovery-flow';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimitedResponse } from '@/server/security/http';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const globalLimit = await rateLimitedResponse(request, 'auth:reset-password:ip', {
    limit: 10,
    windowSeconds: 3_600,
  });
  if (globalLimit) return globalLimit;

  const marker = request.cookies.get(RECOVERY_AUTHORIZED_COOKIE)?.value;
  if (!isRecoveryToken(marker)) return unauthorized();

  const parsed = newPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: firstValidationMessage(parsed.error) },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return unauthorized();

  const userLimit = await rateLimitedResponse(
    request,
    `auth:reset-password:${data.user.id}`,
    { limit: 5, windowSeconds: 3_600 },
  );
  if (userLimit) return userLimit;

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updateError) {
    const response = NextResponse.json(
      { ok: false, message: 'El enlace ya no es válido o no se ha podido actualizar la contraseña.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(RECOVERY_AUTHORIZED_COOKIE, '', recoveryCookieOptions(0));
    return response;
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  const response = NextResponse.json(
    { ok: true, sessionsClosed: !signOutError },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(RECOVERY_AUTHORIZED_COOKIE, '', recoveryCookieOptions(0));
  return response;
}

function unauthorized() {
  const response = NextResponse.json(
    { ok: false, message: 'El enlace no es válido o ha caducado.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(RECOVERY_AUTHORIZED_COOKIE, '', recoveryCookieOptions(0));
  return response;
}
