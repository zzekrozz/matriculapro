import 'server-only';
import { createHash } from 'node:crypto';
import type Stripe from 'stripe';
import { stripeDisputeStatus, validateCompletedCheckout } from '@/domain/access';
import { getStripeTestConfiguration } from '@/lib/payments/stripe-test-config';
import {
  applyCheckoutExpiration,
  applyVerifiedCheckoutPayment,
  applyVerifiedDispute,
  applyVerifiedRefund,
  getPurchaseByCheckoutSession,
  getPurchaseByPaymentIntent,
  markPaymentEventFailed,
  recordIgnoredPaymentEvent,
  recordPaymentIncident,
  recordPaymentEventReceipt,
  markPendingPaymentReversalApplied,
  storePendingPaymentReversal,
} from './access-payment-repository';
import { getStripeTestClient } from './stripe-test-client';
import { notifyPaymentIncident } from './payment-incident-alert';
import { retrieveVerifiedCheckoutSnapshot } from './stripe-checkout-receipt';

export interface WebhookHandlingResult {
  httpStatus: 200 | 400;
  received: boolean;
  processed: boolean;
  duplicate: boolean;
  reason: string | null;
}

function objectId(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === 'string') return value;
  return value?.id ?? null;
}

function eventCreatedAt(event: Stripe.Event): string {
  return new Date(event.created * 1_000).toISOString();
}

function chargeInvoiceId(charge: Stripe.Charge): string | null {
  const value = (charge as Stripe.Charge & {
    invoice?: string | { id: string } | null;
  }).invoice;
  return objectId(value);
}

function logWebhookCorrelation(fields: Record<string, string | boolean | null>): void {
  console.info(JSON.stringify({ scope: 'stripe_webhook', ...fields }));
}

async function ignored(input: {
  event: Stripe.Event;
  payloadSha256: string;
  reason: string;
  purchaseId?: string | null;
}): Promise<WebhookHandlingResult> {
  const result = await recordIgnoredPaymentEvent({
    providerEventId: input.event.id,
    eventType: input.event.type,
    eventCreatedAt: eventCreatedAt(input.event),
    payloadSha256: input.payloadSha256,
    reason: input.reason,
    purchaseId: input.purchaseId,
  });
  return {
    httpStatus: 200,
    received: true,
    processed: false,
    duplicate: result.duplicate,
    reason: input.reason,
  };
}

