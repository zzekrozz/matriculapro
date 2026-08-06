export type VehicleCategory =
  | 'M1'
  | 'M2'
  | 'M3'
  | 'N1'
  | 'N2'
  | 'N3'
  | 'L'
  | 'O'
  | 'SPECIAL'
  | 'UNKNOWN';

export type OriginZone =
  | 'spain'
  | 'eu'
  | 'eea'
  | 'uk-post-brexit'
  | 'third-country'
  | 'unknown';

export type SellerType =
  | 'private'
  | 'foreign-professional'
  | 'spanish-professional'
  | 'already-owned'
  | 'inheritance'
  | 'donation'
  | 'unknown';

export type BuyerType = 'individual' | 'self-employed' | 'company';
export type VatVehicleStatus = 'new' | 'used' | 'undetermined';
export type CaseStatus = 'draft' | 'assessing' | 'blocked' | 'in-progress' | 'ready' | 'registered' | 'archived';
export type ProcessStage =
  | 'not-purchased'
  | 'purchased'
  | 'transported'
  | 'itv-requested'
  | 'itv-passed'
  | 'taxes-started'
  | 'dgt-started'
  | 'registered';
export type ProcessKind = 'ordinary-import' | 'relocation' | 'rehabilitation' | 'historical' | 'special-review';
export type CaseMode = 'practice' | 'case';

export type ApprovalType =
  | 'eu-type'
  | 'spanish-type'
  | 'individual-eea'
  | 'individual-eu'
  | 'individual-spain'
  | 'short-series-eea'
  | 'none'
  | 'unknown';

export type TechnicalApprovalPath =
  | 'eu-coc'
  | 'eu-reduced-sheet'
  | 'eea-equivalence-review'
  | 'spanish-individual-approval'
  | 'special-review';

export type PurchaseTaxRoute =
  | 'itp'
  | 'spanish-vat-new-vehicle'
  | 'foreign-professional-invoice-review'
  | 'spanish-professional-invoice'
  | 'customs'
  | 'relocation-review'
  | 'rehabilitation-review'
  | 'special-review';

export type RegistrationTaxRoute = 'model-576' | 'model-06' | 'model-05' | 'special-review';

export type AutonomousCommunity =
  | 'andalucia'
  | 'aragon'
  | 'asturias'
  | 'baleares'
  | 'canarias'
  | 'cantabria'
  | 'castilla-la-mancha'
  | 'castilla-y-leon'
  | 'cataluna'
  | 'comunidad-valenciana'
  | 'extremadura'
  | 'galicia'
  | 'madrid'
  | 'murcia'
  | 'navarra'
  | 'pais-vasco'
  | 'la-rioja'
  | 'ceuta'
  | 'melilla';

export type ReformKey =
  | 'suspension'
  | 'nonEquivalentWheels'
  | 'spacers'
  | 'lighting'
  | 'towBar'
  | 'seats'
  | 'classification'
  | 'bodywork'
  | 'camperConversion'
  | 'exhaust'
  | 'powerOrEngine'
  | 'dimensions'
  | 'exteriorElements'
  | 'steeringConversion'
  | 'structural';

export type ReformAnswers = Record<ReformKey, boolean | null>;

export type SpecialCircumstance =
  | 'motorhome'
  | 'historical'
  | 'relocation'
  | 'inheritance'
  | 'donation'
  | 'diplomatic'
  | 'taxi-rental-driving-school'
  | 'large-family'
  | 'disability'
  | 'canary-ceuta-melilla'
  | 'previously-registered-spain'
  | 'rehabilitation'
  | 'temporary-import'
  | 'incomplete-ownership'
  | 'complex-reform';

