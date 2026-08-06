import { z } from 'zod';
import type {
  Model576CalculationInput,
  OfficialVehicleValue,
} from './types';

const decimalText = z.string().trim().regex(/^\d+(?:\.\d+)?$/, 'Introduce un decimal no negativo.');
export const FiscalDecimalSchema = z.union([z.number().finite().nonnegative(), decimalText]);
export const PositiveFiscalDecimalSchema = FiscalDecimalSchema.refine(
  (value) => Number(value) > 0,
  'El importe debe ser mayor que cero.',
);

const nullableNonnegative = z.number().finite().nonnegative().nullable();

export const OfficialVehicleValueSchema = z.object({
  id: z.string().trim().min(1),
  catalogYear: z.number().int().min(1993),
  sourceOrder: z.string().trim().min(1),
  sourceAnnex: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  version: z.string().trim().min(1).nullable(),
  commercialStartYear: z.number().int().min(1800).nullable(),
  commercialEndYear: z.number().int().min(1800).nullable(),
  fuelType: z.string().trim().min(1).nullable(),
  engineCapacityCc: nullableNonnegative,
  cylinders: z.number().int().positive().nullable(),
  powerKw: nullableNonnegative,
  fiscalPower: nullableNonnegative,
  co2Gkm: nullableNonnegative,
  newVehicleOfficialValue: z.number().finite().positive(),
  officialRowReference: z.string().trim().min(1),
  normalizedSearchText: z.string().trim().min(1),
  sourceChecksum: z.string().trim().min(1),
}).superRefine((row, context) => {
  if (
    row.commercialStartYear !== null
    && row.commercialEndYear !== null
    && row.commercialEndYear < row.commercialStartYear
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['commercialEndYear'],
      message: 'El fin del periodo comercial no puede ser anterior al inicio.',
    });
  }
});

export const VehicleCatalogIdentitySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  version: z.string().trim().min(1).nullable().optional(),
  fuelType: z.string().trim().min(1).nullable().optional(),
  engineCapacityCc: nullableNonnegative.optional(),
  powerKw: nullableNonnegative.optional(),
  co2Gkm: nullableNonnegative.optional(),
});

const officialVehicleMatchResultSchema = z.object({
  status: z.enum(['exact-confirmed', 'multiple-candidates', 'possible-match', 'not-found', 'outside-commercial-period']),
  selected: OfficialVehicleValueSchema.nullable(),
  candidates: z.array(OfficialVehicleValueSchema),
  discrepancies: z.array(z.object({
    field: z.string().min(1),
    caseValue: z.union([z.string(), z.number(), z.null()]),
    officialValue: z.union([z.string(), z.number(), z.null()]),
    blocking: z.boolean(),
  })),
  sourceIds: z.array(z.string().min(1)),
  explanation: z.string().min(1),
}).superRefine((match, context) => {
  if (match.status !== 'exact-confirmed') return;
  const candidate = match.candidates[0];
  const coherent = match.selected !== null
    && match.candidates.length === 1
    && candidate?.id === match.selected.id
    && candidate?.sourceChecksum === match.selected.sourceChecksum
    && candidate?.officialRowReference === match.selected.officialRowReference
    && candidate?.newVehicleOfficialValue === match.selected.newVehicleOfficialValue
    && !match.discrepancies.some((item) => item.blocking);
  if (!coherent) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Un match exact-confirmed exige una única candidata idéntica a la fila seleccionada y ninguna discrepancia bloqueante.',
    });
  }
});

const firstServiceSchema = z.object({
  date: z.string().date(),
  evidenceConfirmed: z.boolean(),
  sourceDescription: z.string().trim().min(1),
});

const valuationSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('new-vehicle-vat-base'),
    vatTaxableBase: PositiveFiscalDecimalSchema,
    currency: z.string().trim().toUpperCase().length(3),
    exchangeRateToEur: PositiveFiscalDecimalSchema.nullable().optional(),
    netPrice: FiscalDecimalSchema.nullable().optional(),
    discounts: FiscalDecimalSchema.nullable().optional(),
    taxableAccessoryCosts: FiscalDecimalSchema.nullable().optional(),
    indirectTaxAmount: FiscalDecimalSchema.nullable().optional(),
    acquisitionDate: z.string().date().nullable().optional(),
    territory: z.string().trim().min(1).nullable().optional(),
    sourceDescription: z.string().trim().min(1),
  }),
  z.object({
    method: z.literal('official-table'),
    match: officialVehicleMatchResultSchema,
    catalogVersion: z.string().trim().min(1),
    invoicePrice: FiscalDecimalSchema.nullable().optional(),
  }),
  z.object({
    method: z.literal('justified-market-value'),
    marketValue: PositiveFiscalDecimalSchema,
    valuationDate: z.string().date(),
    methodDescription: z.string().trim().min(1),
    sourceDescription: z.string().trim().min(1),
    reasonForNotUsingTable: z.string().trim().min(1),
    supportingDocument: z.string().trim().min(1).nullable().optional(),
    invoicePrice: FiscalDecimalSchema.nullable().optional(),
  }),
]);

const historicalTaxesSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('automatic'),
    territory: z.enum(['peninsula-balearics-common', 'canary-islands', 'ceuta-melilla', 'navarra', 'basque-country']),
    otherIndirectTaxesConfirmedNone: z.boolean(),
  }),
  z.object({
    mode: z.literal('user-provided'),
    historicalVatRate: FiscalDecimalSchema.refine((value) => Number(value) <= 1, 'El tipo debe expresarse en tanto por uno.'),
    historicalIedmtRate: FiscalDecimalSchema.refine((value) => Number(value) <= 1, 'El tipo debe expresarse en tanto por uno.'),
    otherIndirectTaxRates: z.array(FiscalDecimalSchema.refine((value) => Number(value) <= 1, 'El tipo debe expresarse en tanto por uno.')),
    sourceDescription: z.string().trim().min(1),
  }),
]);

const reductionsSchema = z.object({
  largeFamily: z.object({
    claimed: z.boolean(),
    priorRecognitionStatus: z.enum(['granted', 'pending', 'not-requested']),
    resolutionReference: z.string().trim().min(1).nullable().optional(),
    resolutionDate: z.string().date().nullable().optional(),
    evidenceReference: z.string().trim().min(1).nullable().optional(),
  }).optional(),
  motorhome: z.object({
    claimed: z.boolean(),
    eligibilityConfirmed: z.boolean(),
    evidenceReference: z.string().trim().min(1).nullable().optional(),
  }).optional(),
});

export const FiscalVehicleStatusInputSchema = z.object({
  firstRegistrationDate: z.string().date(),
  referenceDate: z.string().date(),
  mileageKm: z.number().finite().nonnegative(),
  firstService: firstServiceSchema.nullable().optional(),
});

export const Model576CalculationInputSchema = z.object({
  registrationTaxRoute: z.enum(['model-576', 'model-06', 'model-05', 'special-review']),
  registrationTaxSubjectConfirmed: z.boolean(),
  accrualDate: z.string().date(),
  referenceDate: z.string().date(),
  firstRegistrationDate: z.string().date(),
  firstService: firstServiceSchema.nullable().optional(),
  mileageKm: z.number().finite().nonnegative(),
  currentAutonomousCommunity: z.enum([
    'andalucia', 'aragon', 'asturias', 'baleares', 'canarias', 'cantabria',
    'castilla-la-mancha', 'castilla-y-leon', 'cataluna', 'comunidad-valenciana',
    'extremadura', 'galicia', 'madrid', 'murcia', 'navarra', 'pais-vasco',
    'la-rioja', 'ceuta', 'melilla',
  ]),
  vehicle: z.object({
    category: z.enum(['M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'L', 'O', 'SPECIAL', 'UNKNOWN']),
    co2GKm: nullableNonnegative,
    co2Verified: z.boolean(),
    singleNonCombustionEngine: z.boolean(),
    kind: z.enum(['standard', 'quad', 'motorcycle', 'motorhome', 'other']),
    motorcyclePowerKw: nullableNonnegative.optional(),
    motorcycleMassKg: nullableNonnegative.optional(),
  }),
  previouslyRegisteredAbroad: z.boolean(),
  professionalUseHistory: z.object({
    activity: z.enum(['taxi', 'rental', 'driving-school']),
    startDate: z.string().date(),
    endDate: z.string().date(),
    exclusive: z.boolean(),
    durationMonths: z.number().int().nonnegative(),
    evidenceReference: z.string().trim().min(1),
    confirmed: z.boolean(),
  }).nullable().optional(),
  valuation: valuationSchema,
  historicalTaxes: historicalTaxesSchema.optional(),
  reductions: reductionsSchema.optional(),
  linearDeduction: z.object({
    amount: FiscalDecimalSchema,
    officialMeasureId: z.string().trim().min(1),
    sourceId: z.string().trim().min(1),
    applicableConfirmed: z.boolean(),
  }).nullable().optional(),
  complementary: z.object({
    isComplementary: z.boolean(),
    previousReturnsAmount: FiscalDecimalSchema,
  }).nullable().optional(),
});

export function parseOfficialVehicleValue(input: unknown): OfficialVehicleValue {
  return OfficialVehicleValueSchema.parse(input) as OfficialVehicleValue;
}

export function parseModel576CalculationInput(input: unknown): Model576CalculationInput {
  return Model576CalculationInputSchema.parse(input) as Model576CalculationInput;
}
