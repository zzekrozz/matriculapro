import type { TaxEpigraph } from '../config/tax-rates-2026';
import type {
  AutonomousCommunity,
  RegistrationTaxRoute,
  VehicleCategory,
} from '../types';
import type { DecimalInput } from './decimal';

export type FiscalCalculationStatus =
  | 'complete-official-table'
  | 'complete-new-vehicle'
  | 'estimated-justified-market-value'
  | 'incomplete'
  | 'blocked'
  | 'special-review';

export type ValuationMethod =
  | 'new-vehicle-vat-base'
  | 'official-table'
  | 'justified-market-value';

/**
 * La automatización histórica solo cubre el régimen común peninsular/balear.
 * Los demás territorios tienen impuestos indirectos y/o normas propias que no
 * deben extrapolarse desde el IVA estatal.
 */
export type FiscalTerritory =
  | 'peninsula-balearics-common'
  | 'canary-islands'
  | 'ceuta-melilla'
  | 'navarra'
  | 'basque-country';

export type Model576TaxEpigraph = TaxEpigraph;

export type OfficialVehicleMatchStatus =
  | 'exact-confirmed'
  | 'multiple-candidates'
  | 'possible-match'
  | 'not-found'
  | 'outside-commercial-period';

export interface OfficialVehicleValue {
  id: string;
  catalogYear: number;
  sourceOrder: string;
  sourceAnnex: string;
  brand: string;
  model: string;
  version: string | null;
  commercialStartYear: number | null;
  commercialEndYear: number | null;
  fuelType: string | null;
  engineCapacityCc: number | null;
  cylinders: number | null;
  powerKw: number | null;
  fiscalPower: number | null;
  co2Gkm: number | null;
  newVehicleOfficialValue: number;
  officialRowReference: string;
  normalizedSearchText: string;
  sourceChecksum: string;
}

export interface VehicleCatalogIdentity {
  brand: string;
  model: string;
  version?: string | null;
  fuelType?: string | null;
  engineCapacityCc?: number | null;
  powerKw?: number | null;
  co2Gkm?: number | null;
}

export interface OfficialVehicleDiscrepancy {
  field: string;
  caseValue: string | number | null;
  officialValue: string | number | null;
  blocking: boolean;
}

export interface OfficialVehicleMatchResult {
  status: OfficialVehicleMatchStatus;
  selected: OfficialVehicleValue | null;
  candidates: OfficialVehicleValue[];
  discrepancies: OfficialVehicleDiscrepancy[];
  sourceIds: string[];
  explanation: string;
}

export interface FiscalExplanationStep {
  id: string;
  title: string;
  detail: string;
  formula?: string;
  input?: Record<string, string | number | boolean | null>;
  output?: Record<string, string | number | boolean | null>;
  sourceIds: string[];
}

export interface FiscalMissingData {
  id: string;
  label: string;
  reason: string;
}

export interface FiscalBlocker {
  id: string;
  message: string;
  sourceIds: string[];
}

export interface FiscalWarning {
  id: string;
  message: string;
  sourceIds: string[];
}

export interface FiscalVehicleStatusInput {
  firstRegistrationDate: string;
  referenceDate: string;
  mileageKm: number;
  firstService?: {
    date: string;
    /** Confirmación declarada por el usuario; MatriculaPro no inspecciona el justificante. */
    evidenceConfirmed: boolean;
    sourceDescription: string;
  } | null;
}

export interface FiscalVehicleStatusResult {
  status: 'complete' | 'blocked';
  vehicleStatus: 'new' | 'used' | null;
  newByAge: boolean | null;
  newByMileage: boolean | null;
  dateUsed: string | null;
  sixMonthAnniversary: string | null;
  blockers: FiscalBlocker[];
  explanation: FiscalExplanationStep[];
  sourceIds: string[];
}

export interface DepreciationResult {
  status: 'complete' | 'blocked';
  firstServiceDate: string | null;
  accrualDate: string | null;
  completedYears: number | null;
  completedMonthsAfterAnniversary: number | null;
  nextAnniversary: string | null;
  percentage: number | null;
  percentageExact: string | null;
  officialNewValue: number | null;
  marketValueBeforeProfessionalUseReduction: number | null;
  professionalUseFactor: number | null;
  marketValueAfterDepreciation: number | null;
  marketValueExact: string | null;
  blockers: FiscalBlocker[];
  sourceIds: string[];
  explanation: FiscalExplanationStep[];
}

export interface HistoricalTaxRateResult {
  status: 'resolved' | 'blocked';
  rate: number | null;
  rateExact: string | null;
  validFrom: string | null;
  validTo: string | null;
  sourceIds: string[];
  sourceArticle: string | null;
  blocker: FiscalBlocker | null;
  explanation: FiscalExplanationStep[];
}

