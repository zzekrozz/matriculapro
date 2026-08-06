import type { PaidAccessTier } from '@/domain/access';
import { CHECKOUT_TAX_CONFIGURATION, splitVatInclusiveCents } from './catalog';

/** Official Stripe Tax codes for hosted, non-downloadable SaaS access. */
export const STRIPE_PRODUCT_TAX_CODES: Readonly<Record<PaidAccessTier, string>> = Object.freeze({
  particular: 'txcd_10103000',
  professional: 'txcd_10103001',
});

export function expectedSpanishVatBreakdown(totalCents: number) {
  return splitVatInclusiveCents(totalCents, CHECKOUT_TAX_CONFIGURATION.vatRateBasisPoints);
}
