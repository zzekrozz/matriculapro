import { NextResponse, type NextRequest } from 'next/server';
import { safeInternalPath } from '@/lib/auth/redirect';
import { isPublicBetaEnabled } from '@/config/public-beta';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { jsonWithSupabaseCookies, redirectWithSupabaseCookies } from '@/lib/supabase/response';

const PROTECTED_PREFIXES = ['/app', '/api/free-check', '/api/fiscal', '/api/payments', '/api/professional', '/api/public-beta', '/api/account'];
const API_PREFIXES = ['/api/free-check', '/api/fiscal', '/api/payments', '/api/professional', '/api/public-beta', '/api/account'];
const AUTH_ENTRY_PATHS = ['/entrar', '/registro'];
const BETA_HIDDEN_AUTH_PATHS = [
  ...AUTH_ENTRY_PATHS,
  '/recuperar-contrasena',
  '/restablecer-contrasena',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const protectedPath = PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
  const authEntry = AUTH_ENTRY_PATHS.includes(pathname);
  const betaHiddenAuth = BETA_HIDDEN_AUTH_PATHS.includes(pathname);
  if (!protectedPath && !authEntry && !betaHiddenAuth) return response;

  const publicBeta = isPublicBetaEnabled();
  if (publicBeta && (
    matches(pathname, '/api/professional')
    || matches(pathname, '/api/public-beta')
    || matches(pathname, '/api/account')
  )) {
    return NextResponse.json(
      { ok: false, code: 'public_beta_local_only', message: 'La beta no utiliza persistencia de cuenta.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (publicBeta && betaHiddenAuth) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/app/dashboard';
    destination.search = '';
    return NextResponse.redirect(destination);
  }
  // User pages and stateless calculation APIs are open during the beta. Data
  // persistence is local to the browser; private/admin APIs remain protected.
  if (publicBeta && (
    matches(pathname, '/app')
    || matches(pathname, '/api/free-check')
    || matches(pathname, '/api/fiscal')
  )) return response;

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
