import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { decidePaymentActivation, type PaymentIdentity, type PendingReversal } from '../../src/domain/access/payment-ordering';

const payment: PaymentIdentity = {
  purchaseId: 'purchase_fixture', paymentIntentId: 'pi_fixture', chargeId: 'ch_fixture',
  checkoutSessionId: 'cs_test_fixture', invoiceId: 'in_fixture', customerId: 'cus_fixture',
  amountPaidCents: 17_900, currency: 'EUR',
};
const base = { paymentIntentId: 'pi_fixture', occurredAt: '2026-08-06T10:00:00.000Z' };
const fixtures: Array<[string, PendingReversal[], string]> = [
  ['full refund before checkout', [{ ...base, eventId: 'evt_full', kind: 'refund', amountRefundedCents: 17_900, chargeAmountCents: 17_900, currency: 'eur' }], 'block_refund'],
  ['partial refund before checkout', [{ ...base, eventId: 'evt_partial', kind: 'refund', amountRefundedCents: 1_000, chargeAmountCents: 17_900, currency: 'eur' }], 'activate_with_incident'],
  ['open dispute before checkout', [{ ...base, eventId: 'evt_open', kind: 'dispute', disputeId: 'dp_fixture', status: 'open' }], 'block_dispute'],
  ['won dispute before checkout', [{ ...base, eventId: 'evt_won', kind: 'dispute', disputeId: 'dp_fixture', status: 'won' }], 'activate'],
  ['Customer-only event does not match', [{ eventId: 'evt_customer', occurredAt: base.occurredAt, customerId: 'cus_fixture', kind: 'refund', amountRefundedCents: 17_900, chargeAmountCents: 17_900, currency: 'eur' }], 'activate'],
];

for (const [name, reversals, expected] of fixtures) {
  const result = decidePaymentActivation(payment, reversals);
  assert.equal(result.action, expected, name);
  console.log(`PASS ${name}: ${result.action}`);
}
const stripe = new Stripe('sk_test_fixture_only_not_a_real_secret');
const fixtureSecret = 'whsec_fixture_only_not_a_real_secret';
for (const [id, type] of [
  ['evt_signed_refund', 'charge.refunded'],
  ['evt_signed_dispute', 'charge.dispute.created'],
  ['evt_signed_checkout', 'checkout.session.completed'],
] as const) {
  const payload = JSON.stringify({
    id, object: 'event', api_version: null, created: 1_786_003_200,
    data: { object: { id: `${id}_object`, object: 'fixture' } },
    livemode: false, pending_webhooks: 1, request: null, type,
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: fixtureSecret });
  assert.equal(stripe.webhooks.constructEvent(payload, header, fixtureSecret).id, id);
}
console.log('Signed Stripe fixtures: refund, dispute and checkout verified.');
console.log(`Payment ordering E2E fixtures: ${fixtures.length}/${fixtures.length} passed.`);
