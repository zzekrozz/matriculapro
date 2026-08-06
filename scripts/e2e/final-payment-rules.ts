import assert from 'node:assert/strict';
import {
  isWithinRenewalWindow,
  renewalWindowOpensAt,
  validateCompletedCheckout,
  type PurchaseSnapshot,
  type VerifiedCheckoutSnapshot,
} from '../../src/domain/access';
import { PLAN_PRICES } from '../../src/lib/payments/catalog';

const purchase: PurchaseSnapshot = {
  id: '70000000-0000-4000-8000-000000000101',
  userId: '70000000-0000-4000-8000-000000000001',
  tier: 'particular', duration: 'one_month', purchaseKind: 'new', status: 'pending',
  expectedPriceId: 'price_fixture_79', expectedBaseCents: 6_529,
  expectedVatCents: 1_371, expectedTotalCents: 7_900,
  upgradeCreditCents: 0, amountDueCents: 7_900,
  amountDueBaseCents: 6_529, amountDueVatCents: 1_371, currency: 'EUR',
  checkoutSessionId: 'cs_test_fixture', paymentIntentId: null,
  stripeCustomerId: 'cus_fixture', automaticTaxStatus: null, taxBehavior: null,
  subtotalExcludingTaxCents: null, taxAmountCents: null,
  totalIncludingTaxCents: null, stripeInvoiceId: null, stripeInvoiceNumber: null,
  sourceLicenseId: null, renewalOfLicenseId: null, resultingLicenseId: null,
  grossAmountCents: 7_900, amountPaidCents: 0, amountRefundedCents: 0,
  refundableRemainingCents: 0, refundStatus: 'not_refunded', lastRefundAt: null,
  disputeStatus: 'none', createdAt: '2026-08-06T10:00:00.000Z', paidAt: null,
};

const checkout: VerifiedCheckoutSnapshot = {
  id: 'cs_test_fixture', livemode: false, mode: 'payment', paymentStatus: 'paid',
  amountTotalCents: 7_900, currency: 'eur', priceId: 'price_fixture_79', quantity: 1,
  paymentIntentId: 'pi_fixture', chargeId: 'ch_fixture', customerId: 'cus_fixture', taxCountry: 'ES',
  automaticTaxEnabled: true, automaticTaxStatus: 'complete', taxBehavior: 'inclusive',
  subtotalExcludingTaxCents: 6_529,
  taxAmountCents: 1_371, totalIncludingTaxCents: 7_900,
  invoiceId: 'in_fixture', invoiceNumber: 'MPR-FIXTURE', invoiceStatus: 'paid',
  invoiceCurrency: 'eur', invoiceCountry: 'ES',
  invoicePriceId: 'price_fixture_79', invoiceAutomaticTaxEnabled: true,
  invoiceAutomaticTaxStatus: 'complete', invoiceTaxBehavior: 'inclusive',
  invoiceSubtotalExcludingTaxCents: 6_529, invoiceTaxAmountCents: 1_371,
  invoiceTotalIncludingTaxCents: 7_900,
};

assert.deepEqual(validateCompletedCheckout(purchase, checkout), { valid: true, reason: null });
assert.equal(
  validateCompletedCheckout(purchase, { ...checkout, taxCountry: 'FR' }).reason,
  'country_mismatch',
);
assert.equal(
  validateCompletedCheckout(purchase, { ...checkout, invoiceId: null }).reason,
  'invoice_missing',
);
assert.deepEqual(
  [PLAN_PRICES.particular.one_month.baseCents, PLAN_PRICES.particular.one_month.vatCents],
  [6_529, 1_371],
);
assert.deepEqual(
  [PLAN_PRICES.professional.six_months.baseCents, PLAN_PRICES.professional.six_months.vatCents],
  [24_711, 5_189],
);

for (const expiry of ['2026-03-31T18:00:00+02:00', '2026-10-31T18:00:00+01:00']) {
  const opens = renewalWindowOpensAt(expiry);
  assert.equal(isWithinRenewalWindow(opens, expiry), true);
  assert.equal(isWithinRenewalWindow(new Date(Date.parse(opens) - 1), expiry), false);
  assert.equal(isWithinRenewalWindow(expiry, expiry), false);
}

console.log('FINAL_PAYMENT_RULES_E2E_STATUS=VALID (Stripe Tax, IVA 79/299, invoice, ES, DST March/October)');
