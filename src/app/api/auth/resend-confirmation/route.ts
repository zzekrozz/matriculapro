import { NextResponse } from 'next/server';
import { SITE_URL } from '@/config/site';
import { resendConfirmationSchema } from '@/domain/auth/validation';
import { safeInternalPath } from '@/lib/auth/redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimitedResponse } from '@/server/security/http';

export const dynamic = 'force-dynamic';

const neutralMessage = 'Si la cuenta está pendiente, recibirás un nuevo enlace de confirmación.';

export async function POST(request: Request) {
  const globalLimit = await rateLimitedResponse(request, 'auth:resend:ip', {
    limit: 12,
    windowSeconds: 3_600,
  });
  if (globalLimit) return globalLimit;

  const parsed = resendConfirmationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return neutralResponse();

  const emailLimit = await rateLimitedResponse(
    request,
    `auth:resend:${parsed.data.email}`,
    { limit: 3, windowSeconds: 3_600 },
  );
  if (emailLimit) return emailLimit;

  const callback = new URL('/auth/callback', SITE_URL);
  callback.searchParams.set('next', safeInternalPath(parsed.data.next));

  try {
    const supabase = await createSupabaseServerClient();
    // Do not branch on the provider result: confirmed, unknown and pending
    // addresses must be indistinguishable from the caller's point of view.
    await supabase.auth.resend({
      type: 'signup',
      email: parsed.data.email,
      options: { emailRedirectTo: callback.toString() },
    });
    return neutralResponse();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'El reenvío no está disponible en este momento.' },
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