async function processCheckoutEvent(
  event: Stripe.Event,
  payloadSha256: string,
): Promise<WebhookHandlingResult> {
  const eventSession = event.data.object as Stripe.Checkout.Session;
  const { session, checkout } = await retrieveVerifiedCheckoutSnapshot(eventSession.id);
  const purchase = await getPurchaseByCheckoutSession(session.id);
  if (!purchase) {
    await recordPaymentIncident({
      stripeEventId: event.id,
      kind: 'paid_without_license',
      details: { reason: 'unknown_checkout_session' },
      checkoutSessionId: session.id,
      paymentIntentId: objectId(session.payment_intent),
      customerId: objectId(session.customer),
    });
    await notifyPaymentIncident({
      stripeEventId: event.id, kind: 'paid_without_license', reason: 'unknown_checkout_session',
    });
    return ignored({ event, payloadSha256, reason: 'unknown_checkout_session' });
  }

  // Structural checks remain mandatory for retries after a purchase is already paid.
  const validation = validateCompletedCheckout({ ...purchase, status: 'pending' }, checkout);
  if (
    !validation.valid || !checkout.paymentIntentId || !checkout.chargeId || !checkout.priceId
    || !checkout.customerId || !checkout.taxCountry || checkout.amountTotalCents === null
    || !checkout.taxRateId || checkout.taxPercentage === null
    || checkout.taxInclusive !== true
    || checkout.subtotalExcludingTaxCents === null || checkout.taxAmountCents === null
    || checkout.totalIncludingTaxCents === null || !checkout.invoiceId
    || !checkout.invoiceNumber || !checkout.invoiceStatus || !checkout.invoiceCountry
    || !checkout.invoiceCurrency || !checkout.invoiceTaxRateId
    || checkout.invoiceTaxBehavior !== 'inclusive'
    || checkout.invoiceSubtotalExcludingTaxCents === null
    || checkout.invoiceTaxAmountCents === null || checkout.invoiceTotalIncludingTaxCents === null
  ) {
    const kindByReason: Record<string, string> = {
      amount_mismatch: 'amount_mismatch',
      currency_mismatch: 'currency_mismatch',
      country_mismatch: 'country_mismatch',
      customer_mismatch: 'customer_mismatch',
      price_mismatch: 'unknown_price',
      tax_rate_mismatch: 'tax_mismatch',
      tax_percentage_mismatch: 'tax_mismatch',
      tax_behavior_mismatch: 'tax_mismatch',
      tax_breakdown_mismatch: 'tax_mismatch',
      invoice_missing: 'invoice_mismatch',
      invoice_mismatch: 'invoice_mismatch',
    };
    await recordPaymentIncident({
      stripeEventId: event.id,
      kind: kindByReason[validation.reason ?? ''] ?? 'paid_without_license',
      details: {
        reason: validation.reason ?? 'incomplete_checkout_snapshot',
        expected: {
          priceId: purchase.expectedPriceId,
          amountTotalCents: purchase.amountDueCents,
          currency: purchase.currency,
          customerId: purchase.stripeCustomerId,
          country: 'ES',
          taxRateId: purchase.expectedStripeTaxRateId,
          taxPercentage: 21,
          taxBehavior: 'inclusive',
          subtotalExcludingTaxCents: purchase.amountDueBaseCents,
          taxAmountCents: purchase.amountDueVatCents,
        },
        received: {
          priceId: checkout.priceId,
          amountTotalCents: checkout.amountTotalCents,
          currency: checkout.currency,
          customerId: checkout.customerId,
          country: checkout.taxCountry,
          taxRateId: checkout.taxRateId,
          taxPercentage: checkout.taxPercentage,
          taxInclusive: checkout.taxInclusive,
          subtotalExcludingTaxCents: checkout.subtotalExcludingTaxCents,
          taxAmountCents: checkout.taxAmountCents,
          invoiceId: checkout.invoiceId,
          invoiceNumber: checkout.invoiceNumber,
          invoiceStatus: checkout.invoiceStatus,
          invoiceTaxRateId: checkout.invoiceTaxRateId,
          invoiceTaxBehavior: checkout.invoiceTaxBehavior,
        },
      },
      userId: purchase.userId,
      purchaseId: purchase.id,
      checkoutSessionId: session.id,
      paymentIntentId: checkout.paymentIntentId,
      customerId: checkout.customerId,
    });
    await notifyPaymentIncident({
      stripeEventId: event.id,
      kind: kindByReason[validation.reason ?? ''] ?? 'paid_without_license',
      purchaseId: purchase.id,
      reason: validation.reason ?? 'incomplete_checkout_snapshot',
    });
    return ignored({
      event,
      payloadSha256,
      purchaseId: purchase.id,
      reason: validation.reason ?? 'incomplete_checkout_snapshot',
    });
  }

  const transition = await applyVerifiedCheckoutPayment({
    providerEventId: event.id,
    eventType: event.type,
    eventCreatedAt: eventCreatedAt(event),
    payloadSha256,
    purchase,
    checkoutSessionId: checkout.id,
    paymentIntentId: checkout.paymentIntentId,
    chargeId: checkout.chargeId,
    priceId: checkout.priceId,
    amountTotalCents: checkout.amountTotalCents,
    currency: checkout.currency ?? '',
    customerId: checkout.customerId,
    country: checkout.taxCountry,
    taxRateId: checkout.taxRateId,
    taxPercentage: checkout.taxPercentage,
    taxBehavior: 'inclusive',
    subtotalExcludingTaxCents: checkout.subtotalExcludingTaxCents,
    taxAmountCents: checkout.taxAmountCents,
    totalIncludingTaxCents: checkout.totalIncludingTaxCents,
    invoiceId: checkout.invoiceId,
    invoiceNumber: checkout.invoiceNumber,
    invoiceStatus: checkout.invoiceStatus,
    invoiceCountry: checkout.invoiceCountry,
    invoiceCurrency: checkout.invoiceCurrency,
    invoiceTaxRateId: checkout.invoiceTaxRateId,
    invoiceTaxBehavior: 'inclusive',
    invoiceSubtotalExcludingTaxCents: checkout.invoiceSubtotalExcludingTaxCents,
    invoiceTaxAmountCents: checkout.invoiceTaxAmountCents,
    invoiceTotalIncludingTaxCents: checkout.invoiceTotalIncludingTaxCents,
  });
  logWebhookCorrelation({
    eventId: event.id, eventType: event.type, purchaseId: purchase.id,
    paymentIntentId: checkout.paymentIntentId, chargeId: checkout.chargeId,
    processed: transition.processed, reason: transition.reason,
  });
  if (
    !transition.processed
    || transition.reason === 'fully_refunded_before_activation'
    || transition.reason === 'dispute_before_activation'
    || transition.reason === 'payment_reversal_requires_review'
  ) await notifyPaymentIncident({
    stripeEventId: event.id,
    kind: transition.reason === 'fully_refunded_before_activation'
      ? 'payment_fully_refunded_before_activation'
      : transition.reason === 'dispute_before_activation'
        ? 'payment_dispute_before_activation'
        : transition.reason === 'payment_reversal_requires_review'
          ? 'payment_reversal_ambiguous' : 'paid_without_license',
    purchaseId: purchase.id,
    reason: transition.reason ?? 'activation_failed',
  });
  return {
    httpStatus: 200,
    received: true,
    processed: transition.processed,
    duplicate: transition.duplicate,
    reason: transition.reason,
  };
}