export interface HistoricalVehicleTaxClassification {
  category: VehicleCategory;
  co2GKm: number | null;
  /** Dato de CO₂ introducido y confirmado por el usuario, pendiente de contraste documental externo. */
  co2Verified: boolean;
  singleNonCombustionEngine: boolean;
  vehicleKind: 'standard' | 'quad' | 'motorcycle' | 'motorhome' | 'other';
}

export interface ResidualTaxMinorationInput {
  marketValueAfterDepreciation: DecimalInput;
  firstRegistrationDate: string;
  currentRegistrationTerritory: FiscalTerritory;
  historicalVehicleTaxClassification: HistoricalVehicleTaxClassification;
  historicalVatRate: DecimalInput | null;
  historicalIedmtRate: DecimalInput | null;
  otherIndirectTaxRates: DecimalInput[] | null;
  rateSourceIds?: string[];
}

export interface ResidualTaxMinorationResult {
  marketValueBeforeMinoration: number | null;
  historicalVatRate: number | null;
  historicalIedmtRate: number | null;
  otherIndirectTaxRateTotal: number | null;
  denominator: number | null;
  taxableBaseAfterMinoration: number | null;
  residualTaxAmountRemoved: number | null;
  exactValues: {
    marketValueBeforeMinoration: string | null;
    historicalVatRate: string | null;
    historicalIedmtRate: string | null;
    otherIndirectTaxRateTotal: string | null;
    denominator: string | null;
    taxableBaseAfterMinoration: string | null;
    residualTaxAmountRemoved: string | null;
  };
  sourceIds: string[];
  status: FiscalCalculationStatus;
  blockers: FiscalBlocker[];
  explanation: FiscalExplanationStep[];
}

export type ReductionKind =
  | 'large-family-50'
  | 'motorhome-70'
  | 'large-family-and-motorhome-20';

export interface ReductionClaims {
  largeFamily?: {
    claimed: boolean;
    priorRecognitionStatus: 'granted' | 'pending' | 'not-requested';
    resolutionReference?: string | null;
    resolutionDate?: string | null;
    evidenceReference?: string | null;
  };
  motorhome?: {
    claimed: boolean;
    eligibilityConfirmed: boolean;
    evidenceReference?: string | null;
  };
}

export interface BaseReductionResult {
  status: 'not-applicable' | 'applied' | 'blocked';
  kind: ReductionKind | null;
  factor: number | null;
  reducedBase: number | null;
  reducedBaseExact: string | null;
  blockers: FiscalBlocker[];
  sourceIds: string[];
  explanation: FiscalExplanationStep[];
}

export interface CurrentEpigraphInput {
  registrationTaxRoute: RegistrationTaxRoute;
  category: VehicleCategory;
  co2GKm: number | null;
  /** Nombre de API heredado: indica confirmación del usuario, no verificación documental de MatriculaPro. */
  co2Verified: boolean;
  singleNonCombustionEngine: boolean;
  vehicleKind: 'standard' | 'quad' | 'motorcycle' | 'motorhome' | 'other';
  motorcyclePowerKw?: number | null;
  motorcycleMassKg?: number | null;
}

export interface CurrentEpigraphResult {
  status: 'resolved' | 'blocked' | 'special-review';
  epigraph: TaxEpigraph | null;
  blockers: FiscalBlocker[];
  warnings: FiscalWarning[];
  sourceIds: string[];
  explanation: FiscalExplanationStep[];
}

export interface CurrentIedmtRateResult {
  status: 'resolved' | 'blocked';
  rate: number | null;
  rateExact: string | null;
  community: AutonomousCommunity;
  epigraph: TaxEpigraph;
  validFrom: string;
  validTo: string;
  sourceIds: string[];
  blocker: FiscalBlocker | null;
  explanation: FiscalExplanationStep[];
}

export type Model576ValuationInput =
  | {
      method: 'new-vehicle-vat-base';
      vatTaxableBase: DecimalInput;
      currency: string;
      exchangeRateToEur?: DecimalInput | null;
      netPrice?: DecimalInput | null;
      discounts?: DecimalInput | null;
      taxableAccessoryCosts?: DecimalInput | null;
      indirectTaxAmount?: DecimalInput | null;
      acquisitionDate?: string | null;
      territory?: string | null;
      sourceDescription: string;
    }
  | {
      method: 'official-table';
      match: OfficialVehicleMatchResult;
      catalogVersion: string;
      invoicePrice?: DecimalInput | null;
    }
  | {
      method: 'justified-market-value';
      marketValue: DecimalInput;
      valuationDate: string;
      methodDescription: string;
      sourceDescription: string;
      reasonForNotUsingTable: string;
      supportingDocument?: string | null;
      invoicePrice?: DecimalInput | null;
    };

