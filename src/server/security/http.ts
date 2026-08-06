import { NextResponse } from 'next/server';
import { enforceRateLimit, rateLimitIdentity } from './rate-limit';

export async function rateLimitedResponse(
  request: Request,
  subject: string,
  options: { limit: number; windowSeconds: number },
): Promise<NextResponse | null> {
  try {
    const result = await enforceRateLimit({
      key: rateLimitIdentity(request, subject),
      ...options,
    });
    if (result.allowed) return null;
    return NextResponse.json(
      { ok: false, code: 'rate_limited', message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfterSeconds),
          'X-RateLimit-Remaining': String(result.remaining),
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, code: 'rate_limit_unavailable', message: 'El control de seguridad no está disponible.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

