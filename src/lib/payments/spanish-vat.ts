import { CHECKOUT_TAX_CONFIGURATION, splitVatInclusiveCents } from './catalog';

export const SPANISH_VAT = Object.freeze({
  country: 'ES' as const,
  percentage: 21,
  basisPoints: 2_100,
  inclusive: true as const,
});

export function validateSpanishVatTaxRate(
  taxRate: {
    active: boolean;
    country: string | null;
    inclusive: boolean;
    livemode: boolean;
    percentage: number;
  },
): string | null {
  if (!taxRate.active) return 'tax_rate_inactive';
  if (taxRate.livemode) return 'live_tax_rate_not_allowed';
  if (taxRate.country?.toUpperCase() !== SPANISH_VAT.country) return 'tax_rate_country_mismatch';
  if (!taxRate.inclusive) return 'tax_rate_not_inclusive';
  if (taxRate.percentage !== SPANISH_VAT.percentage) return 'tax_rate_percentage_mismatch';
  return null;
}

export function expectedSpanishVatBreakdown(totalCents: number) {
  return splitVatInclusiveCents(totalCents, CHECKOUT_TAX_CONFIGURATION.vatRateBasisPoints);
}
