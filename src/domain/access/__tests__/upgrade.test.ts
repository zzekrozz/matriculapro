import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateUpgradeDeadline,
  quotePromotionalUpgrade,
  type PlanPrice,
  type PurchaseSnapshot,
  type UserLicense,
} from '..';

const USER_ID = '00000000-0000-4000-8000-000000000001';

function sourceLicense(overrides: Partial<UserLicense> = {}): UserLicense {
  return {
    id: '00000000-0000-4000-8000-000000000101',
    userId: USER_ID,
    tier: 'particular',
    duration: 'one_month',
    status: 'active',
    startsAt: '2026-08-05T10:00:00.000Z',
    expiresAt: '2026-09-05T10:00:00.000Z',
    originalPurchaseId: '00000000-0000-4000-8000-000000000201',
    upgradedFromLicenseId: null,
    createdAt: '2026-08-05T10:00:00.000Z',
    updatedAt: '2026-08-05T10:00:00.000Z',
    ...overrides,
  };
}

function initialPurchase(overrides: Partial<PurchaseSnapshot> = {}): PurchaseSnapshot {
  return {
    id: '00000000-0000-4000-8000-000000000201',
    userId: USER_ID,
    tier: 'particular',
    duration: 'one_month',
    purchaseKind: 'new',
    status: 'paid',
    expectedPriceId: 'price_particular_1m',
    expectedBaseCents: 6_529,
    expectedVatCents: 1_371,
    expectedTotalCents: 7_900,
    upgradeCreditCents: 0,
    amountDueCents: 7_900,
    amountDueBaseCents: 6_529,
    amountDueVatCents: 1_371,
    currency: 'EUR',
    checkoutSessionId: 'cs_test_initial',
    paymentIntentId: 'pi_initial',
    stripeCustomerId: 'cus_initial',
    expectedStripeTaxRateId: 'txr_es_iva_21',
    appliedStripeTaxRateId: 'txr_es_iva_21',
    taxPercentage: 21,
    taxBehavior: 'inclusive',
    subtotalExcludingTaxCents: 6_529,
    taxAmountCents: 1_371,
    totalIncludingTaxCents: 7_900,
    stripeInvoiceId: 'in_initial',
    stripeInvoiceNumber: 'MPR-INITIAL',
    sourceLicenseId: null,
    renewalOfLicenseId: null,
    resultingLicenseId: '00000000-0000-4000-8000-000000000101',
    grossAmountCents: 7_900,
    amountPaidCents: 7_900,
    amountRefundedCents: 0,
    refundableRemainingCents: 7_900,
    refundStatus: 'not_refunded',
    lastRefundAt: null,
    disputeStatus: 'none',
    createdAt: '2026-08-05T10:00:00.000Z',
    paidAt: '2026-08-05T10:00:00.000Z',
    ...overrides,
  };
}

function targetPrice(overrides: Partial<PlanPrice> = {}): PlanPrice {
  return {
    tier: 'particular',
    duration: 'six_months',
    paymentKind: 'one_time',
    automaticRenewal: false,
    currency: 'EUR',
    countryCode: 'ES',
    vatRateBasisPoints: 2_100,
    baseCents: 14_793,
    vatCents: 3_107,
    totalCents: 17_900,
    taxIncluded: true,
    priceSource: 'test-price',
    effectiveAt: '2026-08-05T00:00:00.000Z',
    ...overrides,
  };
}

const ELIGIBLE = {
  sourceLicenseId: '00000000-0000-4000-8000-000000000101',
  status: 'eligible' as const,
  reservedPurchaseId: null,
  consumedPurchaseId: null,
};

