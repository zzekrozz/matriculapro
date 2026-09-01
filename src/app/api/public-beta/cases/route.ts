import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isPublicBetaEnabled } from '@/config/public-beta';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AuthenticationRequiredError, getCurrentServerAccess } from '@/server/access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ResourceSchema = z.enum(['cases', 'documents', 'tax-calculations', 'checklist-items']);
const MutationSchema = z.object({
  action: z.enum(['save-case', 'save-document', 'save-tax-calculation', 'save-checklist-item']),
  row: z.record(z.unknown()),
  relatedRow: z.record(z.unknown()).optional(),
});
const MAX_MUTATION_BODY_CHARS = 250_000;

const CASE_FIELDS = [
  'id', 'title', 'status', 'process_kind', 'operation_kind', 'process_stage', 'buyer_type',
  'origin_zone', 'autonomous_community', 'municipality', 'transaction_amount',
  'transaction_currency', 'transaction_date', 'is_active', 'special_circumstances',
  'decision_snapshot', 'decision_version', 'updated_at', 'metadata',
] as const;
const VEHICLE_FIELDS = [
  'case_id', 'make', 'model', 'vin', 'first_registration_date', 'mileage_km', 'category',
  'fuel_type', 'co2_g_km', 'engine_displacement_cc', 'power_kw', 'gross_mass_kg', 'seats',
  'registration_country_code', 'manufacturing_country_code', 'foreign_registration_number',
  'export_deregistered', 'transport_method', 'field_k', 'type_approval_number', 'approval_type',
  'coc_available', 'foreign_technical_document_available', 'individual_approval_declared',
  'possible_modifications', 'updated_at', 'metadata',
] as const;
const DOCUMENT_FIELDS = [
  'case_id', 'requirement_key', 'document_type', 'status', 'storage_bucket', 'storage_path',
  'original_file_name', 'issuer', 'document_number', 'document_date', 'notes',
  'incident_summary', 'manually_verified', 'verified_at', 'metadata',
] as const;
const TAX_FIELDS = [
  'case_id', 'tax_kind', 'route', 'status', 'autonomous_community', 'tax_date', 'market_value',
  'taxable_base', 'tax_rate', 'estimated_amount', 'currency', 'input_snapshot', 'result_snapshot',
  'rule_version', 'source_keys', 'calculated_at', 'metadata',
] as const;
const CHECKLIST_FIELDS = [
  'case_id', 'checklist_key', 'item_key', 'label', 'description', 'status', 'is_critical',
  'confirmation_note', 'confirmed_at', 'requires_photo', 'sort_order', 'rule_version',
  'source_keys', 'metadata',
] as const;