export interface Vehicle {
  id?: string;
  brand: string;
  model: string;
  vin: string;
  firstRegistrationDate: string | null;
  mileageKm: number | null;
  category: VehicleCategory;
  fuel: string | null;
  co2GKm: number | null;
  co2Source: 'spanish-itv' | 'coc' | 'manufacturer-certificate' | 'foreign-official-document' | 'manual-unverified' | 'unknown';
  co2Verified: boolean;
  engineCc: number | null;
  powerKw: number | null;
  massKg: number | null;
  seats: number | null;
  registrationCountry: string;
  manufacturingCountry: string | null;
  foreignRegistration: string | null;
  previouslyRegisteredAbroad: boolean;
  exportDeregistered: boolean | null;
  transportMethod: 'driven' | 'trailer' | 'carrier' | 'temporary-plates' | 'unknown';
  fieldK: string | null;
  approvalNumber: string | null;
  cocAvailable: boolean | null;
  cocValidityConfirmed: boolean;
  cocVinMatchConfirmed: boolean;
  foreignTechnicalDocumentAvailable: boolean | null;
  foreignInspectionCertificateAvailable: boolean | null;
  foreignInspectionDate: string | null;
  foreignInspectionValidUntil: string | null;
  approvalType: ApprovalType;
  reforms: ReformAnswers;
  previouslyRegisteredInSpain: boolean;
  categoryConfirmedOnSpanishItv: boolean;
}

