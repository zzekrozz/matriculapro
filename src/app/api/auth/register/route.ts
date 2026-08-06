import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { LEGAL_DOCUMENT_VERSIONS } from '@/config/legal';
import { SITE_URL } from '@/config/site';
import {
  firstValidationMessage,
  registrationSchema,
} from '@/domain/auth/validation';
import { safeInternalPath } from '@/lib/auth/redirect';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimitedResponse } from '@/server/security/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const globalLimit = await rateLimitedResponse(request, 'auth:register:ip', {
    limit: 20,
    windowSeconds: 3_600,
  });
  if (globalLimit) return globalLimit;

  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: firstValidationMessage(parsed.error) },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const emailLimit = await rateLimitedResponse(
    request,
    `auth:register:${parsed.data.email}`,
    { limit: 5, windowSeconds: 3_600 },
  );
  if (emailLimit) return emailLimit;

  const next = safeInternalPath(parsed.data.next);
  const callback = new URL('/auth/callback', SITE_URL);
  callback.searchParams.set('next', next);

  const registrationToken = randomBytes(32).toString('base64url');
  const tokenSha256 = createHash('sha256').update(registrationToken, 'utf8').digest('hex');
  const admin = createSupabaseAdminClient();

  try {
    await admin
      .from('registration_authorizations')
      .delete()
      .lt('expires_at', new Date().toISOString());
    const { error: authorizationError } = await admin
      .from('registration_authorizations')
      .insert({
        email: parsed.data.email,
        token_sha256: tokenSha256,
        display_name: parsed.data.displayName,
        terms_version: LEGAL_DOCUMENT_VERSIONS.terms,
        privacy_version: LEGAL_DOCUMENT_VERSIONS.privacy,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
    if (authorizationError) throw new Error('registration_authorization_unavailable');

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: callback.toString(),
        data: {
          registration_token: registrationToken,
        },
      },
    });

    // Supabase can intentionally obscure an existing account. Keep the same
    // response in both cases so this endpoint cannot be used for enumeration.
    if (error && !isRepeatedRegistration(error.code, error.message)) {
      return NextResponse.json(
        { ok: false, message: 'No se ha podido procesar el registro.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'Si el email puede registrarse, recibirás un enlace de confirmación.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: 'El registro no está disponible en este momento.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  } finally {
    await admin
      .from('registration_authorizations')
      .delete()
      .eq('token_sha256', tokenSha256);
  }
}

function isRepeatedRegistration(
  code: string | undefined,
  message: string,
): boolean {
  return /already|registered|exists|user_already_exists/i.test(`${code ?? ''} ${message}`);
}
