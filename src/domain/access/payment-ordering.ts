export type ReversalMatchBasis =
  | 'payment_intent'
  | 'charge'
  | 'checkout_session'
  | 'invoice'
  | 'purchase';

export interface PaymentIdentity {
  purchaseId: string;
  paymentIntentId: string;
  chargeId: string;
  checkoutSessionId: string;
  invoiceId: string;
  customerId: string;
  amountPaidCents: number;
  currency: string;
}

interface ReversalBase {
  eventId: string;
  occurredAt: string;
  paymentIntentId?: string | null;
  chargeId?: string | null;
  checkoutSessionId?: string | null;
  invoiceId?: string | null;
  purchaseId?: string | null;
  customerId?: string | null;
}

export type PendingReversal = ReversalBase & (
  | { kind: 'refund'; amountRefundedCents: number; chargeAmountCents: number; currency: string }
  | { kind: 'dispute'; disputeId: string; status: 'warning' | 'open' | 'won' | 'lost' }
);

export interface PaymentOrderingDecision {
  action: 'activate' | 'activate_with_incident' | 'block_refund' | 'block_dispute' | 'review';
  reason: string;
  matchedEventIds: readonly string[];
  matchBases: Readonly<Record<string, ReversalMatchBasis>>;
}

export function webhookPersistenceDecision(persisted: boolean): {
  httpStatus: 200 | 500;
  retry: boolean;
} {
  return persisted ? { httpStatus: 200, retry: false } : { httpStatus: 500, retry: true };
}

function signature(reversal: PendingReversal): string {
  return JSON.stringify(reversal);
}

function matchBasis(
  payment: PaymentIdentity,
  reversal: PendingReversal,
): ReversalMatchBasis | 'identity_conflict' | null {
  if (reversal.paymentIntentId) {
    return reversal.paymentIntentId === payment.paymentIntentId
      ? 'payment_intent' : 'identity_conflict';
  }
  if (reversal.chargeId) {
    return reversal.chargeId === payment.chargeId ? 'charge' : 'identity_conflict';
  }
  if (reversal.checkoutSessionId) {
    return reversal.checkoutSessionId === payment.checkoutSessionId
      ? 'checkout_session' : 'identity_conflict';
  }
  if (reversal.invoiceId) {
    return reversal.invoiceId === payment.invoiceId ? 'invoice' : 'identity_conflict';
  }
  if (reversal.purchaseId) {
    return reversal.purchaseId === payment.purchaseId ? 'purchase' : 'identity_conflict';
  }
  // Customer is auxiliary and can never authorize a match by itself.
  return null;
}

export function decidePaymentActivation(
  payment: PaymentIdentity,
  reversals: readonly PendingReversal[],
): PaymentOrderingDecision {
  const unique = new Map<string, PendingReversal>();
  for (const reversal of reversals) {
    const previous = unique.get(reversal.eventId);
    if (previous && signature(previous) !== signature(reversal)) {
      return { action: 'review', reason: 'event_identity_collision', matchedEventIds: [], matchBases: {} };
    }
    unique.set(reversal.eventId, reversal);
  }

  const ordered = [...unique.values()].sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId)
  ));
  const matched: PendingReversal[] = [];
  const matchBases: Record<string, ReversalMatchBasis> = {};
  for (const reversal of ordered) {
    const basis = matchBasis(payment, reversal);
    if (basis === 'identity_conflict') {
      return { action: 'review', reason: 'conflicting_strong_identifier', matchedEventIds: [], matchBases: {} };
    }
    if (basis) {
      matched.push(reversal);
      matchBases[reversal.eventId] = basis;
    }
  }

  let refundedCents = 0;
  let latestDispute: Extract<PendingReversal, { kind: 'dispute' }> | null = null;
  for (const reversal of matched) {
    if (reversal.kind === 'refund') {
      if (
        reversal.chargeAmountCents !== payment.amountPaidCents
        || reversal.currency.toUpperCase() !== payment.currency.toUpperCase()
        || reversal.amountRefundedCents > reversal.chargeAmountCents
      ) {
        return {
          action: 'review', reason: 'refund_amount_or_currency_mismatch',
          matchedEventIds: matched.map(({ eventId }) => eventId), matchBases,
        };
      }
      refundedCents = Math.max(refundedCents, reversal.amountRefundedCents);
    } else {
      latestDispute = reversal;
    }
  }

  const matchedEventIds = matched.map(({ eventId }) => eventId);
  if (refundedCents >= payment.amountPaidCents) {
    return { action: 'block_refund', reason: 'fully_refunded_before_activation', matchedEventIds, matchBases };
  }
  if (latestDispute?.status === 'open' || latestDispute?.status === 'lost') {
    return { action: 'block_dispute', reason: 'dispute_before_activation', matchedEventIds, matchBases };
  }
  if (refundedCents > 0) {
    return { action: 'activate_with_incident', reason: 'partially_refunded', matchedEventIds, matchBases };
  }
  return {
    action: 'activate',
    reason: latestDispute?.status === 'won' ? 'dispute_won' : latestDispute?.status ?? 'no_reversal',
    matchedEventIds,
    matchBases,
  };
}