export interface RegistrationCase {
  id: string;
  userId: string | null;
  mode: CaseMode;
  title: string;
  status: CaseStatus;
  processStage: ProcessStage;
  operation: 'purchase' | 'already-owned' | 'relocation' | 'inheritance' | 'donation';
  sellerType: SellerType;
  sellerCountry: string | null;
  purchasePrice: number | null;
  purchaseCurrency: string;
  purchaseDate: string | null;
  invoiceVatNumber: string | null;
  invoiceVatScheme: string | null;
  buyerType: BuyerType;
  autonomousCommunity: AutonomousCommunity | null;
  municipality: string | null;
  taxableBase: number | null;
  marketValue: number | null;
  registrationTaxSubjectConfirmed: boolean | null;
  taxBenefitKind: 'none' | 'no-subjection' | 'exemption' | 'reduction' | 'unknown';
  taxBenefitRequiresPriorRecognition: boolean | null;
  n1EconomicUseConfirmed: boolean | null;
  n1VatDeductionPercent: number | null;
  customsUnionStatusConfirmed: boolean | null;
  northernIrelandV5cConfirmed: boolean | null;
  relocationDates: {
    previousResidenceFrom: string | null;
    spanishResidenceFrom: string | null;
    ownershipFrom: string | null;
    useFrom: string | null;
  };
  firstEntryIntoSpainDate: string | null;
  firstEntryIntoEuDate: string | null;
  relocationNormalTaxationConfirmed: boolean | null;
  relocationRegistrationDeadlineConfirmed: boolean | null;
  relocationNonTransferAcknowledged: boolean;
  fiscalHorsepower: number | null;
  ivtmDate: string | null;
  municipalBenefitKind: 'none' | 'exemption' | 'discount' | 'unknown';
  ivtmStatus: 'pending' | 'requested' | 'paid' | 'exempt-or-discounted' | 'municipal-review';
  specialCircumstances: SpecialCircumstance[];
  vehicle: Vehicle;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OfficialSource {
  id: string;
  authority: string;
  title: string;
  url: string;
  scope: string;
  reviewedAt: string;
  version?: string;
  effectiveFrom?: string;
  mustReviewAnnually?: boolean;
}

export interface RuleResult<T> {
  ruleId: string;
  outcome: T;
  reason: string;
  usedData: Record<string, string | number | boolean | null>;
  missingData: string[];
  sourceIds: string[];
  reviewedAt: string;
  confidence: 'high' | 'medium' | 'low';
  blocking: boolean;
}

export type DocumentType =
  | 'foreign-registration-certificate'
  | 'foreign-technical-document'
  | 'coc'
  | 'reduced-technical-sheet'
  | 'individual-approval-or-equivalence'
  | 'invoice'
  | 'purchase-contract'
  | 'translation'
  | 'itp-proof'
  | 'vat-proof'
  | 'customs-document'
  | 'spanish-itv-card'
  | 'model-576-proof'
  | 'model-06-proof'
  | 'model-05-resolution'
  | 'ivtm-proof'
  | 'dgt-fee'
  | 'identity'
  | 'representation'
  | 'spanish-registration-certificate'
  | 'insurance'
  | 'reform-documents'
  | 'seller-tax-registration';

export type DocumentStatus =
  | 'not-requested'
  | 'pending'
  | 'received'
  | 'in-review'
  | 'verified'
  | 'issue'
  | 'replaced'
  | 'not-applicable';

export interface RequiredDocument {
  type: DocumentType;
  title: string;
  reason: string;
  status: DocumentStatus;
  requiredFor: Array<'ownership' | 'itv' | 'purchase-tax' | 'registration-tax' | 'ivtm' | 'dgt' | 'insurance'>;
  conditional: boolean;
  sourceIds: string[];
}

export interface CaseTask {
  id: string;
  title: string;
  description: string;
  category: 'case-data' | 'documents' | 'itv' | 'purchase-tax' | 'registration-tax' | 'ivtm' | 'dgt' | 'plates-insurance';
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
  requiredDocumentType?: DocumentType;
  sourceIds: string[];
}

export interface CaseBlocker {
  id: string;
  title: string;
  reason: string;
  missingData: string[];
  sourceIds: string[];
}

export interface CaseWarning {
  id: string;
  title: string;
  detail: string;
  sourceIds: string[];
}

export interface CaseRisk {
  id: string;
  level: 'low' | 'medium' | 'high';
  title: string;
  reason: string;
  reviewBy: string;
  sourceIds: string[];
}

export interface RouteStep {
  id: string;
  order: number;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'blocked' | 'not-applicable';
  requiredDocuments: DocumentType[];
  sourceIds: string[];
}

export interface CostItem {
  id: string;
  title: string;
  kind: 'known' | 'estimated' | 'variable' | 'unavailable';
  amount: number | null;
  currency: 'EUR';
  explanation: string;
  sourceIds: string[];
  reviewedAt: string;
}

export interface RegistrationDecision {
  processKind: ProcessKind;
  supportedScope: boolean;
  vatVehicleStatus: RuleResult<VatVehicleStatus>;
  originZone: RuleResult<OriginZone>;
  technicalPath: RuleResult<TechnicalApprovalPath>;
  purchaseTaxRoute: RuleResult<PurchaseTaxRoute>;
  registrationTaxRoute: RuleResult<RegistrationTaxRoute>;
  requiredDocuments: RequiredDocument[];
  route: RouteStep[];
  blockers: CaseBlocker[];
  warnings: CaseWarning[];
  risks: CaseRisk[];
  nextAction: CaseTask | null;
  estimatedCosts: CostItem[];
  sources: OfficialSource[];
}

export type SimulatorMode = 'practice' | 'case';
export type VehicleInput = Vehicle;

export interface SimulatorFieldAccess {
  editableBlocks?: Array<
    | 'taxpayer'
    | 'operation'
    | 'vat-status'
    | 'technical-data'
    | 'taxable-base'
    | 'tax-bracket'
    | 'tax-rate'
    | 'tax-benefits'
    | 'estimate'
    | 'result'
  >;
}

export interface TaxCalculation {
  id?: string;
  caseId?: string;
  taxableBase: number | null;
  marketValue: number | null;
  co2GKm: number | null;
  category: VehicleCategory;
  autonomousCommunity: AutonomousCommunity | null;
  epigraph: 1 | 2 | 3 | 4 | 5 | null;
  rate: number | null;
  estimatedQuota: number | null;
  calculatedAt: string;
  sourceIds: string[];
}
