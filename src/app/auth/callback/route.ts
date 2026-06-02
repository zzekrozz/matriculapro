import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * /auth/callback
 *
 * Supabase redirige aquí después de que el usuario confirma su email.
 * El flujo PKCE llega con ?code=<valor> en la query.
 * Este handler intercambia el código por una sesión real y redirige.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app/dashboard';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirigir a la ruta de destino (siempre absoluta)
      const destination = next.startsWith('/') ? `${origin}${next}` : next;
      return NextResponse.redirect(destination);
    }
  }

  // Si no hay code o hubo error, ir a la página de confirm para mostrar error
  return NextResponse.redirect(`${origin}/auth/confirm?error=invalid_code`);
}
