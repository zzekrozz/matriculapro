import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isPublicBetaEnabled } from '@/config/public-beta';
import { getCurrentServerAccess } from '@/server/access';
import { CheckoutRequestError, createCheckoutForCurrentUser } from '@/server/payments';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  tier: z.enum(['particular', 'professional']),
  duration: z.enum(['one_month', 'six_months', 'twelve_months']),
  countryCode: z.literal('ES'),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
  purchaseKind: z.enum(['new', 'upgrade', 'renewal']),
  sourceLicenseId: z.string().uuid().nullable().optional(),
  renewalOfLicenseId: z.string().uuid().nullable().optional(),
  acceptedContractTerms: z.literal(true),
  acceptedImmediatePerformance: z.literal(true),
  acknowledgedWithdrawalRules: z.literal(true),
});

export async function POST(request: Request) {
  if (isPublicBetaEnabled()) {
    return NextResponse.json(
      { ok: false, message: 'No necesitas realizar un pago mientras MatriculaPro está en beta.' },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Revisa el plan y las aceptaciones requeridas.' }, { status: 400 });
  let userId: string;
  try { userId = (await getCurrentServerAccess()).userId; }
  catch { return NextResponse.json({ ok: false, message: 'Debes iniciar sesión y confirmar el email.' }, { status: 401 }); }
  const limited = await rateLimitedResponse(request, `payments:checkout:${userId}`, { limit: 10, windowSeconds: 3_600 });
  if (limited) return limited;
  try {
    const result = await createCheckoutForCurrentUser(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof CheckoutRequestError
      ? 'No se ha podido preparar ese pago. Revisa el plan, la licencia y el plazo de ampliación.'
      : 'Stripe de prueba no está configurado o el pago no está disponible.';
    return NextResponse.json({ ok: false, message }, { status: error instanceof CheckoutRequestError ? 409 : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
