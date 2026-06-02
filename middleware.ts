import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Rutas que siempre son públicas — nunca redirigir aunque no haya sesión.
 */
const ALWAYS_PUBLIC = [
  '/founder/bienvenida',
  '/acceso-founder',
  '/acceso',
  '/auth/',
  '/entrar',
  '/api/',
  '/demo',
  '/legal/',
];

/** Rutas que requieren algún nivel de acceso (sesión Supabase o cookie local) */
const PROTECTED_PREFIXES = ['/app'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Siempre públicas — devolver sin tocar nada
  if (ALWAYS_PUBLIC.some(p => pathname.startsWith(p))) {
    return response;
  }

  // Refrescar sesión Supabase — CRÍTICO: esto también refresca las cookies de sesión
  // en la respuesta, para que el browser las tenga actualizadas.
  let hasSupabaseSession = false;
  let supabaseAccessLevel: string | null = null;

  try {
    const supabase = createSupabaseMiddlewareClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      hasSupabaseSession = true;

      // Leer access_level directamente de Supabase para sincronizar la cookie
      // sin depender de que el cliente la haya actualizado.
      const { data: profile } = await supabase
        .from('profiles')
        .select('access_level, founder_number')
        .eq('id', user.id)
        .single();

      if (profile?.access_level) {
        supabaseAccessLevel = profile.access_level;
        // Sincronizar cookie con el nivel real — el cliente puede no haberlo hecho aún
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        response.cookies.set('mpro:access-level', profile.access_level, {
          path: '/',
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          sameSite: 'lax',
          httpOnly: false,
        });
      }
    }
  } catch (err) {
    // Supabase no disponible o error de red — no bloquear la app
    console.warn('[Middleware] Supabase error:', err);
  }

  // Leer cookie local (puede estar sincronizada ya, o ser del modo explorer/dev)
  const cookieLevel = request.cookies.get('mpro:access-level')?.value ?? '';
  // Usar el nivel de Supabase si está disponible (más fiable que la cookie)
  const effectiveLevel = supabaseAccessLevel ?? cookieLevel;
  const hasAccess = hasSupabaseSession || ['explorer', 'founder', 'full'].includes(effectiveLevel);

  // Proteger /app — redirigir a /acceso si no hay acceso
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if (isProtected && !hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = '/acceso';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
