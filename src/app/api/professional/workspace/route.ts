import { NextResponse } from 'next/server';
import {
  EMPTY_PROFESSIONAL_PROFILE,
  ProfessionalOperationStatusSchema,
  ProfessionalProfileMutationSchema,
  type ProfessionalOperation,
} from '@/domain/professional/contracts';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthenticationRequiredError, getCurrentServerAccess } from '@/server/access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let userId: string;
  let publicBeta = false;
  try {
    const access = await getCurrentServerAccess();
    if (!access.publicBeta && (access.tier !== 'professional' || !['full', 'read_only'].includes(access.mode))) {
      throw new Error('Professional history unavailable');
    }
    userId = access.userId;
    publicBeta = access.publicBeta;
  } catch (error) {
    return accessError(error);
  }

  const limited = await rateLimitedResponse(
    request,
    `professional:workspace:read:${userId}`,
    { limit: 120, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const supabase = publicBeta ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const [profileResult, clientsResult, financialsResult, operationsResult] = await Promise.all([
    supabase
      .from('professional_profiles')
      .select('business_display_name, tax_identifier, business_address, contact_email, contact_phone, logo_url, report_footer')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('professional_clients')
      .select('id, reference, display_name, email, phone, tax_identifier, address, notes, status, created_at, updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('professional_case_financials')
      .select('id, case_id, client_id, currency, purchase_cost, transport_cost, repair_cost, itv_cost, homologation_cost, taxes_cost, dgt_cost, plates_cost, other_cost, target_sale_price, actual_sale_price, total_cost, planned_margin, actual_margin, notes, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('registration_cases')
      .select('id, title, status, updated_at, vehicles(make, model, vin)')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
  ]);

  const firstError = profileResult.error
    ?? clientsResult.error
    ?? financialsResult.error
    ?? operationsResult.error;
  if (firstError) {
    return NextResponse.json(
      { ok: false, message: 'No se han podido cargar los datos profesionales.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const parsedProfile = ProfessionalProfileMutationSchema.safeParse(profileResult.data);
  const profile = profileResult.data === null
    ? EMPTY_PROFESSIONAL_PROFILE
    : parsedProfile.success ? parsedProfile.data : EMPTY_PROFESSIONAL_PROFILE;
  const operations = (operationsResult.data ?? []).flatMap((row): ProfessionalOperation[] => {
    const parsedStatus = ProfessionalOperationStatusSchema.safeParse(row.status);
    if (!parsedStatus.success) return [];
    const rawVehicle = row.vehicles as unknown;
    const vehicle = Array.isArray(rawVehicle) ? rawVehicle[0] : rawVehicle;
    const vehicleRow = vehicle && typeof vehicle === 'object'
      ? vehicle as Record<string, unknown>
      : null;
    return [{
      id: row.id,
      title: row.title,
      status: parsedStatus.data,
      updated_at: row.updated_at,
      vehicle_make: typeof vehicleRow?.make === 'string' ? vehicleRow.make : null,
      vehicle_model: typeof vehicleRow?.model === 'string' ? vehicleRow.model : null,
      vehicle_vin: typeof vehicleRow?.vin === 'string' ? vehicleRow.vin : null,
    }];
  });

  return NextResponse.json(
    {
      ok: true,
      data: {
        profile,
        clients: clientsResult.data ?? [],
        financials: financialsResult.data ?? [],
        operations,
      },
    },
    { headers: noStoreHeaders() },
  );
}

function accessError(error: unknown) {
  const unauthenticated = error instanceof AuthenticationRequiredError;
  return NextResponse.json(
    {
      ok: false,
      message: unauthenticated
        ? 'Debes iniciar sesión.'
        : 'Necesitas una licencia Profesional activa.',
    },
    { status: unauthenticated ? 401 : 403, headers: noStoreHeaders() },
  );
}

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, private' };
}
