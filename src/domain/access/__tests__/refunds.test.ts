import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyCumulativeRefund, stripeDisputeStatus } from '..';

const CURRENT = {
  grossAmountCents: 17_900,
  amountPaidCents: 17_900,
  amountRefundedCents: 0,
  refundableRemainingCents: 17_900,
  refundStatus: 'not_refunded' as const,
  lastRefundAt: null,
};

describe('cumulative Stripe refunds', () => {
  it('keeps access for one euro and 50 percent partial refunds', () => {
    for (const amount of [100, 8_950]) {
      const result = applyCumulativeRefund({
        current: CURRENT, stripeAmountRefundedCents: amount,
        eventCreatedAt: '2026-08-05T10:00:00.000Z',
      });
      assert.equal(result.refundStatus, 'partially_refunded');
      assert.equal(result.revokeAccess, false);
      assert.equal(result.createIncident, true);
    }
  });

  it('accumulates two partial refunds and revokes only when they reach the total', () => {
    const first = applyCumulativeRefund({
      current: CURRENT, stripeAmountRefundedCents: 8_000,
      eventCreatedAt: '2026-08-05T10:00:00.000Z',
    });
    const second = applyCumulativeRefund({
      current: first, stripeAmountRefundedCents: 17_800,
      eventCreatedAt: '2026-08-05T11:00:00.000Z',
    });
    assert.equal(second.refundStatus, 'partially_refunded');
    const full = applyCumulativeRefund({
      current: second, stripeAmountRefundedCents: 17_900,
      eventCreatedAt: '2026-08-05T12:00:00.000Z',
    });
    assert.equal(full.refundStatus, 'fully_refunded');
    assert.equal(full.revokeAccess, true);
    assert.equal(full.refundableRemainingCents, 0);
  });

  it('accepts a direct full refund and two cumulative refund objects reaching the total', () => {
    const direct = applyCumulativeRefund({
      current: CURRENT, stripeAmountRefundedCents: 17_900,
      eventCreatedAt: '2026-08-05T10:00:00.000Z',
    });
    assert.equal(direct.refundStatus, 'fully_refunded');
    assert.equal(direct.revokeAccess, true);

    const first = applyCumulativeRefund({
      current: CURRENT, stripeAmountRefundedCents: 8_000,
      eventCreatedAt: '2026-08-05T11:00:00.000Z',
    });
    const second = applyCumulativeRefund({
      current: first, stripeAmountRefundedCents: 17_900,
      eventCreatedAt: '2026-08-05T12:00:00.000Z',
    });
    assert.equal(second.refundStatus, 'fully_refunded');
    assert.equal(second.revokeAccess, true);
  });

  it('ignores duplicate and older cumulative events', () => {
    const current = { ...CURRENT, amountRefundedCents: 8_000, refundableRemainingCents: 9_900,
      refundStatus: 'partially_refunded' as const, lastRefundAt: '2026-08-05T11:00:00.000Z' };
    for (const eventCreatedAt of ['2026-08-05T11:00:00.000Z', '2026-08-05T10:00:00.000Z']) {
      const result = applyCumulativeRefund({ current, stripeAmountRefundedCents: 8_000, eventCreatedAt });
      assert.equal(result.duplicateOrStale, true);
    }
  });

  it('opens an inconsistency instead of accepting more than paid', () => {
    const result = applyCumulativeRefund({
      current: CURRENT, stripeAmountRefundedCents: 17_901,
      eventCreatedAt: '2026-08-05T10:00:00.000Z',
    });
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'refund_exceeds_payment');
    assert.equal(result.createIncident, true);
  });
});

describe('Stripe dispute projection', () => {
  it('distinguishes warning, open, won and lost', () => {
    assert.equal(stripeDisputeStatus('warning_needs_response'), 'warning');
    assert.equal(stripeDisputeStatus('needs_response'), 'open');
    assert.equal(stripeDisputeStatus('won'), 'won');
    assert.equal(stripeDisputeStatus('lost'), 'lost');
  });
});