async function processCheckoutExpiration(
  event: Stripe.Event,
  payloadSha256: string,
): Promise<WebhookHandlingResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  const purchase = await getPurchaseByCheckoutSession(session.id);
  if (!purchase) return ignored({ event, payloadSha256, reason: 'unknown_checkout_session' });

  const transition = await applyCheckoutExpiration({
    providerEventId: event.id,
    eventType: event.type,
    eventCreatedAt: eventCreatedAt(event),
    payloadSha256,
    purchaseId: purchase.id,
    checkoutSessionId: session.id,
  });
  return {
    httpStatus: 200,
    received: true,
    processed: transition.processed,
    duplicate: transition.duplicate,
    reason: transition.reason,
  };
}

async function chargeForDispute(dispute: Stripe.Dispute): Promise<Stripe.Charge | null> {
  const chargeId = objectId(dispute.charge);
  if (!chargeId) return null;
  return getStripeTestClient().charges.retrieve(chargeId);
}

async function purchaseForPaymentIntent(paymentIntentId: string) {
  const direct = await getPurchaseByPaymentIntent(paymentIntentId);
  if (direct) return direct;

  // Refund/dispute webhooks can be delivered before checkout.completed. Resolve
  // the Checkout Session from Stripe itself, never from event/client metadata.
  const sessions = await getStripeTestClient().checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 2,
  });
  if (sessions.data.length !== 1) return null;
  return getPurchaseByCheckoutSession(sessions.data[0].id);
}

async function chargeForRefundEvent(event: Stripe.Event): Promise<Stripe.Charge | null> {
  if (event.type === 'charge.refunded') return event.data.object as Stripe.Charge;
  const refund = event.data.object as Stripe.Refund;
  const chargeId = objectId(refund.charge);
  return chargeId ? getStripeTestClient().charges.retrieve(chargeId) : null;
}

