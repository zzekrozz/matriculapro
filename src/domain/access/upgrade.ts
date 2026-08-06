import {
  calculateLicenseExpiration,
  calculateUpgradeDeadline,
  isAtOrBeforeInstant,
} from './calendar';
import type {
  LicenseDuration,
  PaidAccessTier,
  PlanPrice,
  PurchaseSnapshot,
  UserLicense,
} from './types';

export type UpgradeIneligibilityReason =
  | 'source_not_one_month'
  | 'source_not_active'
  | 'source_missing_dates'
  | 'source_refunded'
  | 'target_not_longer'
  | 'tier_mismatch'
  | 'window_expired'
  | 'eligibility_not_recorded'
  | 'already_reserved_or_consumed'
  | 'initial_purchase_not_paid'
  | 'invalid_price';

export interface UpgradeEligibilitySnapshot {
  sourceLicenseId: string;
  status: 'eligible' | 'reserved' | 'consumed' | 'invalidated' | 'expired';
  reservedPurchaseId: string | null;
  consumedPurchaseId: string | null;
}

export interface UpgradeQuote {
  eligible: true;
  sourceLicenseId: string;
  tier: PaidAccessTier;
  targetDuration: Exclude<LicenseDuration, 'one_month'>;
  originalStartsAt: string;
  expiresAt: string;
  eligibleUntil: string;
  targetTotalCents: number;
  creditCents: number;
  amountDueCents: number;
  amountDueBaseCents: number;
  amountDueVatCents: number;
  currency: 'EUR';
}

export interface UpgradeRejected {
  eligible: false;
  reason: UpgradeIneligibilityReason;
  eligibleUntil: string | null;
}

export function quotePromotionalUpgrade(input: {
  sourceLicense: UserLicense;
  initialPurchase: PurchaseSnapshot;
  eligibility: UpgradeEligibilitySnapshot | null;
  targetTier: PaidAccessTier;
  targetDuration: LicenseDuration;
  targetPrice: PlanPrice;
  now: string | Date;
}): UpgradeQuote | UpgradeRejected {
  const {
    sourceLicense,
    initialPurchase,
    eligibility,
    targetTier,
    targetDuration,
    targetPrice,
    now,
  } = input;

  if (sourceLicense.duration !== 'one_month') {
    return { eligible: false, reason: 'source_not_one_month', eligibleUntil: null };
  }
  if (sourceLicense.status === 'refunded' || initialPurchase.status === 'refunded') {
    return { eligible: false, reason: 'source_refunded', eligibleUntil: null };
  }
  if (sourceLicense.status !== 'active') {
    return { eligible: false, reason: 'source_not_active', eligibleUntil: null };
  }
  if (!sourceLicense.startsAt || !sourceLicense.expiresAt) {
    return { eligible: false, reason: 'source_missing_dates', eligibleUntil: null };
  }
  if (targetDuration === 'one_month') {
    return { eligible: false, reason: 'target_not_longer', eligibleUntil: null };
  }
  if (sourceLicense.tier !== targetTier || initialPurchase.tier !== targetTier) {
    return { eligible: false, reason: 'tier_mismatch', eligibleUntil: null };
  }
  if (initialPurchase.status !== 'paid') {
    return { eligible: false, reason: 'initial_purchase_not_paid', eligibleUntil: null };
  }
  if (
    targetPrice.tier !== targetTier
    || targetPrice.duration !== targetDuration
    || !Number.isSafeInteger(targetPrice.totalCents)
    || targetPrice.totalCents <= 0
  ) {
    return { eligible: false, reason: 'invalid_price', eligibleUntil: null };
  }

  const eligibleUntil = calculateUpgradeDeadline(sourceLicense.startsAt);
  if (!isAtOrBeforeInstant(now, eligibleUntil)) {
    return { eligible: false, reason: 'window_expired', eligibleUntil };
  }
  if (!eligibility) {
    return { eligible: false, reason: 'eligibility_not_recorded', eligibleUntil };
  }
  if (eligibility.status !== 'eligible') {
    return { eligible: false, reason: 'already_reserved_or_consumed', eligibleUntil };
  }

  const amountOriginallyPaid = initialPurchase.amountDueCents;
  const creditCents = Math.min(Math.max(amountOriginallyPaid, 0), targetPrice.totalCents);
  const amountDueCents = targetPrice.totalCents - creditCents;
  const amountDueBaseCents = Math.round(
    (amountDueCents * 10_000) / (10_000 + targetPrice.vatRateBasisPoints),
  );

  return {
    eligible: true,
    sourceLicenseId: sourceLicense.id,
    tier: targetTier,
    targetDuration,
    originalStartsAt: sourceLicense.startsAt,
    expiresAt: calculateLicenseExpiration(sourceLicense.startsAt, targetDuration),
    eligibleUntil,
    targetTotalCents: targetPrice.totalCents,
    creditCents,
    amountDueCents,
    amountDueBaseCents,
    amountDueVatCents: amountDueCents - amountDueBaseCents,
    currency: targetPrice.currency,
  };
}
