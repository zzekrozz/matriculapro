import { NextResponse } from 'next/server';
import { ProfessionalFinancialMutationSchema } from '@/domain/professional/contracts';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireServerCapability } from '@/server/access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  let userId: string;
  try {
    userId = (await requireServerCapability('use_professional_tools')).userId;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Necesitas una licencia Profesional activa.' },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  const limited = await rateLimitedResponse(
    request,
    `professional:financials:write:${userId}`,
    { limit: 100, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const parsed = ProfessionalFinancialMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Revisa los importes y la operación.' },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const supabase = await createSupabaseServerClient();
  const [caseResult, clientResult] = await Promise.all([
    supabase
      .from('registration_cases')
      .select('id')
      .eq('id', parsed.data.case_id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    parsed.data.client_id
      ? supabase
        .from('professional_clients')
        .select('id')
        .eq('id', parsed.data.client_id)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle()
      : Promise.resolve({ data: { id: null }, error: null }),
  ]);
  if (caseResult.error || clientResult.error) {
    return NextResponse.json(
      { ok: false, message: 'No se ha podido verificar la operación.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }
  if (!caseResult.data || (parsed.data.client_id && !clientResult.data)) {
    return NextResponse.json(
      { ok: false, message: 'La operación o el cliente no pertenecen a tu cuenta activa.' },
      { status: 404, headers: noStoreHeaders() },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('professional_case_financials')
    .upsert(
      { user_id: userId, currency: 'EUR', ...parsed.data },
      { onConflict: 'case_id' },
    )
    .select('id, case_id, client_id, currency, purchase_cost, transport_cost, repair_cost, itv_cost, homologation_cost, taxes_cost, dgt_cost, plates_cost, other_cost, target_sale_price, actual_sale_price, total_cost, planned_margin, actual_margin, notes, created_at, updated_at')
    .single();
  if (error) {
    return NextResponse.json(
      { ok: false, message: 'No se han podido guardar los costes y márgenes.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  return NextResponse.json({ ok: true, data }, { headers: noStoreHeaders() });
}

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, private' };
}
