import type {
  FiscalTerritory,
  Model576Calculation,
  ReductionClaims,
} from '@/domain/registration/fiscal/types';
import type {
  AutonomousCommunity,
  RegistrationTaxRoute,
  VehicleCategory,
} from '@/domain/registration/types';

export type FiscalValuationRequest =
  | {
      method: 'new-vehicle-vat-base';
      vatTaxableBase: string;
      currency: string;
      exchangeRateToEur: string | null;
      netPrice: string | null;
      discounts: string | null;
      taxableAccessoryCosts: string | null;
      indirectTaxAmount: string | null;
      acquisitionDate: string | null;
      territory: string | null;
      sourceDescription: string;
    }
  | {
      method: 'official-table';
      catalogVehicleId: string;
      invoicePrice: string | null;
    }
  | {
      method: 'justified-market-value';
      marketValue: string;
      valuationDate: string;
      methodDescription: string;
      sourceDescription: string;
      reasonForNotUsingTable: string;
      supportingDocument: string | null;
      invoicePrice: string | null;
    };

export type FiscalHistoricalTaxesRequest =
  | {
      mode: 'automatic';
      territory: FiscalTerritory;
      otherIndirectTaxesConfirmedNone: boolean;
    }
  | {
      mode: 'user-provided';
      historicalVatRate: string;
      historicalIedmtRate: string;
      otherIndirectTaxRates: string[];
      sourceDescription: string;
    };

export interface Model576ApiRequest {
  registrationTaxRoute: RegistrationTaxRoute;
  registrationTaxSubjectConfirmed: boolean;
  referenceDate: string;
  accrualDate: string;
  firstRegistrationDate: string;
  firstService: {
    date: string;
    evidenceConfirmed: boolean;
    sourceDescription: string;
  } | null;
  mileageKm: number;
  currentAutonomousCommunity: AutonomousCommunity;
  vehicle: {
    brand: string;
    model: string;
    version: string | null;
    fuelType: string | null;
    engineCapacityCc: number | null;
    powerKw: number | null;
    category: VehicleCategory;
    co2GKm: number | null;
    co2Verified: boolean;
    singleNonCombustionEngine: boolean;
    kind: 'standard' | 'quad' | 'motorcycle' | 'motorhome' | 'other';
  };
  previouslyRegisteredAbroad: boolean;
  professionalUseHistory: {
    activity: 'taxi' | 'rental' | 'driving-school';
    startDate: string;
    endDate: string;
    exclusive: boolean;
    durationMonths: number;
    evidenceReference: string;
    confirmed: boolean;
  } | null;
  valuation: FiscalValuationRequest;
  historicalTaxes?: FiscalHistoricalTaxesRequest;
  reductions?: ReductionClaims;
  confirmation: {
    reviewedByUser: boolean;
    confirmedAt: string | null;
  };
}

export type Model576ApiResponse =
  | {
      ok: true;
      calculation: Model576Calculation;
      selectedCatalogVehicleId: string | null;
    }
  | {
      ok: false;
      code: 'invalid-input' | 'catalog-unavailable' | 'catalog-row-not-found' | 'calculation-error';
      message: string;
    };
