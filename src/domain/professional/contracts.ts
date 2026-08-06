import { z } from 'zod';

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const nullableEmail = z.union([z.string().trim().email().max(254), z.null()]);
const nullableHttpsUrl = z.union([
  z.string().trim().url().max(500).refine((value) => value.startsWith('https://'), {
    message: 'El logotipo debe utilizar HTTPS.',
  }),
  z.null(),
]);

export const ProfessionalOperationStatusSchema = z.enum([
  'draft',
  'assessing',
  'collecting-data',
  'review-required',
  'ready',
  'in-progress',
  'blocked',
  'completed',
  'registered',
  'archived',
]);

export type ProfessionalOperationStatus = z.infer<typeof ProfessionalOperationStatusSchema>;

export const PROFESSIONAL_OPERATION_STATUS_LABELS: Record<ProfessionalOperationStatus, string> = {
  draft: 'Borrador',
  assessing: 'En valoración',
  'collecting-data': 'Recopilando datos',
  'review-required': 'Revisión necesaria',
  ready: 'Preparada',
  'in-progress': 'En curso',
  blocked: 'Bloqueada',
  completed: 'Completada',
  registered: 'Matriculada',
  archived: 'Archivada',
};

export const ProfessionalProfileMutationSchema = z.object({
  business_display_name: nullableText(160),
  tax_identifier: nullableText(40),
  business_address: nullableText(500),
  contact_email: nullableEmail,
  contact_phone: nullableText(40),
  logo_url: nullableHttpsUrl,
  report_footer: nullableText(500),
}).strict();

export const ProfessionalClientFieldsSchema = z.object({
  reference: nullableText(80),
  display_name: z.string().trim().min(1).max(160),
  email: nullableEmail,
  phone: nullableText(40),
  tax_identifier: nullableText(40),
  address: nullableText(500),
  notes: nullableText(1_500),
  status: z.enum(['active', 'archived']),
}).strict();

export const ProfessionalClientCreateSchema = ProfessionalClientFieldsSchema;

export const ProfessionalClientUpdateSchema = ProfessionalClientFieldsSchema.extend({
  id: z.string().uuid(),
}).strict();

const money = z.number().finite().min(0).max(999_999_999_999.99);

export const ProfessionalFinancialMutationSchema = z.object({
  case_id: z.string().uuid(),
  client_id: z.string().uuid().nullable(),
  purchase_cost: money,
  transport_cost: money,
  repair_cost: money,
  itv_cost: money,
  homologation_cost: money,
  taxes_cost: money,
  dgt_cost: money,
  plates_cost: money,
  other_cost: money,
  target_sale_price: money.nullable(),
  actual_sale_price: money.nullable(),
  notes: nullableText(1_500),
}).strict();

export const ProfessionalOperationStatusMutationSchema = z.object({
  case_id: z.string().uuid(),
  status: ProfessionalOperationStatusSchema,
}).strict();

export const ProfessionalExportQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  status: ProfessionalOperationStatusSchema.optional(),
}).strict();

export type ProfessionalProfile = z.infer<typeof ProfessionalProfileMutationSchema>;
export type ProfessionalClientInput = z.infer<typeof ProfessionalClientFieldsSchema>;
export type ProfessionalFinancialInput = z.infer<typeof ProfessionalFinancialMutationSchema>;

export interface ProfessionalClient extends ProfessionalClientInput {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalFinancial extends ProfessionalFinancialInput {
  id: string;
  currency: string;
  total_cost: number;
  planned_margin: number | null;
  actual_margin: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalOperation {
  id: string;
  title: string | null;
  status: ProfessionalOperationStatus;
  updated_at: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_vin: string | null;
}

export interface ProfessionalWorkspaceData {
  profile: ProfessionalProfile;
  clients: ProfessionalClient[];
  financials: ProfessionalFinancial[];
  operations: ProfessionalOperation[];
}

export const EMPTY_PROFESSIONAL_PROFILE: ProfessionalProfile = {
  business_display_name: null,
  tax_identifier: null,
  business_address: null,
  contact_email: null,
  contact_phone: null,
  logo_url: null,
  report_footer: null,
};
