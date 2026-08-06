import { NextResponse } from 'next/server';

const SAFE_RESPONSE_HEADERS = ['vary', 'x-request-id', 'x-vercel-id'] as const;

/** Copy the complete Supabase SSR cookie set into a replacement response. */
export function withSupabaseCookies(
  target: NextResponse,
  sourceResponse: NextResponse,
): NextResponse {
  for (const cookie of sourceResponse.cookies.getAll()) target.cookies.set(cookie);
  for (const headerName of SAFE_RESPONSE_HEADERS) {
    const value = sourceResponse.headers.get(headerName);
    if (value) target.headers.set(headerName, value);
  }
  target.headers.set('Cache-Control', 'private, no-store, max-age=0');
  target.headers.set('Pragma', 'no-cache');
  return target;
}

export function redirectWithSupabaseCookies(
  destination: URL,
  sourceResponse: NextResponse,
  status: 301 | 302 | 303 | 307 | 308 = 307,
): NextResponse {
  return withSupabaseCookies(NextResponse.redirect(destination, { status }), sourceResponse);
}

export function jsonWithSupabaseCookies(
  body: unknown,
  init: ResponseInit,
  sourceResponse: NextResponse,
): NextResponse {
  return withSupabaseCookies(NextResponse.json(body, init), sourceResponse);
}
