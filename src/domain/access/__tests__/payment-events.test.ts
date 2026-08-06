import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  reduceTrustedPaymentEvent,
  validateCompletedCheckout,
  type PaymentReducerState,
  type PurchaseSnapshot,
  type VerifiedCheckoutSnapshot,
} from '..';

function purchase(overrides: Partial<PurchaseSnapshot> = {}): PurchaseSnapshot {
  return {
    id: '00000000-0000-4000-8000-000000000201',
    userId: '00000000-0000-4000-8000-000000000001',
    tier: 'particular',
    duration: 'six_months',
    purchaseKind: 'upgrade',
    status: 'pending',
    expectedPriceId: 'price_particular_6m',
    expectedBaseCents: 14_793,
    expectedVatCents: 3_107,
    expectedTotalCents: 17_900,
    upgradeCreditCents: 7_900,
    amountDueCents: 10_000,
    amountDueBaseCents: 8_264,
    amountDueVatCents: 1_736,
    currency: 'EUR',
    checkoutSessionId: 'cs_test_expected',
    paymentIntentId: null,
    stripeCustomerId: 'cus_expected',
    expectedStripeTaxRateId: 'txr_es_iva_21',
    appliedStripeTaxRateId: null,
    taxPercentage: null,
    taxBehavior: null,
    subtotalExcludingTaxCents: null,
    taxAmountCents: null,
    totalIncludingTaxCents: null,
    stripeInvoiceId: null,
    stripeInvoiceNumber: null,
    sourceLicenseId: '00000000-0000-4000-8000-000000000101',
    renewalOfLicenseId: null,
    resultingLicenseId: null,
    grossAmountCents: 10_000,
    amountPaidCents: 0,
    amountRefundedCents: 0,
    refundableRemainingCents: 0,
    refundStatus: 'not_refunded',
    lastRefundAt: null,
    disputeStatus: 'none',
    createdAt: '2026-08-06T10:00:00.000Z',
    paidAt: null,
    ...overrides,
  };
}

function checkout(overrides: Partial<VerifiedCheckoutSnapshot> = {}): VerifiedCheckoutSnapshot {
  return {
    id: 'cs_test_expected',
    livemode: false,
    mode: 'payment',
    paymentStatus: 'paid',
    amountTotalCents: 10_000,
    currency: 'eur',
    priceId: 'price_particular_6m',
    quantity: 1,
    paymentIntentId: 'pi_test_paid',
    chargeId: 'ch_test_paid',
    customerId: 'cus_expected',
    taxCountry: 'ES',
    taxRateId: 'txr_es_iva_21',
    taxPercentage: 21,
    taxInclusive: true,
    taxRateLivemode: false,
    subtotalExcludingTaxCents: 8_264,
    taxAmountCents: 1_736,
    totalIncludingTaxCents: 10_000,
    invoiceId: 'in_test_paid',
    invoiceNumber: 'MPR-0001',
    invoiceStatus: 'paid',
    invoiceCurrency: 'eur',
    invoiceCountry: 'ES',
    invoiceTaxRateId: 'txr_es_iva_21',
    invoiceTaxBehavior: 'inclusive',
    invoiceSubtotalExcludingTaxCents: 8_264,
    invoiceTaxAmountCents: 1_736,
    invoiceTotalIncludingTaxCents: 10_000,
    ...overrides,
  };
}

function state(overrides: Partial<PaymentReducerState> = {}): PaymentReducerState {
  return {
    purchase: purchase(),
    processedEventIds: [],
    accessAction: 'none',
    ...overrides,
  };
}

