import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  RECOVERY_AUTHORIZED_COOKIE,
  RECOVERY_STATE_COOKIE,
  recoveryCookieOptions,
  recoveryTokensMatch,
} from '@/lib/auth/recovery-flow';
import { safeInternalPath } from '@/lib/auth/redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ConfirmationFailure = 'expired' | 'invalid' | 'provider';
type AuthFlow = 'confirmation' | 'recovery';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeInternalPath(request.nextUrl.searchParams.get('next'));
  const requestedRecovery = request.nextUrl.searchParams.get('type') === 'recovery';
  const flow: AuthFlow = requestedRecovery && next === '/restablecer-contrasena'
    ? 'recovery'
    : 'confirmation';
  const recoveryState = request.nextUrl.searchParams.get('state');
  const recoveryStateCookie = request.cookies.get(RECOVERY_STATE_COOKIE)?.value;
  const providerError = request.nextUrl.searchParams.get('error');
  const providerErrorCode = request.nextUrl.searchParams.get('error_code');
  const providerErrorDescription = request.nextUrl.searchParams.get('error_description');
  const providerFailure = providerError || providerErrorCode
    ? classifyFailure(providerErrorCode, providerErrorDescription ?? providerError)
    : null;

  if (
    requestedRecovery
    && (
      flow !== 'recovery'
      || (!providerFailure && !code)
      || !recoveryTokensMatch(recoveryState, recoveryStateCookie)
    )
  ) {
    return failure(request, next, 'invalid', 'recovery');
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (providerFailure) {
      return failure(request, next, providerFailure, flow);
    }

    // A repeated confirmation can arrive without a new code while the browser
    // still has a valid session. Treat that as already confirmed, not as an error.
    if (!code) {
      if (flow === 'recovery') return failure(request, next, 'invalid', flow);
      const { data, error } = await supabase.auth.getUser();
      return !error && data.user
        ? NextResponse.redirect(new URL(next, request.nextUrl.origin))
        : failure(request, next, 'invalid', flow);
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return failure(
        request,
        next,
        classifyFailure(exchangeError.code, exchangeError.message),
        flow,
      );
    }

    // getUser verifies the newly issued access token with Supabase; a cookie
    // alone is not accepted as proof of a completed PKCE exchange.
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return failure(request, next, 'invalid', flow);

    const response = NextResponse.redirect(new URL(next, request.nextUrl.origin));
    if (flow === 'recovery') {
      response.cookies.set(
        RECOVERY_AUTHORIZED_COOKIE,
        randomBytes(32).toString('base64url'),
        recoveryCookieOptions(10 * 60),
      );
      response.cookies.set(RECOVERY_STATE_COOKIE, '', recoveryCookieOptions(0));
    }
    return response;
  } catch {
    return failure(request, next, 'provider', flow);
  }
}

function classifyFailure(
  code: string | undefined | null,
  description: string | undefined | null,
): ConfirmationFailure {
  const material = `${code ?? ''} ${description ?? ''}`.toLowerCase();
  if (/expired|expiry|otp_expired/.test(material)) return 'expired';
  if (/invalid|used|verifier|token|code/.test(material)) return 'invalid';
  return 'provider';
}

function failure(
  request: NextRequest,
  next: string,
  status: ConfirmationFailure,
  flow: AuthFlow,
) {
  const destination = new URL('/auth/confirm', request.nextUrl.origin);
  destination.searchParams.set('status', status);
  destination.searchParams.set('next', next);
  destination.searchParams.set('flow', flow);
  const response = NextResponse.redirect(destination);
  if (flow === 'recovery') {
    response.cookies.set(RECOVERY_STATE_COOKIE, '', recoveryCookieOptions(0));
    response.cookies.set(RECOVERY_AUTHORIZED_COOKIE, '', recoveryCookieOptions(0));
  }
  return response;
}
