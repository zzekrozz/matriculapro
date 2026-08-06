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
  const taxes = lineItem?.taxes ?? [];
  const tax = taxes.length === 1 ? taxes[0] : null;
  const invoiceTaxes = invoice?.total_taxes ?? [];
  const invoiceTax = invoiceTaxes.length === 1 ? invoiceTaxes[0] : null;
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
      taxRateId: tax?.rate.id ?? null,
      taxPercentage: tax?.rate.percentage ?? null,
      taxInclusive: tax?.rate.inclusive ?? null,
      taxRateLivemode: tax?.rate.livemode ?? null,
      subtotalExcludingTaxCents: total === null || taxAmount === null ? null : total - taxAmount,
      taxAmountCents: taxAmount,
      totalIncludingTaxCents: total,
      invoiceId,
      invoiceNumber: invoice?.number ?? null,
      invoiceStatus: invoice?.status ?? null,
      invoiceCurrency: invoice?.currency ?? null,
      invoiceCountry: invoice?.customer_address?.country ?? null,
      invoiceTaxRateId: invoiceTax?.tax_rate_details?.tax_rate ?? null,
      invoiceTaxBehavior: invoiceTax?.tax_behavior ?? null,
      invoiceSubtotalExcludingTaxCents: invoice?.total_excluding_tax ?? null,
      invoiceTaxAmountCents: invoiceTax?.amount ?? null,
      invoiceTotalIncludingTaxCents: invoice?.total ?? null,
    },
  };
}
