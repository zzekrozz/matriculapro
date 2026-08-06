import assert from 'node:assert/strict';
import { NextResponse } from 'next/server';
import {
  jsonWithSupabaseCookies,
  redirectWithSupabaseCookies,
} from '../../src/lib/supabase/response';

const source = NextResponse.next();
source.cookies.set('sb-access-token', 'renewed-access', {
  httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 3_600,
});
source.cookies.set('sb-refresh-token', 'renewed-refresh', {
  httpOnly: true, secure: true, sameSite: 'strict', path: '/app',
  expires: new Date('2030-01-01T00:00:00.000Z'),
});
source.headers.set('x-request-id', 'middleware-cookie-test');
source.headers.set('connection', 'unsafe-hop-by-hop');

const redirect = redirectWithSupabaseCookies(new URL('https://example.test/app'), source);
assert.equal(redirect.status, 307);
assert.equal(redirect.cookies.getAll().length, 2);
assert.equal(redirect.cookies.get('sb-access-token')?.httpOnly, true);
assert.equal(redirect.cookies.get('sb-access-token')?.sameSite, 'lax');
assert.equal(redirect.cookies.get('sb-access-token')?.path, '/');
assert.equal(redirect.cookies.get('sb-refresh-token')?.sameSite, 'strict');
assert.equal(redirect.cookies.get('sb-refresh-token')?.path, '/app');
assert.equal(redirect.headers.get('x-request-id'), 'middleware-cookie-test');
assert.equal(redirect.headers.get('connection'), null);
assert.match(redirect.headers.get('cache-control') ?? '', /private.*no-store/);

const unauthorized = jsonWithSupabaseCookies({ ok: false }, { status: 401 }, source);
assert.equal(unauthorized.status, 401);
assert.equal(unauthorized.cookies.getAll().length, 2);
assert.match(unauthorized.headers.get('cache-control') ?? '', /private.*no-store/);

console.log('MIDDLEWARE_COOKIE_TEST_STATUS=VALID (2 cookies, attributes, redirect, JSON, safe headers)');
