import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Rutas que siempre son públicas — nunca redirigir.
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

/** Rutas que requieren estar autenticado o tener cookie de acceso local */
const PROTECTED_PREFIXES = ['/app'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Siempre públicas — pasar sin tocar
  if (ALWAYS_PUBLIC.some(p => pathname.startsWith(p))) {
    return response;
  }

  // CRÍTICO: refrescar las cookies de sesión de Supabase en cada request.
  // @supabase/ssr necesita esto para que el token no expire.
  // NO consultar profiles aquí — es frágil y causa loops.
  let hasSession = false;
  try {
    const supabase = createSupabaseMiddlewareClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();
    hasSession = !!user;
  } catch {
    // Si Supabase falla, continuar sin bloquear
  }

  // Cookie local de acceso (escrita por el cliente tras cargar el perfil)
  const cookieLevel = request.cookies.get('mpro:access-level')?.value ?? '';
  const hasLocalAccess = ['explorer', 'founder', 'full'].includes(cookieLevel);

  // Tiene acceso si hay sesión Supabase válida O si tiene cookie de acceso local
  const hasAccess = hasSession || hasLocalAccess;

  // Proteger /app
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p)) && !hasAccess) {
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
