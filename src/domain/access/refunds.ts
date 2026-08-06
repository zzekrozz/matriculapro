import type { PaymentDisputeStatus, PurchaseRefundStatus } from './types';

export interface PurchaseRefundData {
  grossAmountCents: number;
  amountPaidCents: number;
  amountRefundedCents: number;
  refundableRemainingCents: number;
  refundStatus: PurchaseRefundStatus;
  lastRefundAt: string | null;
}

export interface CumulativeRefundResult extends PurchaseRefundData {
  accepted: boolean;
  duplicateOrStale: boolean;
  revokeAccess: boolean;
  createIncident: boolean;
  reason: 'partial_refund' | 'full_refund' | 'stale_refund_event' | 'refund_exceeds_payment' | 'invalid_refund_amount';
}

export function applyCumulativeRefund(input: {
  current: PurchaseRefundData;
  stripeAmountRefundedCents: number;
  eventCreatedAt: string;
}): CumulativeRefundResult {
  const { current } = input;
  const eventTime = Date.parse(input.eventCreatedAt);
  if (!Number.isSafeInteger(input.stripeAmountRefundedCents)
      || input.stripeAmountRefundedCents < 0
      || !Number.isFinite(eventTime)) {
    return { ...current, accepted: false, duplicateOrStale: false, revokeAccess: false, createIncident: true, reason: 'invalid_refund_amount' };
  }
  if (input.stripeAmountRefundedCents > current.amountPaidCents) {
    return { ...current, accepted: false, duplicateOrStale: false, revokeAccess: false, createIncident: true, reason: 'refund_exceeds_payment' };
  }
  const lastTime = current.lastRefundAt ? Date.parse(current.lastRefundAt) : Number.NEGATIVE_INFINITY;
  if (eventTime < lastTime || input.stripeAmountRefundedCents <= current.amountRefundedCents) {
    return { ...current, accepted: true, duplicateOrStale: true, revokeAccess: current.refundStatus === 'fully_refunded', createIncident: false, reason: 'stale_refund_event' };
  }
  const fullyRefunded = input.stripeAmountRefundedCents >= current.amountPaidCents;
  return {
    ...current,
    amountRefundedCents: input.stripeAmountRefundedCents,
    refundableRemainingCents: Math.max(current.amountPaidCents - input.stripeAmountRefundedCents, 0),
    refundStatus: fullyRefunded ? 'fully_refunded' : 'partially_refunded',
    lastRefundAt: new Date(eventTime).toISOString(),
    accepted: true,
    duplicateOrStale: false,
    revokeAccess: fullyRefunded,
    createIncident: !fullyRefunded,
    reason: fullyRefunded ? 'full_refund' : 'partial_refund',
  };
}

export function stripeDisputeStatus(status: string): Exclude<PaymentDisputeStatus, 'none'> {
  if (status === 'won' || status === 'warning_closed' || status === 'prevented') return 'won';
  if (status === 'lost') return 'lost';
  if (status.startsWith('warning_')) return 'warning';
  return 'open';
}
