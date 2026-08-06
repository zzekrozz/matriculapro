import 'server-only';
import { createHash } from 'node:crypto';
import { validateCompletedCheckout } from '@/domain/access';
import {
  applyVerifiedCheckoutPayment,
  getPaymentIncident,
  getPurchaseByCheckoutSession,
  recordPaymentEventReceipt,
  resolvePaymentIncident,
} from './access-payment-repository';
import { retrieveVerifiedCheckoutSnapshot } from './stripe-checkout-receipt';

export async function retryPaymentIncident(incidentId: string): Promise<Record<string, unknown>> {
  const incident = await getPaymentIncident(incidentId);
  if (!incident) throw new Error('Payment incident not found');
  const sessionId = typeof incident.stripe_checkout_session_id === 'string'
    ? incident.stripe_checkout_session_id : null;
  if (!sessionId) throw new Error('Incident has no Checkout Session to retry');
  const retrying = await resolvePaymentIncident({
    incidentId, status: 'retrying', reason: 'Administrative activation retry requested',
  });
  const retryCount = Number(retrying.retry_count);
  const retryEventId = `admin_retry_${incidentId.replaceAll('-', '')}_${retryCount}`;
  try {
    const { session, checkout } = await retrieveVerifiedCheckoutSnapshot(sessionId);
    const purchase = await getPurchaseByCheckoutSession(session.id);
    if (!purchase) throw new Error('Checkout purchase no longer exists');
    const validation = validateCompletedCheckout({ ...purchase, status: 'pending' }, checkout);
    if (
      !validation.valid || !checkout.paymentIntentId || !checkout.chargeId || !checkout.priceId
      || !checkout.customerId || !checkout.taxCountry || checkout.amountTotalCents === null
      || checkout.automaticTaxEnabled !== true || checkout.automaticTaxStatus !== 'complete'
      || checkout.taxBehavior !== 'inclusive'
      || checkout.subtotalExcludingTaxCents === null || checkout.taxAmountCents === null
      || checkout.totalIncludingTaxCents === null || !checkout.invoiceId
    || !checkout.invoiceNumber || !checkout.invoiceStatus || !checkout.invoiceCountry
    || !checkout.invoiceCurrency || !checkout.invoicePriceId
    || checkout.invoiceAutomaticTaxEnabled !== true
    || checkout.invoiceAutomaticTaxStatus !== 'complete'
    || checkout.invoiceTaxBehavior !== 'inclusive'
    || checkout.invoiceSubtotalExcludingTaxCents === null
      || checkout.invoiceTaxAmountCents === null || checkout.invoiceTotalIncludingTaxCents === null
    ) throw new Error(`Checkout retry validation failed: ${validation.reason ?? 'incomplete'}`);
    const eventCreatedAt = new Date().toISOString();
    const payloadSha256 = createHash('sha256')
      .update(`${incidentId}:${retryCount}:${session.id}`, 'utf8').digest('hex');
    await recordPaymentEventReceipt({
      providerEventId: retryEventId,
      eventType: 'checkout.session.completed',
      eventCreatedAt,
      payloadSha256,
    });
    const transition = await applyVerifiedCheckoutPayment({
      providerEventId: retryEventId,
      eventType: 'checkout.session.completed',
      eventCreatedAt,
      payloadSha256,
      purchase,
      checkoutSessionId: checkout.id,
      paymentIntentId: checkout.paymentIntentId,
      chargeId: checkout.chargeId,
      customerId: checkout.customerId,
      priceId: checkout.priceId,
      amountTotalCents: checkout.amountTotalCents,
      currency: checkout.currency ?? '',
      country: checkout.taxCountry,
      automaticTaxStatus: 'complete',
      taxBehavior: 'inclusive',
      subtotalExcludingTaxCents: checkout.subtotalExcludingTaxCents,
      taxAmountCents: checkout.taxAmountCents,
      totalIncludingTaxCents: checkout.totalIncludingTaxCents,
      invoiceId: checkout.invoiceId,
      invoiceNumber: checkout.invoiceNumber,
      invoiceStatus: checkout.invoiceStatus,
      invoiceCountry: checkout.invoiceCountry,
      invoiceCurrency: checkout.invoiceCurrency,
      invoiceAutomaticTaxStatus: 'complete',
      invoiceTaxBehavior: 'inclusive',
      invoiceSubtotalExcludingTaxCents: checkout.invoiceSubtotalExcludingTaxCents,
      invoiceTaxAmountCents: checkout.invoiceTaxAmountCents,
      invoiceTotalIncludingTaxCents: checkout.invoiceTotalIncludingTaxCents,
    });
    if (!transition.processed || !transition.licenseId) {
      throw new Error(`Activation retry did not create access: ${transition.reason ?? 'unknown'}`);
    }
    return resolvePaymentIncident({
      incidentId, status: 'resolved', reason: `Activation succeeded with ${retryEventId}`,
    });
  } catch (error) {
    await resolvePaymentIncident({
      incidentId, status: 'open',
      reason: error instanceof Error ? error.message : 'Administrative retry failed',
    });
    throw error;
  }
}
