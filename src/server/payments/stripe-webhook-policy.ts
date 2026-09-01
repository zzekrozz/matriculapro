export type StripeWebhookAction =
  | 'checkout_payment'
  | 'invoice_payment'
  | 'checkout_expiration'
  | 'refund'
  | 'dispute'
  | 'ignore';

export function stripeWebhookAction(eventType: string): StripeWebhookAction {
  if (
    eventType === 'checkout.session.completed'
    || eventType === 'checkout.session.async_payment_succeeded'
  ) return 'checkout_payment';
  if (eventType === 'invoice.paid') return 'invoice_payment';
  if (eventType === 'checkout.session.expired') return 'checkout_expiration';
  if (eventType === 'charge.refunded' || eventType === 'refund.updated') return 'refund';
  if (
    eventType === 'charge.dispute.created'
    || eventType === 'charge.dispute.updated'
    || eventType === 'charge.dispute.closed'
  ) return 'dispute';
  return 'ignore';
}

export interface PaidInvoicePaymentReference {
  status: string;
  payment: {
    type: string;
    payment_intent?: string | { id: string } | null;
  };
}

export interface InvoicePaymentIntentResolution {
  paymentIntentId: string | null;
  reason: 'invoice_payment_intent_missing' | 'invoice_payment_intent_ambiguous' | null;
}

export function checkoutFailureRequiresStripeRetry(
  reason: string | null,
  invoiceStatus: string | null,
): boolean {
  return reason === 'invoice_missing'
    || (reason === 'invoice_mismatch' && invoiceStatus !== 'paid');
}

export function resolvePaidInvoicePaymentIntent(
  payments: readonly PaidInvoicePaymentReference[],
): InvoicePaymentIntentResolution {
  const paymentIntentIds = new Set<string>();
  for (const invoicePayment of payments) {
    if (invoicePayment.status !== 'paid' || invoicePayment.payment.type !== 'payment_intent') continue;
    const value = invoicePayment.payment.payment_intent;
    const paymentIntentId = typeof value === 'string' ? value : value?.id;
    if (paymentIntentId) paymentIntentIds.add(paymentIntentId);
  }
  if (paymentIntentIds.size === 0) {
    return { paymentIntentId: null, reason: 'invoice_payment_intent_missing' };
  }
  if (paymentIntentIds.size !== 1) {
    return { paymentIntentId: null, reason: 'invoice_payment_intent_ambiguous' };
  }
  return { paymentIntentId: [...paymentIntentIds][0], reason: null };
}
