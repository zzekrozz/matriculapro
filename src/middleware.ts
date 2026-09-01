import { NextResponse, type NextRequest } from 'next/server';
import { safeInternalPath } from '@/lib/auth/redirect';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { jsonWithSupabaseCookies, redirectWithSupabaseCookies } from '@/lib/supabase/response';

const PROTECTED_PREFIXES = ['/app', '/api/free-check', '/api/fiscal', '/api/payments', '/api/professional', '/api/public-beta', '/api/account'];
const API_PREFIXES = ['/api/free-check', '/api/fiscal', '/api/payments', '/api/professional', '/api/public-beta', '/api/account'];
const AUTH_ENTRY_PATHS = ['/entrar', '/registro'];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const protectedPath = PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
  const authEntry = AUTH_ENTRY_PATHS.includes(pathname);
  if (!protectedPath && !authEntry) return response;

  let authenticated = false;
  try {
    const supabase = createSupabaseMiddlewareClient(request, response);
    const { data, error } = await supabase.auth.getUser();
    authenticated = !error && Boolean(data.user);
  } catch {
    authenticated = false;
  }

  if (authEntry && authenticated) {
    const destination = request.nextUrl.clone();
    const requestedDestination = new URL(
      safeInternalPath(request.nextUrl.searchParams.get('next')),
      request.nextUrl.origin,
    );
    destination.pathname = requestedDestination.pathname;
    destination.search = requestedDestination.search;
    destination.hash = requestedDestination.hash;
    return redirectWithSupabaseCookies(destination, response);
  }
  if (!protectedPath || authenticated) return response;
  if (API_PREFIXES.some((prefix) => matches(pathname, prefix))) {
    return jsonWithSupabaseCookies(
      { ok: false, code: 'unauthorized', message: 'Debes iniciar sesión.' },
      { status: 401 },
      response,
    );
  }
  const destination = request.nextUrl.clone();
  destination.pathname = '/entrar';
  destination.search = '';
  destination.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return redirectWithSupabaseCookies(destination, response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)'],
};
