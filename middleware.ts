import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/app'];
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/acceso'];

/** Niveles que dan acceso a /app sin necesidad de sesión Supabase */
const APP_ACCESS_LEVELS = ['explorer', 'founder', 'full'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // -------------------------------------------------------
  // 1. Intentar refrescar sesión Supabase (no bloquea si falla)
  // -------------------------------------------------------
  let hasSupabaseUser = false;
  try {
    const supabase = createSupabaseMiddlewareClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();
    hasSupabaseUser = !!user;
  } catch {
    // Supabase no configurado o falla → ignorar, seguir con cookie local
  }

  // -------------------------------------------------------
  // 2. Leer nivel de acceso local (cookie escrita por /entrar)
  // -------------------------------------------------------
  const localLevel = request.cookies.get('mpro:access-level')?.value ?? '';
  const hasLocalAccess = APP_ACCESS_LEVELS.includes(localLevel);

  // Tiene acceso si hay sesión Supabase O si tiene cookie de nivel válido
  const hasAccess = hasSupabaseUser || hasLocalAccess;

  // -------------------------------------------------------
  // 3. Proteger /app — redirigir a /acceso si no tiene acceso
  // -------------------------------------------------------
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if (isProtected && !hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = '/acceso';
    return NextResponse.redirect(url);
  }

  // -------------------------------------------------------
  // 4. Si ya tiene sesión y va a rutas de auth → dashboard
  // -------------------------------------------------------
  if (AUTH_ROUTES.includes(pathname) && hasSupabaseUser) {
    const url = request.nextUrl.clone();
    url.pathname = '/app/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