async function processRefundEvent(
  event: Stripe.Event,
  payloadSha256: string,
): Promise<WebhookHandlingResult> {
  const charge = await chargeForRefundEvent(event);
  const paymentIntentId = objectId(charge?.payment_intent);
  const chargeId = charge?.id ?? null;
  if (!charge || !chargeId) throw new Error('Verified refund charge is unavailable');

  // Persist the financial fact before attempting any purchase/session lookup.
  // A database failure throws and deliberately gives Stripe a retriable 500.
  const pending = await storePendingPaymentReversal({
    providerEventId: event.id,
    eventType: event.type,
    eventCreatedAt: eventCreatedAt(event),
    payloadSha256,
    reversalKind: 'refund',
    paymentIntentId,
    chargeId,
    checkoutSessionId: null,
    invoiceId: chargeInvoiceId(charge),
    customerId: objectId(charge.customer),
    purchaseId: null,
    amountRefundedCents: charge.amount_refunded,
    chargeAmountCents: charge.amount,
    currency: charge.currency,
  });
  logWebhookCorrelation({
    eventId: event.id, eventType: event.type, paymentIntentId, chargeId,
    processed: pending.processed, reason: pending.reason,
  });
  const purchase = paymentIntentId ? await purchaseForPaymentIntent(paymentIntentId) : null;
  if (!purchase || purchase.status === 'pending') {
    return {
      httpStatus: 200, received: true, processed: true,
      duplicate: pending.duplicate, reason: pending.reason ?? 'pending_match',
    };
  }
  if (!paymentIntentId) throw new Error('Matched refund is missing its PaymentIntent');

  const transition = await applyVerifiedRefund({
    providerEventId: event.id,
    eventType: event.type,
    eventCreatedAt: eventCreatedAt(event),
    payloadSha256,
    purchaseId: purchase.id,
    paymentIntentId,
    amountRefundedCents: charge.amount_refunded,
    chargeAmountCents: charge.amount,
    currency: charge.currency,
  });
  if (transition.processed) await markPendingPaymentReversalApplied({
    providerEventId: event.id,
    purchaseId: purchase.id,
    reason: transition.reason ?? 'refund_applied',
  });
  if (transition.reason === 'partially_refunded' || !transition.processed) {
    await notifyPaymentIncident({
      stripeEventId: event.id,
      kind: transition.reason === 'partially_refunded' ? 'partial_refund_review' : 'refund_inconsistency',
      purchaseId: purchase.id,
      reason: transition.reason ?? 'refund_processing_failed',
    });
  }
  return {
    httpStatus: 200,
    received: true,
    processed: transition.processed,
    duplicate: transition.duplicate,
    reason: transition.reason,
  };
}

