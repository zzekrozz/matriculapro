import 'server-only';
import type Stripe from 'stripe';
import { validateSpanishVatTaxRate } from '@/lib/payments/spanish-vat';
import { StripeTestConfigurationError } from '@/lib/payments/stripe-test-config';
import { getStripeTestClient } from './stripe-test-client';

export async function getVerifiedSpanishVatTaxRate(taxRateId: string): Promise<Stripe.TaxRate> {
  const taxRate = await getStripeTestClient().taxRates.retrieve(taxRateId);
  const reason = validateSpanishVatTaxRate(taxRate);
  if (reason) {
    throw new StripeTestConfigurationError(
      `Stripe Tax Rate ${taxRateId} is invalid for Spanish 21% inclusive VAT: ${reason}`,
    );
  }
  return taxRate;
}
