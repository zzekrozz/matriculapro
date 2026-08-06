import 'server-only';
import type Stripe from 'stripe';
import type { VerifiedCheckoutSnapshot } from '@/domain/access';
import { getStripeTestClient } from './stripe-test-client';

function objectId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}

export async function retrieveVerifiedCheckoutSnapshot(
  sessionId: string,
): Promise<{ session: Stripe.Checkout.Session; checkout: VerifiedCheckoutSnapshot }> {
  const stripe = getStripeTestClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price', 'line_items.data.taxes.rate', 'payment_intent.latest_charge'],
  });
  const invoiceId = objectId(session.invoice);
  const invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null;
  const lineItems = session.line_items?.data ?? [];
  const lineItem = lineItems.length === 1 ? lineItems[0] : null;
  const invoiceTaxes = invoice?.total_taxes ?? [];
  const invoiceTaxBehavior = invoiceTaxes.length > 0
    && invoiceTaxes.every((tax) => tax.tax_behavior === 'inclusive') ? 'inclusive' : null;
  const invoiceLineItems = invoice?.lines.data ?? [];
  const invoiceLineItem = invoiceLineItems.length === 1 ? invoiceLineItems[0] : null;
  const invoicePrice = invoiceLineItem?.pricing?.price_details?.price;
  const total = lineItem?.amount_total ?? null;
  const taxAmount = lineItem?.amount_tax ?? null;

  return {
    session,
    checkout: {
      id: session.id,
      livemode: session.livemode,
      mode: session.mode ?? 'payment',
      paymentStatus: session.payment_status,
      amountTotalCents: session.amount_total,
      currency: session.currency,
      priceId: lineItem?.price?.id ?? null,
      quantity: lineItem?.quantity ?? null,
      paymentIntentId: objectId(session.payment_intent),
      chargeId: typeof session.payment_intent === 'object' && session.payment_intent
        ? objectId(session.payment_intent.latest_charge)
        : null,
      customerId: objectId(session.customer),
      taxCountry: session.customer_details?.address?.country ?? null,
      automaticTaxEnabled: session.automatic_tax.enabled,
      automaticTaxStatus: session.automatic_tax.status,
      taxBehavior: lineItem?.price?.tax_behavior ?? null,
      subtotalExcludingTaxCents: total === null || taxAmount === null ? null : total - taxAmount,
      taxAmountCents: taxAmount,
      totalIncludingTaxCents: total,
      invoiceId,
      invoiceNumber: invoice?.number ?? null,
      invoiceStatus: invoice?.status ?? null,
      invoiceCurrency: invoice?.currency ?? null,
      invoiceCountry: invoice?.customer_address?.country ?? null,
      invoicePriceId: objectId(invoicePrice),
      invoiceAutomaticTaxEnabled: invoice?.automatic_tax.enabled ?? null,
      invoiceAutomaticTaxStatus: invoice?.automatic_tax.status ?? null,
      invoiceTaxBehavior,
      invoiceSubtotalExcludingTaxCents: invoice?.total_excluding_tax ?? null,
      invoiceTaxAmountCents: invoiceTaxes.length > 0
        ? invoiceTaxes.reduce((totalTax, tax) => totalTax + tax.amount, 0)
        : null,
      invoiceTotalIncludingTaxCents: invoice?.total ?? null,
    },
  };
}
