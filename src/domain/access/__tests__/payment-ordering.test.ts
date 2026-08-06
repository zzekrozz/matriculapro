import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decidePaymentActivation,
  webhookPersistenceDecision,
  type PaymentIdentity,
  type PendingReversal,
} from '..';

const payment: PaymentIdentity = {
  purchaseId: 'purchase-1', paymentIntentId: 'pi_1', chargeId: 'ch_1',
  checkoutSessionId: 'cs_test_1', invoiceId: 'in_1', customerId: 'cus_1',
  amountPaidCents: 10_000, currency: 'EUR',
};
const refund = (overrides: Partial<PendingReversal> = {}): PendingReversal => ({
  eventId: 'evt_refund', occurredAt: '2026-08-06T10:00:00.000Z',
  kind: 'refund', paymentIntentId: 'pi_1', amountRefundedCents: 10_000,
  chargeAmountCents: 10_000, currency: 'eur', ...overrides,
} as PendingReversal);
const dispute = (status: 'warning' | 'open' | 'won' | 'lost', overrides: Partial<PendingReversal> = {}): PendingReversal => ({
  eventId: `evt_${status}`, occurredAt: '2026-08-06T10:00:00.000Z',
  kind: 'dispute', paymentIntentId: 'pi_1', disputeId: 'dp_1', status, ...overrides,
} as PendingReversal);

describe('out-of-order payment reversals', () => {
  it('blocks a full refund received before payment', () => {
    assert.equal(decidePaymentActivation(payment, [refund()]).action, 'block_refund');
  });
  it('keeps current access policy for a partial refund and raises an incident', () => {
    assert.equal(decidePaymentActivation(payment, [refund({ amountRefundedCents: 5_000 })]).action, 'activate_with_incident');
  });
  it('blocks an open dispute', () => assert.equal(decidePaymentActivation(payment, [dispute('open')]).action, 'block_dispute'));
  it('blocks a lost dispute', () => assert.equal(decidePaymentActivation(payment, [dispute('lost')]).action, 'block_dispute'));
  it('allows a won dispute', () => assert.equal(decidePaymentActivation(payment, [dispute('won')]).reason, 'dispute_won'));
  it('allows a warning under the current policy', () => assert.equal(decidePaymentActivation(payment, [dispute('warning')]).action, 'activate'));
  it('deduplicates the same Stripe event ID', () => {
    const item = refund({ amountRefundedCents: 2_000 });
    assert.deepEqual(decidePaymentActivation(payment, [item, item]).matchedEventIds, ['evt_refund']);
  });
  it('reviews a reused event ID with another payload', () => {
    assert.equal(decidePaymentActivation(payment, [refund(), refund({ amountRefundedCents: 1 })]).reason, 'event_identity_collision');
  });
  it('matches first by PaymentIntent', () => assert.equal(decidePaymentActivation(payment, [refund()]).matchBases.evt_refund, 'payment_intent'));
  it('falls back to Charge', () => assert.equal(decidePaymentActivation(payment, [refund({ paymentIntentId: null, chargeId: 'ch_1' })]).matchBases.evt_refund, 'charge'));
  it('falls back to Checkout Session', () => assert.equal(decidePaymentActivation(payment, [refund({ paymentIntentId: null, checkoutSessionId: 'cs_test_1' })]).matchBases.evt_refund, 'checkout_session'));
  it('falls back to Invoice', () => assert.equal(decidePaymentActivation(payment, [refund({ paymentIntentId: null, invoiceId: 'in_1' })]).matchBases.evt_refund, 'invoice'));
  it('falls back to a validated internal purchase', () => assert.equal(decidePaymentActivation(payment, [refund({ paymentIntentId: null, purchaseId: 'purchase-1' })]).matchBases.evt_refund, 'purchase'));
  it('never matches by Customer alone', () => assert.deepEqual(decidePaymentActivation(payment, [refund({ paymentIntentId: null, customerId: 'cus_1' })]).matchedEventIds, []));
  it('reviews a conflicting strong identifier instead of falling through', () => assert.equal(decidePaymentActivation(payment, [refund({ paymentIntentId: 'pi_other', chargeId: 'ch_1' })]).action, 'review'));
  it('uses chronological dispute state so open followed by won can activate', () => {
    const decision = decidePaymentActivation(payment, [
      dispute('won', { occurredAt: '2026-08-06T11:00:00.000Z' }),
      dispute('open', { occurredAt: '2026-08-06T10:00:00.000Z' }),
    ]);
    assert.equal(decision.action, 'activate');
    assert.equal(decision.reason, 'dispute_won');
  });
  it('uses chronological dispute state so a later open still blocks', () => {
    const decision = decidePaymentActivation(payment, [
      dispute('won', { occurredAt: '2026-08-06T10:00:00.000Z' }),
      dispute('open', { occurredAt: '2026-08-06T11:00:00.000Z' }),
    ]);
    assert.equal(decision.action, 'block_dispute');
  });
  it('uses cumulative refund values instead of adding webhook totals', () => {
    const decision = decidePaymentActivation(payment, [
      refund({ eventId: 'evt_1', amountRefundedCents: 2_500 }),
      refund({ eventId: 'evt_2', amountRefundedCents: 7_500 }),
    ]);
    assert.equal(decision.action, 'activate_with_incident');
  });
  it('blocks after a partial refund is followed by a cumulative full refund', () => {
    const decision = decidePaymentActivation(payment, [
      refund({ eventId: 'evt_partial_first', amountRefundedCents: 2_500 }),
      refund({ eventId: 'evt_full_later', amountRefundedCents: 10_000 }),
    ]);
    assert.equal(decision.action, 'block_refund');
  });
  it('reviews a refund above the Charge amount', () => {
    assert.equal(decidePaymentActivation(payment, [
      refund({ amountRefundedCents: 10_001 }),
    ]).reason, 'refund_amount_or_currency_mismatch');
  });
  it('reviews a refund in another currency', () => {
    assert.equal(decidePaymentActivation(payment, [
      refund({ currency: 'usd' }),
    ]).action, 'review');
  });
  it('returns a retriable failure until durable persistence succeeds', () => {
    assert.deepEqual(webhookPersistenceDecision(false), { httpStatus: 500, retry: true });
    assert.deepEqual(webhookPersistenceDecision(true), { httpStatus: 200, retry: false });
  });
});
