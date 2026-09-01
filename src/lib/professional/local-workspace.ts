'use client';

import {
  EMPTY_PROFESSIONAL_PROFILE,
  ProfessionalClientCreateSchema,
  ProfessionalClientUpdateSchema,
  ProfessionalFinancialMutationSchema,
  ProfessionalOperationStatusMutationSchema,
  ProfessionalProfileMutationSchema,
  type ProfessionalClient,
  type ProfessionalFinancial,
  type ProfessionalOperation,
  type ProfessionalOperationStatus,
  type ProfessionalProfile,
  type ProfessionalWorkspaceData,
} from '@/domain/professional/contracts';
import { PUBLIC_BETA_LOCAL_USER_ID } from '@/config/public-beta';
import { loadPersistedCases } from '@/lib/registration/case-repository';

const STORAGE_KEY = 'matriculapro.public-beta.professional.v1';

interface LocalProfessionalStore {
  profile: ProfessionalProfile;
  clients: ProfessionalClient[];
  financials: ProfessionalFinancial[];
  operationStatuses: Record<string, ProfessionalOperationStatus>;
}

export async function localProfessionalRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const store = readStore();
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (url === '/api/professional/workspace' && method === 'GET') {
    return buildWorkspace(store) as Promise<T>;
  }

  const body = parseBody(init?.body);
  if (url === '/api/professional/profile' && method === 'PUT') {
    store.profile = ProfessionalProfileMutationSchema.parse(body);
    writeStore(store);
    return store.profile as T;
  }

  if (url === '/api/professional/clients' && method === 'POST') {
    const input = ProfessionalClientCreateSchema.parse(body);
    const now = new Date().toISOString();
    const client: ProfessionalClient = { ...input, id: crypto.randomUUID(), created_at: now, updated_at: now };
    store.clients = [client, ...store.clients];
    writeStore(store);
    return client as T;
  }

  if (url === '/api/professional/clients' && method === 'PATCH') {
    const input = ProfessionalClientUpdateSchema.parse(body);
    const previous = store.clients.find((client) => client.id === input.id);
    if (!previous) throw new Error('El cliente no existe en este navegador.');
    const client: ProfessionalClient = { ...previous, ...input, updated_at: new Date().toISOString() };
    store.clients = [client, ...store.clients.filter((item) => item.id !== input.id)];
    writeStore(store);
    return client as T;
  }

  if (url === '/api/professional/financials' && method === 'PUT') {
    const input = ProfessionalFinancialMutationSchema.parse(body);
    const previous = store.financials.find((row) => row.case_id === input.case_id);
    const now = new Date().toISOString();
    const totalCost = [
      input.purchase_cost,
      input.transport_cost,
      input.repair_cost,
      input.itv_cost,
      input.homologation_cost,
      input.taxes_cost,
      input.dgt_cost,
      input.plates_cost,
      input.other_cost,
    ].reduce((sum, value) => sum + value, 0);
    const financial: ProfessionalFinancial = {
      ...input,
      id: previous?.id ?? crypto.randomUUID(),
      currency: 'EUR',
      total_cost: totalCost,
      planned_margin: input.target_sale_price === null ? null : input.target_sale_price - totalCost,
      actual_margin: input.actual_sale_price === null ? null : input.actual_sale_price - totalCost,
      created_at: previous?.created_at ?? now,
      updated_at: now,
    };
    store.financials = [financial, ...store.financials.filter((row) => row.case_id !== input.case_id)];
    writeStore(store);
    return financial as T;
  }

  if (url === '/api/professional/operations' && method === 'PATCH') {
    const input = ProfessionalOperationStatusMutationSchema.parse(body);
    store.operationStatuses[input.case_id] = input.status;
    writeStore(store);
    return { case_id: input.case_id, status: input.status } as T;
  }

  throw new Error('Esta operación no está disponible en la beta local.');
}

export function isLocalPublicBeta(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.publicBeta === 'true';
}

async function buildWorkspace(store: LocalProfessionalStore): Promise<ProfessionalWorkspaceData> {
  const cases = await loadPersistedCases(PUBLIC_BETA_LOCAL_USER_ID, true);
  const operations: ProfessionalOperation[] = cases.map((registrationCase) => ({
    id: registrationCase.id,
    title: registrationCase.title,
    status: store.operationStatuses[registrationCase.id] ?? registrationCase.status,
    updated_at: registrationCase.updatedAt,
    vehicle_make: registrationCase.vehicle.brand || null,
    vehicle_model: registrationCase.vehicle.model || null,
    vehicle_vin: registrationCase.vehicle.vin || null,
  }));
  const operationIds = new Set(operations.map((operation) => operation.id));
  return {
    profile: store.profile,
    clients: store.clients,
    financials: store.financials.filter((row) => operationIds.has(row.case_id)),
    operations,
  };
}

function readStore(): LocalProfessionalStore {
  const empty: LocalProfessionalStore = {
    profile: EMPTY_PROFESSIONAL_PROFILE,
    clients: [],
    financials: [],
    operationStatuses: {},
  };
  if (typeof window === 'undefined') return empty;
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<LocalProfessionalStore> | null;
    if (!value || typeof value !== 'object') return empty;
    return {
      profile: ProfessionalProfileMutationSchema.safeParse(value.profile).data ?? empty.profile,
      clients: Array.isArray(value.clients) ? value.clients : [],
      financials: Array.isArray(value.financials) ? value.financials : [],
      operationStatuses: value.operationStatuses && typeof value.operationStatuses === 'object'
        ? value.operationStatuses
        : {},
    };
  } catch {
    return empty;
  }
}

function writeStore(store: LocalProfessionalStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') throw new Error('La operación local no contiene datos válidos.');
  return JSON.parse(body) as unknown;
}
