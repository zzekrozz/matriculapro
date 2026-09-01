import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  buildRegistrationDecision,
  createEmptyRegistrationCase,
  RegistrationCaseSchema,
  type DocumentStatus,
  type DocumentType,
  type RegistrationCase,
  type TaxCalculation,
} from '@/domain/registration';
import type { Model576Calculation } from '@/domain/registration/fiscal/types';
import type { Model576ApiRequest } from '@/lib/fiscal/calculation-api';

type UnknownRow = Record<string, unknown>;

export interface CaseDocumentRecord {
  id?: string;
  caseId: string;
  type: DocumentType;
  status: DocumentStatus;
  fileName: string | null;
  storagePath: string | null;
  issuer: string | null;
  documentNumber: string | null;
  documentDate: string | null;
  notes: string;
  incident: string;
  manuallyVerified: boolean;
}

export interface StoredTaxCalculation extends TaxCalculation {
  id: string;
  caseId: string;
  fiscalInput: Model576ApiRequest | null;
  fiscalCalculation: Model576Calculation | null;
  reviewedByUser: boolean;
  confirmedAt: string | null;
}

export interface FiscalCalculationSnapshot {
  input: Model576ApiRequest;
  calculation: Model576Calculation;
}

export interface CaseChecklistRecord {
  id?: string;
  caseId: string;
  checklistKey: string;
  itemKey: string;
  label: string;
  description: string;
  status: 'pending' | 'confirmed' | 'issue' | 'not-applicable';
  isCritical: boolean;
  confirmationNote: string;
  confirmedAt: string | null;
  responsible: string;
  requiresPhoto: boolean;
  photoConfirmed: boolean;
  linkedDocumentType: DocumentType | null;
  sortOrder: number;
}

