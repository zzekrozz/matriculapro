export const DEFAULT_AUTH_DESTINATION = '/app/comprobar';

export function safeInternalPath(path: string | null | undefined, fallback = DEFAULT_AUTH_DESTINATION): string {
  const safeFallback = normalizeInternalPath(fallback) ?? DEFAULT_AUTH_DESTINATION;
  return normalizeInternalPath(path) ?? safeFallback;
}

function normalizeInternalPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  try {
    const base = new URL('https://matriculapro.invalid');
    const destination = new URL(path, base);
    if (destination.origin !== base.origin || isAuthLoop(destination.pathname)) return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

function isAuthLoop(pathname: string): boolean {
  return [
    '/entrar',
    '/registro',
    '/auth',
    '/api',
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
