import 'server-only';
import type { LicenseDuration, PaidAccessTier } from '@/domain/access';

type PriceEnvironmentName =
  | 'STRIPE_PRICE_PARTICULAR_1M'
  | 'STRIPE_PRICE_PARTICULAR_6M'
  | 'STRIPE_PRICE_PARTICULAR_12M'
  | 'STRIPE_PRICE_PROFESSIONAL_1M'
  | 'STRIPE_PRICE_PROFESSIONAL_6M'
  | 'STRIPE_PRICE_PROFESSIONAL_12M';

const PRICE_ENVIRONMENT_NAMES: Readonly<
  Record<PaidAccessTier, Readonly<Record<LicenseDuration, PriceEnvironmentName>>>
> = Object.freeze({
  particular: Object.freeze({
    one_month: 'STRIPE_PRICE_PARTICULAR_1M',
    six_months: 'STRIPE_PRICE_PARTICULAR_6M',
    twelve_months: 'STRIPE_PRICE_PARTICULAR_12M',
  }),
  professional: Object.freeze({
    one_month: 'STRIPE_PRICE_PROFESSIONAL_1M',
    six_months: 'STRIPE_PRICE_PROFESSIONAL_6M',
    twelve_months: 'STRIPE_PRICE_PROFESSIONAL_12M',
  }),
});

export interface StripeTestConfiguration {
  secretKey: string;
  webhookSecret: string;
  appBaseUrl: string;
  priceIds: Readonly<Record<PaidAccessTier, Readonly<Record<LicenseDuration, string>>>>;
  upgradeCreditCouponIds: Readonly<Record<PaidAccessTier, string | null>>;
}

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new StripeTestConfigurationError(`${name} is required`);
  return value;
}

function requirePriceId(name: PriceEnvironmentName): string {
  const value = requireEnvironment(name);
  if (!/^price_[A-Za-z0-9]+$/.test(value)) {
    throw new StripeTestConfigurationError(`${name} must contain a Stripe Price ID`);
  }
  return value;
}

function optionalCouponId(name: string): string | null {
  const value = process.env[name]?.trim() ?? '';
  if (!value) return null;
  if (!/^[A-Za-z0-9_-]{3,255}$/.test(value)) {
    throw new StripeTestConfigurationError(`${name} must contain a valid Stripe Coupon ID`);
  }
  return value;
}

function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new StripeTestConfigurationError('APP_BASE_URL must be an absolute URL');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new StripeTestConfigurationError('APP_BASE_URL cannot contain credentials, query or fragment');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new StripeTestConfigurationError('APP_BASE_URL must use HTTPS in production');
  }
  return url.origin;
}

export function getStripeTestConfiguration(): StripeTestConfiguration {
  const secretKey = requireEnvironment('STRIPE_SECRET_KEY');
  if (!secretKey.startsWith('sk_test_')) {
    throw new StripeTestConfigurationError('Only a Stripe sk_test_ key is allowed before launch');
  }

  const webhookSecret = requireEnvironment('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret.startsWith('whsec_')) {
    throw new StripeTestConfigurationError('STRIPE_WEBHOOK_SECRET must be a whsec_ secret');
  }

  const priceIds = Object.freeze({
    particular: Object.freeze({
      one_month: requirePriceId('STRIPE_PRICE_PARTICULAR_1M'),
      six_months: requirePriceId('STRIPE_PRICE_PARTICULAR_6M'),
      twelve_months: requirePriceId('STRIPE_PRICE_PARTICULAR_12M'),
    }),
    professional: Object.freeze({
      one_month: requirePriceId('STRIPE_PRICE_PROFESSIONAL_1M'),
      six_months: requirePriceId('STRIPE_PRICE_PROFESSIONAL_6M'),
      twelve_months: requirePriceId('STRIPE_PRICE_PROFESSIONAL_12M'),
    }),
  });

  const flattened = Object.values(priceIds).flatMap((tier) => Object.values(tier));
  if (new Set(flattened).size !== flattened.length) {
    throw new StripeTestConfigurationError('Each plan must use a different Stripe Price ID');
  }

  return Object.freeze({
    secretKey,
    webhookSecret,
    appBaseUrl: normalizeBaseUrl(requireEnvironment('APP_BASE_URL')),
    priceIds,
    upgradeCreditCouponIds: Object.freeze({
      particular: optionalCouponId('STRIPE_COUPON_PARTICULAR_1M_CREDIT'),
      professional: optionalCouponId('STRIPE_COUPON_PROFESSIONAL_1M_CREDIT'),
    }),
  });
}

export function stripePriceIdFor(
  config: StripeTestConfiguration,
  tier: PaidAccessTier,
  duration: LicenseDuration,
): string {
  return config.priceIds[tier][duration];
}

export class StripeTestConfigurationError extends Error {
  readonly code = 'stripe_test_configuration_error';

  constructor(message: string) {
    super(message);
    this.name = 'StripeTestConfigurationError';
  }
}