describe('15-day promotional upgrade', () => {
  it('credits 100% on day 1 and keeps the original start', () => {
    const result = quotePromotionalUpgrade({
      sourceLicense: sourceLicense(),
      initialPurchase: initialPurchase(),
      eligibility: ELIGIBLE,
      targetTier: 'particular',
      targetDuration: 'six_months',
      targetPrice: targetPrice(),
      now: '2026-08-06T10:00:00.000Z',
    });
    assert.equal(result.eligible, true);
    if (!result.eligible) return;
    assert.equal(result.creditCents, 7_900);
    assert.equal(result.amountDueCents, 10_000);
    assert.equal(result.amountDueBaseCents, 8_264);
    assert.equal(result.amountDueVatCents, 1_736);
    assert.equal(result.originalStartsAt, '2026-08-05T10:00:00.000Z');
    assert.equal(result.expiresAt, '2027-02-05T10:00:00.000Z');
  });

  it('includes the exact instant at day 15', () => {
    const deadline = calculateUpgradeDeadline('2026-08-05T10:00:00.000Z');
    assert.equal(deadline, '2026-08-20T10:00:00.000Z');
    const result = quotePromotionalUpgrade({
      sourceLicense: sourceLicense(),
      initialPurchase: initialPurchase(),
      eligibility: ELIGIBLE,
      targetTier: 'particular',
      targetDuration: 'six_months',
      targetPrice: targetPrice(),
      now: deadline,
    });
    assert.equal(result.eligible, true);
  });

  it('rejects one second after the exact deadline', () => {
    const result = quotePromotionalUpgrade({
      sourceLicense: sourceLicense(),
      initialPurchase: initialPurchase(),
      eligibility: ELIGIBLE,
      targetTier: 'particular',
      targetDuration: 'six_months',
      targetPrice: targetPrice(),
      now: '2026-08-20T10:00:01.000Z',
    });
    assert.deepEqual(result, {
      eligible: false,
      reason: 'window_expired',
      eligibleUntil: '2026-08-20T10:00:00.000Z',
    });
  });

  it('rejects a duplicate reservation or consumption', () => {
    for (const status of ['reserved', 'consumed'] as const) {
      const result = quotePromotionalUpgrade({
        sourceLicense: sourceLicense(),
        initialPurchase: initialPurchase(),
        eligibility: { ...ELIGIBLE, status },
        targetTier: 'particular',
        targetDuration: 'six_months',
        targetPrice: targetPrice(),
        now: '2026-08-06T10:00:00.000Z',
      });
      assert.equal(result.eligible, false);
      if (!result.eligible) assert.equal(result.reason, 'already_reserved_or_consumed');
    }
  });

  it('requires a server-recorded eligibility row', () => {
    const result = quotePromotionalUpgrade({
      sourceLicense: sourceLicense(),
      initialPurchase: initialPurchase(),
      eligibility: null,
      targetTier: 'particular',
      targetDuration: 'six_months',
      targetPrice: targetPrice(),
      now: '2026-08-06T10:00:00.000Z',
    });
    assert.equal(result.eligible, false);
    if (!result.eligible) assert.equal(result.reason, 'eligibility_not_recorded');
  });

  it('rejects a change from Particular to Professional', () => {
    const result = quotePromotionalUpgrade({
      sourceLicense: sourceLicense(),
      initialPurchase: initialPurchase(),
      eligibility: ELIGIBLE,
      targetTier: 'professional',
      targetDuration: 'six_months',
      targetPrice: targetPrice({ tier: 'professional', totalCents: 29_900 }),
      now: '2026-08-06T10:00:00.000Z',
    });
    assert.equal(result.eligible, false);
    if (!result.eligible) assert.equal(result.reason, 'tier_mismatch');
  });

  it('invalidates the promotion after a refund', () => {
    for (const variant of [
      { source: sourceLicense({ status: 'refunded' }), purchase: initialPurchase() },
      { source: sourceLicense(), purchase: initialPurchase({ status: 'refunded' }) },
    ]) {
      const result = quotePromotionalUpgrade({
        sourceLicense: variant.source,
        initialPurchase: variant.purchase,
        eligibility: ELIGIBLE,
        targetTier: 'particular',
        targetDuration: 'six_months',
        targetPrice: targetPrice(),
        now: '2026-08-06T10:00:00.000Z',
      });
      assert.equal(result.eligible, false);
      if (!result.eligible) assert.equal(result.reason, 'source_refunded');
    }
  });

  it('supports twelve months without moving the original start date', () => {
    const result = quotePromotionalUpgrade({
      sourceLicense: sourceLicense(),
      initialPurchase: initialPurchase(),
      eligibility: ELIGIBLE,
      targetTier: 'particular',
      targetDuration: 'twelve_months',
      targetPrice: targetPrice({
        duration: 'twelve_months', baseCents: 23_058, vatCents: 4_842, totalCents: 27_900,
      }),
      now: '2026-08-06T10:00:00.000Z',
    });
    assert.equal(result.eligible, true);
    if (!result.eligible) return;
    assert.equal(result.amountDueCents, 20_000);
    assert.equal(result.amountDueBaseCents, 16_529);
    assert.equal(result.amountDueVatCents, 3_471);
    assert.equal(result.expiresAt, '2027-08-05T10:00:00.000Z');
  });

  it('supports Professional 129 EUR to 299 EUR and 449 EUR upgrades', () => {
    const professionalSource = sourceLicense({ tier: 'professional' });
    const professionalPurchase = initialPurchase({
      tier: 'professional', expectedTotalCents: 12_900,
      amountDueCents: 12_900, amountPaidCents: 12_900,
      refundableRemainingCents: 12_900,
    });
    for (const target of [
      { duration: 'six_months' as const, total: 29_900, base: 24_711, vat: 5_189, due: 17_000 },
      { duration: 'twelve_months' as const, total: 44_900, base: 37_107, vat: 7_793, due: 32_000 },
    ]) {
      const result = quotePromotionalUpgrade({
        sourceLicense: professionalSource,
        initialPurchase: professionalPurchase,
        eligibility: ELIGIBLE,
        targetTier: 'professional',
        targetDuration: target.duration,
        targetPrice: targetPrice({
          tier: 'professional', duration: target.duration,
          totalCents: target.total, baseCents: target.base, vatCents: target.vat,
        }),
        now: '2026-08-06T10:00:00.000Z',
      });
      assert.equal(result.eligible, true);
      if (result.eligible) {
        assert.equal(result.creditCents, 12_900);
        assert.equal(result.amountDueCents, target.due);
      }
    }
  });

  it('caps credit at the target total and never creates money or balance', () => {
    const result = quotePromotionalUpgrade({
      sourceLicense: sourceLicense(),
      initialPurchase: initialPurchase({ amountDueCents: 99_999 }),
      eligibility: ELIGIBLE,
      targetTier: 'particular',
      targetDuration: 'six_months',
      targetPrice: targetPrice(),
      now: '2026-08-06T10:00:00.000Z',
    });
    assert.equal(result.eligible, true);
    if (!result.eligible) return;
    assert.equal(result.creditCents, 17_900);
    assert.equal(result.amountDueCents, 0);
    assert.equal(result.amountDueBaseCents, 0);
    assert.equal(result.amountDueVatCents, 0);
  });
});