export async function GET(request: Request) {
  const access = await betaAccess();
  if (access instanceof NextResponse) return access;
  const limited = await rateLimitedResponse(
    request,
    `public-beta:cases:read:${access.userId}`,
    { limit: 300, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const url = new URL(request.url);
  const parsedResource = ResourceSchema.safeParse(url.searchParams.get('resource'));
  if (!parsedResource.success) return invalidRequest();
  const caseIds = (url.searchParams.get('caseIds') ?? '')
    .split(',')
    .filter(Boolean);
  if (caseIds.length > 100 || caseIds.some((id) => !z.string().uuid().safeParse(id).success)) {
    return invalidRequest();
  }

  const admin = createSupabaseAdminClient();
  let result;
  if (parsedResource.data === 'cases') {
    result = await admin
      .from('registration_cases')
      .select('*, vehicles(*)')
      .eq('user_id', access.userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
  } else if (caseIds.length === 0) {
    return NextResponse.json({ ok: true, data: [] }, { headers: noStoreHeaders() });
  } else if (parsedResource.data === 'documents') {
    result = await admin.from('case_documents').select('*')
      .eq('user_id', access.userId).in('case_id', caseIds).is('deleted_at', null);
  } else if (parsedResource.data === 'tax-calculations') {
    result = await admin.from('case_tax_calculations').select('*')
      .eq('user_id', access.userId).in('case_id', caseIds)
      .eq('tax_kind', 'registration-tax').is('deleted_at', null)
      .order('calculated_at', { ascending: false });
  } else {
    result = await admin.from('case_checklist_items').select('*')
      .eq('user_id', access.userId).in('case_id', caseIds)
      .order('sort_order', { ascending: true });
  }
  if (result.error) return persistenceError();
  return NextResponse.json({ ok: true, data: result.data ?? [] }, { headers: noStoreHeaders() });
}

export async function POST(request: Request) {
  const access = await betaAccess();
  if (access instanceof NextResponse) return access;
  const limited = await rateLimitedResponse(
    request,
    `public-beta:cases:write:${access.userId}`,
    { limit: 300, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const rawBody = await request.text();
  if (rawBody.length > MAX_MUTATION_BODY_CHARS) {
    return NextResponse.json(
      { ok: false, message: 'La solicitud es demasiado grande.' },
      { status: 413, headers: noStoreHeaders() },
    );
  }
  const parsed = MutationSchema.safeParse(parseJson(rawBody));
  if (!parsed.success) return invalidRequest();
  const admin = createSupabaseAdminClient();
  const { action, row, relatedRow } = parsed.data;

  if (action === 'save-case') {
    const caseId = uuid(row.id);
    const vehicleCaseId = uuid(relatedRow?.case_id);
    if (!caseId || vehicleCaseId !== caseId || !relatedRow) return invalidRequest();
    const { data: existingCase, error: existingCaseError } = await admin
      .from('registration_cases')
      .select('user_id')
      .eq('id', caseId)
      .maybeSingle();
    if (existingCaseError) return persistenceError();
    if (existingCase && existingCase.user_id !== access.userId) return notFound();
    const caseResult = await admin.from('registration_cases').upsert({
      ...pick(row, CASE_FIELDS), id: caseId, user_id: access.userId,
    }, { onConflict: 'id' });
    if (caseResult.error) return persistenceError();
    const vehicleResult = await admin.from('vehicles').upsert({
      ...pick(relatedRow, VEHICLE_FIELDS), case_id: caseId, user_id: access.userId,
    }, { onConflict: 'case_id' });
    if (vehicleResult.error) return persistenceError();
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  }

  const caseId = uuid(row.case_id);
  if (!caseId || !(await ownsCase(caseId, access.userId))) return notFound();

  if (action === 'save-document') {
    const id = optionalUuid(row.id);
    if (row.id !== undefined && !id) return invalidRequest();
    let query;
    if (id) {
      query = admin.from('case_documents').update({
        ...pick(row, DOCUMENT_FIELDS), case_id: caseId, user_id: access.userId,
      }).eq('id', id).eq('user_id', access.userId).select('*').maybeSingle();
    } else {
      query = admin.from('case_documents').insert({
        ...pick(row, DOCUMENT_FIELDS), case_id: caseId, user_id: access.userId,
      }).select('*').single();
    }
    const result = await query;
    if (result.error) return persistenceError();
    if (!result.data) return notFound();
    return NextResponse.json({ ok: true, data: result.data }, { headers: noStoreHeaders() });
  }

  if (action === 'save-tax-calculation') {
    const id = optionalUuid(row.id);
    if (row.id !== undefined && !id) return invalidRequest();
    let query;
    if (id) {
      query = admin.from('case_tax_calculations').update({
        ...pick(row, TAX_FIELDS), case_id: caseId, user_id: access.userId,
      }).eq('id', id).eq('user_id', access.userId).select('*').maybeSingle();
    } else {
      query = admin.from('case_tax_calculations').insert({
        ...pick(row, TAX_FIELDS), case_id: caseId, user_id: access.userId,
      }).select('*').single();
    }
    const result = await query;
    if (result.error) return persistenceError();
    if (!result.data) return notFound();
    return NextResponse.json({ ok: true, data: result.data }, { headers: noStoreHeaders() });
  }

  const result = await admin.from('case_checklist_items').upsert({
    ...pick(row, CHECKLIST_FIELDS), case_id: caseId, user_id: access.userId,
  }, { onConflict: 'case_id,checklist_key,item_key' }).select('*').single();
  if (result.error) return persistenceError();
  return NextResponse.json({ ok: true, data: result.data }, { headers: noStoreHeaders() });
}

async function betaAccess() {
  if (!isPublicBetaEnabled()) {
    return NextResponse.json(
      { ok: false, message: 'La beta pública no está activa.' },
      { status: 404, headers: noStoreHeaders() },
    );
  }
  try {
    return await getCurrentServerAccess();
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof AuthenticationRequiredError ? 'Debes iniciar sesión.' : 'Acceso no disponible.' },
      { status: error instanceof AuthenticationRequiredError ? 401 : 403, headers: noStoreHeaders() },
    );
  }
}

async function ownsCase(caseId: string, userId: string): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient().from('registration_cases')
    .select('id').eq('id', caseId).eq('user_id', userId).is('deleted_at', null).maybeSingle();
  return !error && Boolean(data);
}

function pick<T extends readonly string[]>(row: Record<string, unknown>, fields: T) {
  return Object.fromEntries(fields.filter((field) => field in row).map((field) => [field, row[field]]));
}

function uuid(value: unknown): string | null {
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

function optionalUuid(value: unknown): string | null {
  return value === undefined ? null : uuid(value);
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function invalidRequest() {
  return NextResponse.json({ ok: false, message: 'Solicitud no válida.' }, { status: 400, headers: noStoreHeaders() });
}
function notFound() {
  return NextResponse.json({ ok: false, message: 'El expediente no pertenece a tu cuenta.' }, { status: 404, headers: noStoreHeaders() });
}
function persistenceError() {
  return NextResponse.json({ ok: false, message: 'No se han podido guardar los datos.' }, { status: 503, headers: noStoreHeaders() });
}
function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, private' };
}