describe('trusted Checkout validation', () => {
  it('accepts only the server-recorded session, price, amount and currency', () => {
    assert.deepEqual(validateCompletedCheckout(purchase(), checkout()), { valid: true, reason: null });
  });

  it('rejects every client-manipulable monetary field', () => {
    const cases: Array<[Partial<VerifiedCheckoutSnapshot>, string]> = [
      [{ amountTotalCents: 1 }, 'amount_mismatch'],
      [{ currency: 'usd' }, 'currency_mismatch'],
      [{ priceId: 'price_professional_12m' }, 'price_mismatch'],
      [{ id: 'cs_test_attacker' }, 'checkout_session_mismatch'],
      [{ quantity: 2 }, 'line_items_mismatch'],
      [{ mode: 'subscription' }, 'checkout_mode_mismatch'],
      [{ livemode: true }, 'live_event_not_allowed'],
      [{ taxCountry: 'FR' }, 'country_mismatch'],
      [{ taxCountry: null }, 'country_mismatch'],
      [{ taxRateId: 'txr_wrong' }, 'tax_rate_mismatch'],
      [{ taxRateId: null }, 'tax_rate_mismatch'],
      [{ taxPercentage: 10 }, 'tax_percentage_mismatch'],
      [{ taxInclusive: false }, 'tax_behavior_mismatch'],
      [{ taxAmountCents: 1_735 }, 'tax_breakdown_mismatch'],
      [{ invoiceId: null }, 'invoice_missing'],
      [{ invoiceStatus: 'open' }, 'invoice_mismatch'],
      [{ invoiceTaxRateId: 'txr_wrong' }, 'invoice_mismatch'],
      [{ invoiceTaxBehavior: 'exclusive' }, 'invoice_mismatch'],
    ];
    for (const [tampering, reason] of cases) {
      assert.deepEqual(
        validateCompletedCheckout(purchase(), checkout(tampering)),
        { valid: false, reason },
      );
    }
  });
});

describe('idempotent payment event state machine', () => {
  it('activates exactly once and treats a repeated webhook ID as a no-op', () => {
    const first = reduceTrustedPaymentEvent(state(), {
      id: 'evt_checkout_1', kind: 'checkout_paid', checkout: checkout(),
    });
    assert.equal(first.accepted, true);
    assert.equal(first.accessAction, 'activate');
    assert.equal(first.purchase.status, 'paid');

    const repeated = reduceTrustedPaymentEvent(first, {
      id: 'evt_checkout_1', kind: 'checkout_paid', checkout: checkout(),
    });
    assert.equal(repeated.duplicate, true);
    assert.equal(repeated.accessAction, 'none');
    assert.equal(repeated.processedEventIds.length, 1);
  });

  it('does not reactivate for a second successful Stripe event', () => {
    const first = reduceTrustedPaymentEvent(state(), {
      id: 'evt_completed', kind: 'checkout_paid', checkout: checkout(),
    });
    const asynchronous = reduceTrustedPaymentEvent(first, {
      id: 'evt_async', kind: 'checkout_paid', checkout: checkout(),
    });
    assert.equal(asynchronous.accepted, true);
    assert.equal(asynchronous.accessAction, 'none');
    assert.equal(asynchronous.processedEventIds.length, 2);
  });

  it('applies a refund and removes access', () => {
    const paid = state({
      purchase: purchase({ status: 'paid', paymentIntentId: 'pi_test_paid' }),
    });
    const refunded = reduceTrustedPaymentEvent(paid, {
      id: 'evt_refund', kind: 'refund', paymentIntentId: 'pi_test_paid',
    });
    assert.equal(refunded.accepted, true);
    assert.equal(refunded.purchase.status, 'refunded');
    assert.equal(refunded.accessAction, 'refund');

    const repeatedWithNewEventId = reduceTrustedPaymentEvent(refunded, {
      id: 'evt_refund_retry', kind: 'refund', paymentIntentId: 'pi_test_paid',
    });
    assert.equal(repeatedWithNewEventId.duplicate, true);
    assert.equal(repeatedWithNewEventId.accessAction, 'none');
  });

  it('prevents out-of-order activation after a refund', () => {
    const refunded = reduceTrustedPaymentEvent(state(), {
      id: 'evt_refund_first', kind: 'refund', paymentIntentId: 'pi_test_paid',
    });
    assert.equal(refunded.purchase.status, 'refunded');
    const latePayment = reduceTrustedPaymentEvent(refunded, {
      id: 'evt_checkout_late', kind: 'checkout_paid', checkout: checkout(),
    });
    assert.equal(latePayment.accepted, false);
    assert.equal(latePayment.reason, 'payment_arrived_after_reversal');
    assert.equal(latePayment.accessAction, 'none');
  });

  it('rejects a reversal for another PaymentIntent', () => {
    const paid = state({
      purchase: purchase({ status: 'paid', paymentIntentId: 'pi_test_paid' }),
    });
    const result = reduceTrustedPaymentEvent(paid, {
      id: 'evt_bad_refund', kind: 'refund', paymentIntentId: 'pi_attacker',
    });
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'payment_intent_mismatch');
    assert.equal(result.purchase.status, 'paid');
  });
});
