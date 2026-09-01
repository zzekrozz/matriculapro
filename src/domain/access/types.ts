export type AccessTier = 'free' | 'particular' | 'professional';

export type PaidAccessTier = Exclude<AccessTier, 'free'>;

export type LicenseDuration = 'one_month' | 'six_months' | 'twelve_months';

export type LicenseStatus =
  | 'free'
  | 'pending_payment'
  | 'scheduled'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'revoked'
  | 'refunded';

export interface UserLicense {
  id: string;
  userId: string;
  tier: AccessTier;
  duration: LicenseDuration | null;
  status: LicenseStatus;
  startsAt: string | null;
  expiresAt: string | null;
  originalPurchaseId: string | null;
  upgradedFromLicenseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AccessMode = 'free' | 'full' | 'read_only';

export type AccessCapability =
  | 'use_free_checker'
  | 'view_historical_paid_data'
  | 'create_full_cases'
  | 'edit_full_cases'
  | 'run_fiscal_calculations'
  | 'use_advanced_simulators'
  | 'generate_reports'
  | 'export_data'
  | 'use_professional_tools'
  // Compatibility aliases kept while older UI consumers are migrated. They
  // are produced from the same explicit server-side policy.
  | 'view_paid_cases'
  | 'create_paid_cases'
  | 'edit_paid_cases'
  | 'recalculate_paid_cases'
  | 'use_fiscal_catalog';

export interface AccessContext {
  userId: string;
  publicBeta: boolean;
  tier: AccessTier;
  mode: AccessMode;
  license: UserLicense | null;
  scheduledLicense: UserLicense | null;
  expiredAt: string | null;
  canUseFreeChecker: true;
  canViewHistoricalPaidData: boolean;
  canCreateFullCases: boolean;
  canEditFullCases: boolean;
  canRunFiscalCalculations: boolean;
  canUseAdvancedSimulators: boolean;
  canGenerateReports: boolean;
  canExport: boolean;
  canUseProfessionalTools: boolean;
  /** @deprecated use canViewHistoricalPaidData */
  canViewPaidCases: boolean;
  /** @deprecated use the operation-specific capabilities */
  canManageFullCases: boolean;
  /** @deprecated use canUseProfessionalTools */
  canUseProfessional: boolean;
  capabilities: readonly AccessCapability[];
}

export interface MoneyBreakdown {
  currency: 'EUR';
  countryCode: 'ES';
  vatRateBasisPoints: number;
  baseCents: number;
  vatCents: number;
  totalCents: number;
  taxIncluded: true;
  priceSource: string;
  effectiveAt: string;
}

export interface PlanPrice extends MoneyBreakdown {
  tier: PaidAccessTier;
  duration: LicenseDuration;
  paymentKind: 'one_time';
  automaticRenewal: false;
}

export type PurchaseStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export type PurchaseKind = 'new' | 'upgrade' | 'renewal';

export type PurchaseRefundStatus =
  | 'not_refunded'
  | 'partially_refunded'
  | 'fully_refunded';

export type PaymentDisputeStatus = 'none' | 'warning' | 'open' | 'won' | 'lost';

export interface PurchaseTaxBreakdown {
  country: 'ES';
  automaticTaxStatus: 'complete';
  taxBehavior: 'inclusive';
  subtotalExcludingTaxCents: number;
  taxAmountCents: number;
  totalIncludingTaxCents: number;
  stripeInvoiceId: string | null;
  stripeInvoiceNumber: string | null;
}

export interface PurchaseSnapshot {
  id: string;
  userId: string;
  tier: PaidAccessTier;
  duration: LicenseDuration;
  purchaseKind: PurchaseKind;
  status: PurchaseStatus;
  expectedPriceId: string;
  expectedBaseCents: number;
  expectedVatCents: number;
  expectedTotalCents: number;
  upgradeCreditCents: number;
  amountDueCents: number;
  amountDueBaseCents: number;
  amountDueVatCents: number;
  currency: 'EUR';
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
  stripeCustomerId: string | null;
  automaticTaxStatus: 'complete' | null;
  taxBehavior: 'inclusive' | 'exclusive' | null;
  subtotalExcludingTaxCents: number | null;
  taxAmountCents: number | null;
  totalIncludingTaxCents: number | null;
  stripeInvoiceId: string | null;
  stripeInvoiceNumber: string | null;
  sourceLicenseId: string | null;
  renewalOfLicenseId: string | null;
  resultingLicenseId: string | null;
  grossAmountCents: number;
  amountPaidCents: number;
  amountRefundedCents: number;
  refundableRemainingCents: number;
  refundStatus: PurchaseRefundStatus;
  lastRefundAt: string | null;
  disputeStatus: PaymentDisputeStatus;
  createdAt: string;
  paidAt: string | null;
}
