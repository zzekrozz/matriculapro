import { NextResponse } from 'next/server';
import { loginSchema } from '@/domain/auth/validation';
import { safeInternalPath } from '@/lib/auth/redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimitedResponse } from '@/server/security/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const globalLimit = await rateLimitedResponse(request, 'auth:login:ip', {
    limit: 50,
    windowSeconds: 300,
  });
  if (globalLimit) return globalLimit;

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidCredentials();

  const emailLimit = await rateLimitedResponse(
    request,
    `auth:login:${parsed.data.email}`,
    { limit: 8, windowSeconds: 300 },
  );
  if (emailLimit) return emailLimit;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error || !data.user || !data.session) return invalidCredentials();

    return NextResponse.json(
      { ok: true, redirectTo: safeInternalPath(parsed.data.next) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: 'El acceso no está disponible en este momento.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

function invalidCredentials() {
  return NextResponse.json(
    { ok: false, message: 'No se ha podido iniciar sesión con esos datos.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}