async function processDisputeEvent(
  event: Stripe.Event,
  payloadSha256: string,
): Promise<WebhookHandlingResult> {
  const dispute = event.data.object as Stripe.Dispute;
  const charge = await chargeForDispute(dispute);
  const paymentIntentId = objectId(charge?.payment_intent);
  const chargeId = charge?.id ?? null;
  if (!charge || !chargeId) throw new Error('Verified dispute charge is unavailable');
  const disputeStatus = stripeDisputeStatus(dispute.status);
  const pending = await storePendingPaymentReversal({
    providerEventId: event.id,
    eventType: event.type,
    eventCreatedAt: eventCreatedAt(event),
    payloadSha256,
    reversalKind: 'dispute',
    paymentIntentId,
    chargeId,
    checkoutSessionId: null,
    invoiceId: chargeInvoiceId(charge),
    customerId: objectId(charge.customer),
    purchaseId: null,
    disputeId: dispute.id,
    disputeStatus,
  });
  logWebhookCorrelation({
    eventId: event.id, eventType: event.type, paymentIntentId, chargeId,
    processed: pending.processed, reason: pending.reason,
  });
  const purchase = paymentIntentId ? await purchaseForPaymentIntent(paymentIntentId) : null;
  if (!purchase || purchase.status === 'pending') {
    return {
      httpStatus: 200, received: true, processed: true,
      duplicate: pending.duplicate, reason: pending.reason ?? 'pending_match',
    };
  }
  if (!paymentIntentId) throw new Error('Matched dispute is missing its PaymentIntent');
  const transition = await applyVerifiedDispute({
    providerEventId: event.id,
    eventType: event.type,
    eventCreatedAt: eventCreatedAt(event),
    payloadSha256,
    purchaseId: purchase.id,
    paymentIntentId,
    disputeId: dispute.id,
    disputeStatus,
  });
  if (transition.processed) await markPendingPaymentReversalApplied({
    providerEventId: event.id,
    purchaseId: purchase.id,
    reason: transition.reason ?? 'dispute_applied',
  });
  if (transition.reason === 'warning' || transition.reason === 'open' || !transition.processed) {
    await notifyPaymentIncident({
      stripeEventId: event.id, kind: 'dispute_review', purchaseId: purchase.id,
      reason: transition.reason ?? 'dispute_processing_failed',
    });
  }
  return {
    httpStatus: 200,
    received: true,
    processed: transition.processed,
    duplicate: transition.duplicate,
    reason: transition.reason,
  };
}

/**
 * The Route Handler must pass request.text() unchanged and the Stripe-Signature
 * header. Access is never activated by the success page or browser metadata.
 */
export async function handleStripeTestWebhook(
  rawBody: string,
  signature: string | null,
): Promise<WebhookHandlingResult> {
  if (!signature) {
    return { httpStatus: 400, received: false, processed: false, duplicate: false, reason: 'missing_signature' };
  }
  const configuration = getStripeTestConfiguration();
  let event: Stripe.Event;
  try {
    event = getStripeTestClient().webhooks.constructEvent(
      rawBody,
      signature,
      configuration.webhookSecret,
    );
  } catch {
    return { httpStatus: 400, received: false, processed: false, duplicate: false, reason: 'invalid_signature' };
  }

  if (event.livemode) {
    return { httpStatus: 400, received: true, processed: false, duplicate: false, reason: 'live_event_not_allowed' };
  }
  const payloadSha256 = createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const createdAt = eventCreatedAt(event);

  await recordPaymentEventReceipt({
    providerEventId: event.id,
    eventType: event.type,
    eventCreatedAt: createdAt,
    payloadSha256,
  });

  try {
    if (
      event.type === 'checkout.session.completed'
      || event.type === 'checkout.session.async_payment_succeeded'
    ) {
      return await processCheckoutEvent(event, payloadSha256);
    }
    if (event.type === 'checkout.session.expired') {
      return await processCheckoutExpiration(event, payloadSha256);
    }
    if (event.type === 'charge.refunded' || event.type === 'refund.updated') {
      return await processRefundEvent(event, payloadSha256);
    }
    if (
      event.type === 'charge.dispute.created'
      || event.type === 'charge.dispute.updated'
      || event.type === 'charge.dispute.closed'
    ) {
      return await processDisputeEvent(event, payloadSha256);
    }

    return await ignored({ event, payloadSha256, reason: 'event_type_not_handled' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing failure';
    try {
      await recordPaymentIncident({
        stripeEventId: event.id,
        kind: 'webhook_processing_failure',
        details: { reason: errorMessage.slice(0, 300), eventType: event.type },
      });
      await notifyPaymentIncident({
        stripeEventId: event.id,
        kind: 'webhook_processing_failure',
        reason: errorMessage,
      });
      await markPaymentEventFailed({ providerEventId: event.id, errorMessage });
    } catch {
      // Preserve the original failure so Stripe still receives a retriable 500.
    }
    throw error;
  }
}