export async function loadPersistedCases(userId: string, publicBeta = false): Promise<RegistrationCase[]> {
  if (publicBeta) {
    const data = await loadPublicBetaRows('cases');
    return data.map((row) => mapCaseRow(row, userId));
  }
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('registration_cases')
    .select('*, vehicles(*)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as UnknownRow[]).map((row) => mapCaseRow(row, userId));
}

export async function savePersistedCase(
  registrationCase: RegistrationCase,
  userId: string,
  publicBeta = false,
): Promise<void> {
  const normalized: RegistrationCase = {
    ...registrationCase,
    userId,
    mode: 'case',
    updatedAt: new Date().toISOString(),
  };
  const decision = buildRegistrationDecision(normalized);
  const caseRow = {
    id: normalized.id,
    user_id: userId,
    title: normalized.title,
    status: mapCaseStatusToDb(normalized.status),
    process_kind: decision.processKind,
    operation_kind: mapOperationToDb(normalized.operation),
    process_stage: normalized.processStage,
    buyer_type: normalized.buyerType,
    origin_zone: mapOriginToDb(decision.originZone.outcome),
    autonomous_community: normalized.autonomousCommunity,
    municipality: normalized.municipality,
    transaction_amount: normalized.purchasePrice,
    transaction_currency: normalized.purchaseCurrency,
    transaction_date: normalized.purchaseDate,
    is_active: normalized.status !== 'archived',
    special_circumstances: { items: normalized.specialCircumstances },
    decision_snapshot: decision,
    decision_version: '2026.1',
    updated_at: normalized.updatedAt,
    metadata: { domain_case: normalized },
  };
  const vehicle = normalized.vehicle;
  const vehicleRow = {
    case_id: normalized.id,
    user_id: userId,
    make: vehicle.brand,
    model: vehicle.model,
    vin: vehicle.vin || null,
    first_registration_date: vehicle.firstRegistrationDate,
    mileage_km: vehicle.mileageKm,
    category: vehicle.category,
    fuel_type: vehicle.fuel,
    co2_g_km: vehicle.co2GKm,
    engine_displacement_cc: vehicle.engineCc,
    power_kw: vehicle.powerKw,
    gross_mass_kg: vehicle.massKg,
    seats: vehicle.seats,
    registration_country_code: countryCodeOrNull(vehicle.registrationCountry),
    manufacturing_country_code: countryCodeOrNull(vehicle.manufacturingCountry),
    foreign_registration_number: vehicle.foreignRegistration,
    export_deregistered: vehicle.exportDeregistered,
    transport_method: vehicle.transportMethod,
    field_k: vehicle.fieldK,
    type_approval_number: vehicle.approvalNumber,
    approval_type: mapApprovalToDb(vehicle.approvalType),
    coc_available: vehicle.cocAvailable,
    foreign_technical_document_available: vehicle.foreignTechnicalDocumentAvailable,
    individual_approval_declared: vehicle.approvalType.includes('individual'),
    possible_modifications: vehicle.reforms,
    updated_at: normalized.updatedAt,
    metadata: { domain_vehicle: vehicle },
  };
  if (publicBeta) {
    await mutatePublicBetaRows('save-case', caseRow, vehicleRow);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { error: caseError } = await supabase.from('registration_cases').upsert(caseRow, { onConflict: 'id' });
  if (caseError) throw new Error(caseError.message);
  const { error: vehicleError } = await supabase.from('vehicles').upsert(vehicleRow, { onConflict: 'case_id' });
  if (vehicleError) throw new Error(vehicleError.message);
}

export async function loadPersistedDocuments(
  userId: string,
  caseIds: string[],
  publicBeta = false,
): Promise<CaseDocumentRecord[]> {
  if (caseIds.length === 0) return [];
  if (publicBeta) return (await loadPublicBetaRows('documents', caseIds)).map(mapDocumentRow);
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('case_documents')
    .select('*')
    .eq('user_id', userId)
    .in('case_id', caseIds)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as UnknownRow[]).map(mapDocumentRow);
}

export async function loadPersistedTaxCalculations(
  userId: string,
  caseIds: string[],
  publicBeta = false,
): Promise<StoredTaxCalculation[]> {
  if (caseIds.length === 0) return [];
  if (publicBeta) return (await loadPublicBetaRows('tax-calculations', caseIds)).map(mapTaxCalculationRow);
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('case_tax_calculations')
    .select('*')
    .eq('user_id', userId)
    .in('case_id', caseIds)
    .eq('tax_kind', 'registration-tax')
    .is('deleted_at', null)
    .order('calculated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as UnknownRow[]).map(mapTaxCalculationRow);
}

export async function loadPersistedChecklistItems(
  userId: string,
  caseIds: string[],
  publicBeta = false,
): Promise<CaseChecklistRecord[]> {
  if (caseIds.length === 0) return [];
  if (publicBeta) return (await loadPublicBetaRows('checklist-items', caseIds)).map(mapChecklistRow);
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('case_checklist_items')
    .select('*')
    .eq('user_id', userId)
    .in('case_id', caseIds)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as UnknownRow[]).map(mapChecklistRow);
}

export async function savePersistedChecklistItem(
  item: CaseChecklistRecord,
  userId: string,
  publicBeta = false,
): Promise<CaseChecklistRecord> {
  const row = {
    case_id: item.caseId,
    user_id: userId,
    checklist_key: item.checklistKey,
    item_key: item.itemKey,
    label: item.label,
    description: item.description || null,
    status: item.status,
    is_critical: item.isCritical,
    confirmation_note: item.confirmationNote || null,
    confirmed_at: item.status === 'confirmed' ? item.confirmedAt ?? new Date().toISOString() : null,
    requires_photo: item.requiresPhoto,
    sort_order: item.sortOrder,
    rule_version: '2026.1',
    source_keys: [],
    metadata: {
      responsible: item.responsible,
      photo_confirmed: item.photoConfirmed,
      linked_document_type: item.linkedDocumentType,
    },
  };
  if (publicBeta) {
    return mapChecklistRow(await mutatePublicBetaRows('save-checklist-item', row));
  }
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('case_checklist_items')
    .upsert(row, { onConflict: 'case_id,checklist_key,item_key' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapChecklistRow(data as unknown as UnknownRow);
}

export async function savePersistedTaxCalculation(
  calculation: TaxCalculation,
  userId: string,
  fiscalSnapshot?: FiscalCalculationSnapshot,
  publicBeta = false,
): Promise<StoredTaxCalculation> {
  if (!calculation.caseId) throw new Error('Falta el identificador del expediente.');
  const decisionRoute = calculation.estimatedQuota === null ? 'special-review' : 'model-576';
  const reviewedByUser = fiscalSnapshot?.input.confirmation.reviewedByUser ?? false;
  const fiscalStatus = fiscalSnapshot?.calculation.status;
  const row = {
    ...(calculation.id ? { id: calculation.id } : {}),
    case_id: calculation.caseId,
    user_id: userId,
    tax_kind: 'registration-tax',
    route: decisionRoute,
    status: reviewedByUser && calculation.estimatedQuota !== null
      ? 'confirmed'
      : calculation.estimatedQuota === null || fiscalStatus === 'blocked' || fiscalStatus === 'special-review'
        ? 'review-required'
        : 'estimated',
    autonomous_community: calculation.autonomousCommunity,
    tax_date: calculation.calculatedAt.slice(0, 10),
    market_value: calculation.marketValue,
    taxable_base: calculation.taxableBase,
    tax_rate: calculation.rate,
    estimated_amount: calculation.estimatedQuota,
    currency: 'EUR',
    input_snapshot: {
      co2_g_km: calculation.co2GKm,
      category: calculation.category,
      epigraph: calculation.epigraph,
      fiscal_input: fiscalSnapshot?.input ?? null,
    },
    result_snapshot: {
      domain_calculation: calculation,
      fiscal_calculation: fiscalSnapshot?.calculation ?? null,
    },
    rule_version: fiscalSnapshot ? 'fiscal-2026.1' : '2026.1',
    source_keys: calculation.sourceIds,
    calculated_at: calculation.calculatedAt,
    metadata: {
      educational_estimate: true,
      fiscal_status: fiscalStatus ?? null,
      valuation_method: fiscalSnapshot?.calculation.valuationMethod ?? null,
      catalog_version: fiscalSnapshot?.calculation.catalogVersion ?? null,
      reviewed_by_user: reviewedByUser,
      confirmed_at: fiscalSnapshot?.input.confirmation.confirmedAt ?? null,
    },
  };
  if (publicBeta) {
    return mapTaxCalculationRow(await mutatePublicBetaRows('save-tax-calculation', row));
  }
  const supabase = createSupabaseBrowserClient();
  const query = calculation.id
    ? supabase.from('case_tax_calculations').update(row).eq('id', calculation.id).eq('user_id', userId)
    : supabase.from('case_tax_calculations').insert(row);
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(error.message);
  return mapTaxCalculationRow(data as unknown as UnknownRow);
}

export async function savePersistedDocument(
  document: CaseDocumentRecord,
  userId: string,
  publicBeta = false,
): Promise<CaseDocumentRecord> {
  const row = {
    ...(document.id ? { id: document.id } : {}),
    case_id: document.caseId,
    user_id: userId,
    requirement_key: document.type,
    document_type: document.type,
    status: mapDocumentStatusToDb(document.status),
    storage_bucket: null,
    storage_path: null,
    original_file_name: null,
    issuer: document.issuer,
    document_number: document.documentNumber,
    document_date: document.documentDate,
    notes: document.notes,
    incident_summary: document.incident,
    manually_verified: document.manuallyVerified,
    verified_at: document.manuallyVerified ? new Date().toISOString() : null,
    metadata: {},
  };

  if (publicBeta) {
    return mapDocumentRow(await mutatePublicBetaRows('save-document', row));
  }

  const supabase = createSupabaseBrowserClient();

  if (document.id) {
    const { data, error } = await supabase
      .from('case_documents')
      .update(row)
      .eq('id', document.id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapDocumentRow(data as unknown as UnknownRow);
  }

  const { data, error } = await supabase
    .from('case_documents')
    .insert(row)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapDocumentRow(data as unknown as UnknownRow);
}

type PublicBetaResource = 'cases' | 'documents' | 'tax-calculations' | 'checklist-items';
type PublicBetaMutation = 'save-case' | 'save-document' | 'save-tax-calculation' | 'save-checklist-item';

async function loadPublicBetaRows(resource: PublicBetaResource, caseIds: string[] = []): Promise<UnknownRow[]> {
  const params = new URLSearchParams({ resource });
  if (caseIds.length > 0) params.set('caseIds', caseIds.join(','));
  const response = await fetch(`/api/public-beta/cases?${params.toString()}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const payload = await readPublicBetaPayload(response);
  if (!Array.isArray(payload.data)) throw new Error('La respuesta de persistencia no es válida.');
  return payload.data.filter((value): value is UnknownRow => asRecord(value) !== null);
}

async function mutatePublicBetaRows(
  action: PublicBetaMutation,
  row: UnknownRow,
  relatedRow?: UnknownRow,
): Promise<UnknownRow> {
  const response = await fetch('/api/public-beta/cases', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, row, ...(relatedRow ? { relatedRow } : {}) }),
  });
  const payload = await readPublicBetaPayload(response);
  if (action === 'save-case') return {};
  const data = asRecord(payload.data);
  if (!data) throw new Error('La respuesta de persistencia no es válida.');
  return data;
}

async function readPublicBetaPayload(response: Response): Promise<UnknownRow> {
  const payload = asRecord(await response.json().catch(() => null));
  if (!response.ok || !payload?.ok) {
    throw new Error(asString(payload?.message) ?? 'No se han podido guardar los datos.');
  }
  return payload;
}

function mapCaseRow(row: UnknownRow, userId: string): RegistrationCase {
  const metadata = asRecord(row.metadata);
  const snapshot = metadata?.domain_case;
  const parsed = RegistrationCaseSchema.safeParse(snapshot);
  if (parsed.success) return parsed.data as RegistrationCase;

  const createdAt = asString(row.created_at) ?? new Date().toISOString();
  const fallback = createEmptyRegistrationCase({
    id: asString(row.id) ?? crypto.randomUUID(),
    userId,
    mode: 'case',
    now: createdAt,
  });
  const vehicles = Array.isArray(row.vehicles) ? row.vehicles : [];
  const vehicleRow = asRecord(vehicles[0]);
  return {
    ...fallback,
    title: asString(row.title) ?? fallback.title,
    status: mapCaseStatusFromDb(asString(row.status)),
    processStage: (asString(row.process_stage) as RegistrationCase['processStage']) ?? fallback.processStage,
    buyerType: (asString(row.buyer_type) as RegistrationCase['buyerType']) ?? fallback.buyerType,
    autonomousCommunity: (asString(row.autonomous_community) as RegistrationCase['autonomousCommunity']) ?? null,
    municipality: asString(row.municipality),
    purchasePrice: asNumber(row.transaction_amount),
    purchaseCurrency: asString(row.transaction_currency) ?? 'EUR',
    purchaseDate: asString(row.transaction_date),
    createdAt,
    updatedAt: asString(row.updated_at) ?? createdAt,
    deletedAt: asString(row.deleted_at),
    vehicle: vehicleRow ? {
      ...fallback.vehicle,
      brand: asString(vehicleRow.make) ?? '',
      model: asString(vehicleRow.model) ?? '',
      vin: asString(vehicleRow.vin) ?? '',
      firstRegistrationDate: asString(vehicleRow.first_registration_date),
      mileageKm: asNumber(vehicleRow.mileage_km),
      category: (asString(vehicleRow.category) as RegistrationCase['vehicle']['category']) ?? 'UNKNOWN',
      registrationCountry: asString(vehicleRow.registration_country_code) ?? '',
      fieldK: asString(vehicleRow.field_k),
      cocAvailable: asBooleanOrNull(vehicleRow.coc_available),
      foreignTechnicalDocumentAvailable: asBooleanOrNull(vehicleRow.foreign_technical_document_available),
    } : fallback.vehicle,
  };
}

function mapDocumentRow(row: UnknownRow): CaseDocumentRecord {
  return {
    id: asString(row.id) ?? undefined,
    caseId: asString(row.case_id) ?? '',
    type: (asString(row.document_type) ?? 'identity') as DocumentType,
    status: mapDocumentStatusFromDb(asString(row.status)),
    fileName: asString(row.original_file_name),
    storagePath: asString(row.storage_path),
    issuer: asString(row.issuer),
    documentNumber: asString(row.document_number),
    documentDate: asString(row.document_date),
    notes: asString(row.notes) ?? '',
    incident: asString(row.incident_summary) ?? '',
    manuallyVerified: Boolean(row.manually_verified),
  };
}

function mapTaxCalculationRow(row: UnknownRow): StoredTaxCalculation {
  const resultSnapshot = asRecord(row.result_snapshot);
  const inputSnapshot = asRecord(row.input_snapshot);
  const domainCalculation = asRecord(resultSnapshot?.domain_calculation);
  const fiscalInput = asRecord(inputSnapshot?.fiscal_input);
  const fiscalCalculation = asRecord(resultSnapshot?.fiscal_calculation);
  const metadata = asRecord(row.metadata);
  return {
    id: asString(row.id) ?? crypto.randomUUID(),
    caseId: asString(row.case_id) ?? '',
    taxableBase: asNumber(domainCalculation?.taxableBase) ?? asNumber(row.taxable_base),
    marketValue: asNumber(domainCalculation?.marketValue) ?? asNumber(row.market_value),
    co2GKm: asNumber(domainCalculation?.co2GKm) ?? asNumber(inputSnapshot?.co2_g_km),
    category: (asString(domainCalculation?.category) ?? asString(inputSnapshot?.category) ?? 'UNKNOWN') as TaxCalculation['category'],
    autonomousCommunity: (asString(domainCalculation?.autonomousCommunity) ?? asString(row.autonomous_community)) as TaxCalculation['autonomousCommunity'],
    epigraph: (asNumber(domainCalculation?.epigraph) ?? asNumber(inputSnapshot?.epigraph)) as TaxCalculation['epigraph'],
    rate: asNumber(domainCalculation?.rate) ?? asNumber(row.tax_rate),
    estimatedQuota: asNumber(domainCalculation?.estimatedQuota) ?? asNumber(row.estimated_amount),
    calculatedAt: asString(domainCalculation?.calculatedAt) ?? asString(row.calculated_at) ?? new Date().toISOString(),
    sourceIds: Array.isArray(domainCalculation?.sourceIds)
      ? domainCalculation.sourceIds.filter((value): value is string => typeof value === 'string')
      : Array.isArray(row.source_keys) ? row.source_keys.filter((value): value is string => typeof value === 'string') : [],
    fiscalInput: fiscalInput ? fiscalInput as unknown as Model576ApiRequest : null,
    fiscalCalculation: fiscalCalculation ? fiscalCalculation as unknown as Model576Calculation : null,
    reviewedByUser: Boolean(metadata?.reviewed_by_user),
    confirmedAt: asString(metadata?.confirmed_at),
  };
}

function mapChecklistRow(row: UnknownRow): CaseChecklistRecord {
  const metadata = asRecord(row.metadata);
  return {
    id: asString(row.id) ?? undefined,
    caseId: asString(row.case_id) ?? '',
    checklistKey: asString(row.checklist_key) ?? '',
    itemKey: asString(row.item_key) ?? '',
    label: asString(row.label) ?? '',
    description: asString(row.description) ?? '',
    status: (asString(row.status) ?? 'pending') as CaseChecklistRecord['status'],
    isCritical: Boolean(row.is_critical),
    confirmationNote: asString(row.confirmation_note) ?? '',
    confirmedAt: asString(row.confirmed_at),
    responsible: asString(metadata?.responsible) ?? '',
    requiresPhoto: Boolean(row.requires_photo),
    photoConfirmed: Boolean(metadata?.photo_confirmed),
    linkedDocumentType: (asString(metadata?.linked_document_type) as DocumentType | null) ?? null,
    sortOrder: asNumber(row.sort_order) ?? 0,
  };
}

function mapCaseStatusToDb(status: RegistrationCase['status']): string {
  return ({
    draft: 'draft', assessing: 'collecting-data', blocked: 'blocked', 'in-progress': 'in-progress',
    ready: 'ready', registered: 'completed', archived: 'archived',
  })[status];
}

function mapCaseStatusFromDb(status: string | null): RegistrationCase['status'] {
  const map: Record<string, RegistrationCase['status']> = {
    draft: 'draft', 'collecting-data': 'assessing', 'review-required': 'blocked', ready: 'ready',
    'in-progress': 'in-progress', blocked: 'blocked', completed: 'registered', archived: 'archived',
  };
  return status ? map[status] ?? 'draft' : 'draft';
}

function mapOperationToDb(operation: RegistrationCase['operation']): string {
  return operation === 'purchase' ? 'buying' : operation;
}

function mapOriginToDb(origin: ReturnType<typeof buildRegistrationDecision>['originZone']['outcome']): string {
  const map = { spain: 'spain', eu: 'eu', eea: 'eea', 'uk-post-brexit': 'united-kingdom', 'third-country': 'third-country', unknown: 'unknown' } as const;
  return map[origin];
}

function mapApprovalToDb(approval: RegistrationCase['vehicle']['approvalType']): string {
  const map: Record<RegistrationCase['vehicle']['approvalType'], string> = {
    'eu-type': 'eu-type', 'spanish-type': 'national-type', 'individual-eea': 'individual-eea',
    'individual-eu': 'individual-other', 'individual-spain': 'individual-other',
    'short-series-eea': 'small-series', none: 'unknown', unknown: 'unknown',
  };
  return map[approval];
}

function mapDocumentStatusToDb(status: DocumentStatus): string {
  return ({
    'not-requested': 'not-requested', pending: 'pending', received: 'received',
    'in-review': 'under-review', verified: 'verified', issue: 'issue', replaced: 'superseded',
    'not-applicable': 'not-applicable',
  })[status];
}

function mapDocumentStatusFromDb(status: string | null): DocumentStatus {
  const map: Record<string, DocumentStatus> = {
    'not-requested': 'not-requested', pending: 'pending', received: 'received',
    'under-review': 'in-review', verified: 'verified', issue: 'issue', superseded: 'replaced',
    'not-applicable': 'not-applicable',
  };
  return status ? map[status] ?? 'pending' : 'pending';
}

function countryCodeOrNull(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function asRecord(value: unknown): UnknownRow | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRow : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asBooleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}
