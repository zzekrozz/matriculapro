import { NextResponse } from 'next/server';
import {
  FREE_CHECK_RULESET_VERSION,
  FreeVehicleCheckInputSchema,
  runFreeVehicleCheck,
} from '@/domain/free-check';
import {
  AuthenticationRequiredError,
  requireServerCapability,
  saveAuthoritativeFreeVehicleCheck,
} from '@/server/access';
import { rateLimitedResponse } from '@/server/security/http';
import { PUBLIC_BETA_LOCAL_USER_ID } from '@/config/public-beta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let userId: string;
  try {
    const access = await requireServerCapability('use_free_checker');
    userId = access.userId;
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof AuthenticationRequiredError ? 'Debes iniciar sesión.' : 'No se ha podido comprobar el acceso.' },
      { status: error instanceof AuthenticationRequiredError ? 401 : 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const limited = await rateLimitedResponse(request, `free-check:${userId}`, { limit: 30, windowSeconds: 3_600 });
  if (limited) return limited;
  const requestBody = await request.json().catch(() => null);
  const parsed = FreeVehicleCheckInputSchema.safeParse(
    requestBody && typeof requestBody === 'object'
      ? { ...requestBody, checkedAt: new Date().toISOString() }
      : null,
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Revisa los datos de la comprobación.' }, { status: 400 });
  }
  try {
    const result = runFreeVehicleCheck(parsed.data);
    if (userId === PUBLIC_BETA_LOCAL_USER_ID) {
      return NextResponse.json(
        { ok: true, checkId: null, result },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const checkId = await saveAuthoritativeFreeVehicleCheck({
      userId,
      title: `Comprobación ${parsed.data.registrationCountry} · ${parsed.data.firstRegistrationDate}`,
      inputSnapshot: parsed.data,
      resultSnapshot: result as unknown as Record<string, unknown>,
      riskLevel: result.riskLevel,
      ruleVersion: FREE_CHECK_RULESET_VERSION,
      metadata: { source_count: result.sourceIds.length },
    });
    return NextResponse.json({ ok: true, checkId, result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, message: 'No se ha podido calcular y guardar la comprobación.' }, { status: 503 });
  }
}
