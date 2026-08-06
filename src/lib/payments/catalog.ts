import type {
  LicenseDuration,
  PaidAccessTier,
  PlanPrice,
} from '../../domain/access';

export const CHECKOUT_TAX_CONFIGURATION = Object.freeze({
  countryCode: 'ES' as const,
  currency: 'EUR' as const,
  vatRateBasisPoints: 2_100,
  pricesIncludeTax: true as const,
  source: 'matriculapro-launch-prices-es-2026-08-05',
  effectiveAt: '2026-08-05T00:00:00.000Z',
});

const TOTALS: Readonly<Record<PaidAccessTier, Readonly<Record<LicenseDuration, number>>>> =
  Object.freeze({
    particular: Object.freeze({
      one_month: 7_900,
      six_months: 17_900,
      twelve_months: 27_900,
    }),
    professional: Object.freeze({
      one_month: 12_900,
      six_months: 29_900,
      twelve_months: 44_900,
    }),
  });

export function splitVatInclusiveCents(totalCents: number, vatRateBasisPoints: number) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new RangeError('totalCents must be a non-negative integer');
  }
  if (!Number.isSafeInteger(vatRateBasisPoints) || vatRateBasisPoints < 0) {
    throw new RangeError('vatRateBasisPoints must be a non-negative integer');
  }
  const baseCents = Math.round(
    (totalCents * 10_000) / (10_000 + vatRateBasisPoints),
  );
  return { baseCents, vatCents: totalCents - baseCents };
}

function createPrice(tier: PaidAccessTier, duration: LicenseDuration): PlanPrice {
  const totalCents = TOTALS[tier][duration];
  const { baseCents, vatCents } = splitVatInclusiveCents(
    totalCents,
    CHECKOUT_TAX_CONFIGURATION.vatRateBasisPoints,
  );

  return Object.freeze({
    tier,
    duration,
    paymentKind: 'one_time' as const,
    automaticRenewal: false as const,
    currency: CHECKOUT_TAX_CONFIGURATION.currency,
    countryCode: CHECKOUT_TAX_CONFIGURATION.countryCode,
    vatRateBasisPoints: CHECKOUT_TAX_CONFIGURATION.vatRateBasisPoints,
    baseCents,
    vatCents,
    totalCents,
    taxIncluded: true as const,
    priceSource: CHECKOUT_TAX_CONFIGURATION.source,
    effectiveAt: CHECKOUT_TAX_CONFIGURATION.effectiveAt,
  });
}

export const PLAN_PRICES: Readonly<
  Record<PaidAccessTier, Readonly<Record<LicenseDuration, PlanPrice>>>
> = Object.freeze({
  particular: Object.freeze({
    one_month: createPrice('particular', 'one_month'),
    six_months: createPrice('particular', 'six_months'),
    twelve_months: createPrice('particular', 'twelve_months'),
  }),
  professional: Object.freeze({
    one_month: createPrice('professional', 'one_month'),
    six_months: createPrice('professional', 'six_months'),
    twelve_months: createPrice('professional', 'twelve_months'),
  }),
});

export function getPlanPrice(tier: PaidAccessTier, duration: LicenseDuration): PlanPrice {
  return PLAN_PRICES[tier][duration];
}

export function formatEuroCents(cents: number, locale = 'es-ES'): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError('cents must be an integer');
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function resolveCheckoutTaxConfiguration(countryCode: string) {
  if (countryCode.toUpperCase() !== CHECKOUT_TAX_CONFIGURATION.countryCode) {
    throw new UnsupportedCheckoutTaxJurisdictionError(countryCode);
  }
  return CHECKOUT_TAX_CONFIGURATION;
}

export class UnsupportedCheckoutTaxJurisdictionError extends Error {
  readonly code = 'unsupported_checkout_tax_jurisdiction';

  constructor(readonly countryCode: string) {
    super(`Checkout tax configuration has not been reviewed for ${countryCode}`);
    this.name = 'UnsupportedCheckoutTaxJurisdictionError';
  }
}

export const PAYMENT_DISCLOSURES = Object.freeze([
  'IVA incluido',
  'Pago único',
  'Sin renovación automática',
] as const);