export type HistoricalTaxesInput =
  | {
      mode: 'automatic';
      territory: FiscalTerritory;
      otherIndirectTaxesConfirmedNone: boolean;
    }
  | {
      mode: 'user-provided';
      historicalVatRate: DecimalInput;
      historicalIedmtRate: DecimalInput;
      otherIndirectTaxRates: DecimalInput[];
      sourceDescription: string;
    };

export interface Model576CalculationInput {
  registrationTaxRoute: RegistrationTaxRoute;
  /** Confirmación expresa de que el caso está sujeto, no exento y corresponde al Modelo 576. */
  registrationTaxSubjectConfirmed: boolean;
  accrualDate: string;
  /** Fecha de entrega/adquisición usada solo para la regla IVA nuevo/usado. */
  referenceDate: string;
  firstRegistrationDate: string;
  firstService?: {
    date: string;
    /** Confirmación declarada por el usuario; MatriculaPro no inspecciona el justificante. */
    evidenceConfirmed: boolean;
    sourceDescription: string;
  } | null;
  mileageKm: number;
  currentAutonomousCommunity: AutonomousCommunity;
  vehicle: {
    category: VehicleCategory;
    co2GKm: number | null;
    /** Nombre de API heredado: indica confirmación del usuario, no verificación documental de MatriculaPro. */
    co2Verified: boolean;
    singleNonCombustionEngine: boolean;
    kind: 'standard' | 'quad' | 'motorcycle' | 'motorhome' | 'other';
    motorcyclePowerKw?: number | null;
    motorcycleMassKg?: number | null;
  };
  previouslyRegisteredAbroad: boolean;
  professionalUseHistory?: {
    activity: 'taxi' | 'rental' | 'driving-school';
    startDate: string;
    endDate: string;
    exclusive: boolean;
    /** Dato declarado que se contrasta con las fechas; nunca decide por sí solo. */
    durationMonths: number;
    evidenceReference: string;
    /** Confirmación declarada por el usuario, sujeta a contraste documental externo. */
    confirmed: boolean;
  } | null;
  valuation: Model576ValuationInput;
  historicalTaxes?: HistoricalTaxesInput;
  reductions?: ReductionClaims;
  linearDeduction?: {
    amount: DecimalInput;
    officialMeasureId: string;
    sourceId: string;
    applicableConfirmed: boolean;
  } | null;
  complementary?: {
    isComplementary: boolean;
    previousReturnsAmount: DecimalInput;
  } | null;
}

export interface Model576BoxGuidance {
  box: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08';
  title: string;
  value: number | string | null;
  origin: string;
  formula: string | null;
  sourceIds: string[];
  warnings: string[];
}

export interface UsedInvoiceComparison {
  invoicePrice: number;
  officialOrJustifiedMarketValue: number;
  absoluteDifference: number;
  percentageDifference: number | null;
  explanation: string;
}

export interface Model576Calculation {
  status: FiscalCalculationStatus;
  vehicleStatus: 'new' | 'used' | null;
  valuationMethod: ValuationMethod;

  officialVehicleValue: number | null;
  depreciationPercentage: number | null;
  marketValueAfterDepreciation: number | null;

  historicalVatRateForResidualTax: number | null;
  historicalIedmtRateForResidualTax: number | null;
  otherIndirectTaxRateTotal: number | null;
  residualTaxAmountRemoved: number | null;

  box01TaxableBase: number | null;
  reductionKind: ReductionKind | null;
  box02ReducedTaxableBase: number | null;

  epigraph: TaxEpigraph | null;
  currentIedmtRateForLiquidation: number | null;

  box04TaxQuota: number | null;
  box05LinearDeduction: number | null;
  box06AmountAfterDeduction: number | null;
  box07PreviousReturnsToDeduct: number | null;
  box08FinalResult: number | null;

  exactValues: {
    marketValueAfterDepreciation: string | null;
    box01TaxableBase: string | null;
    box02ReducedTaxableBase: string | null;
    box04TaxQuotaBeforeRounding: string | null;
    box08FinalResultBeforeRounding: string | null;
  };
  usedInvoiceComparison: UsedInvoiceComparison | null;
  boxGuidance: Model576BoxGuidance[];
  missingData: FiscalMissingData[];
  blockers: FiscalBlocker[];
  warnings: FiscalWarning[];
  explanation: FiscalExplanationStep[];
  sourceIds: string[];
  catalogVersion: string | null;
  calculatedAt: string;
}
