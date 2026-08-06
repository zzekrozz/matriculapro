import type {
  OriginZone,
  SellerType,
  TechnicalApprovalPath,
  VatVehicleStatus,
  VehicleCategory,
} from '@/domain/registration';

export type FreeCheckRiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export interface FreeVehicleCheckInput {
  registrationCountry: string;
  firstRegistrationDate: string;
  mileageKm: number;
  category: VehicleCategory;
  sellerType: SellerType;
  hasInvoice: boolean;
  hasPurchaseContract: boolean;
  fieldK: string;
  approvalNumber: string;
  cocAvailable: boolean | null;
  foreignTechnicalDocumentAvailable: boolean | null;
  fuel: string;
  co2GKm: number | null;
  apparentReforms: boolean;
  previouslyRegisteredInSpain: boolean;
  specialUse: 'none' | 'taxi-rental-driving-school' | 'historical' | 'relocation' | 'other';
  engineCc: number | null;
  powerKw: number | null;
  massKg: number | null;
  seats: number | null;
  checkedAt: string;
}

export interface FreeCheckRiskFactor {
  id: string;
  label: string;
  detail: string;
  weight: number;
  blocking: boolean;
}

export interface FreeVehicleCheckResult {
  riskLevel: FreeCheckRiskLevel;
  /** Internal deterministic indicator; it is not a probability of registration. */
  internalRiskScore: number;
  factors: FreeCheckRiskFactor[];
  vatStatus: VatVehicleStatus;
  vatReason: string;
  originZone: OriginZone;
  originReason: string;
  technicalPath: TechnicalApprovalPath;
  technicalReason: string;
  europeanTypeApprovalPossible: boolean;
  technicalReviewPossible: boolean;
  reformsReviewPossible: boolean;
  recommendedDocuments: string[];
  sellerQuestions: string[];
  contradictions: string[];
  caseKind: 'ordinary' | 'special';
  mainRisks: string[];
  sourceIds: string[];
  updatedAt: string;
}

