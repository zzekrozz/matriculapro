import Stripe from 'stripe';
import { PLAN_PRICES, splitVatInclusiveCents } from '../../src/lib/payments/catalog';
import { STRIPE_PRODUCT_TAX_CODES } from '../../src/lib/payments/stripe-tax';

const priceEnvironmentNames = {
  particular: {
    one_month: 'STRIPE_PRICE_PARTICULAR_1M',
    six_months: 'STRIPE_PRICE_PARTICULAR_6M',
    twelve_months: 'STRIPE_PRICE_PARTICULAR_12M',
  },
  professional: {
    one_month: 'STRIPE_PRICE_PROFESSIONAL_1M',
    six_months: 'STRIPE_PRICE_PROFESSIONAL_6M',
    twelve_months: 'STRIPE_PRICE_PROFESSIONAL_12M',
  },
} as const;

function fail(message: string): never {
  console.error(`STRIPE_DOCTOR_STATUS=INVALID (${message})`);
  process.exit(1);
}

for (const tier of ['particular', 'professional'] as const) {
  for (const duration of ['one_month', 'six_months', 'twelve_months'] as const) {
    const price = PLAN_PRICES[tier][duration];
    const expected = splitVatInclusiveCents(price.totalCents, 2_100);
    if (
      price.currency !== 'EUR' || price.countryCode !== 'ES' || !price.taxIncluded
      || price.vatRateBasisPoints !== 2_100
      || expected.baseCents !== price.baseCents || expected.vatCents !== price.vatCents
      || price.baseCents + price.vatCents !== price.totalCents
    ) fail(`static catalog mismatch for ${tier}/${duration}`);
  }
}
console.log('STRIPE_DOCTOR_STATIC=OK (6 plans, EUR, ES, IVA 21% incluido)');

const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
if (process.env.STRIPE_TAX_RATE_ES_IVA_21 !== undefined) {
  fail('STRIPE_TAX_RATE_ES_IVA_21 must be absent when Stripe Tax automatic is enabled');
}
const configuredPriceIds = Object.values(priceEnvironmentNames)
  .flatMap((tier) => Object.values(tier).map((name) => process.env[name]?.trim() ?? ''));

if (!secretKey && configuredPriceIds.every((value) => !value)) {
  console.log('STRIPE_DOCTOR_LIVE=PENDING (configure test Stripe variables to verify remote objects)');
  process.exit(0);
}
if (!secretKey.startsWith('sk_test_')) fail('STRIPE_SECRET_KEY must use sk_test_');
if (configuredPriceIds.some((value) => !/^price_[A-Za-z0-9]+$/.test(value))) {
  fail('all six Stripe Price IDs are required');
}
if (new Set(configuredPriceIds).size !== configuredPriceIds.length) fail('Stripe Price IDs must be unique');

async function verifyRemoteStripeConfiguration() {
  const stripe = new Stripe(secretKey);
  const settings = await stripe.tax.settings.retrieve();
  if (settings.livemode || settings.status !== 'active') {
    fail('Stripe Tax must be active in test mode');
  }

  const productIdsByTier: Partial<Record<'particular' | 'professional', string>> = {};

  for (const tier of ['particular', 'professional'] as const) {
    for (const duration of ['one_month', 'six_months', 'twelve_months'] as const) {
      const environmentName = priceEnvironmentNames[tier][duration];
      const priceId = process.env[environmentName]!.trim();
      const remote = await stripe.prices.retrieve(priceId);
      const expected = PLAN_PRICES[tier][duration];
      if (
        !remote.active || remote.livemode || remote.type !== 'one_time' || remote.recurring !== null
        || remote.currency.toUpperCase() !== 'EUR' || remote.unit_amount !== expected.totalCents
        || remote.tax_behavior !== 'inclusive'
      ) fail(`${environmentName} is not an active test one-time inclusive EUR Price for ${expected.totalCents} cents`);
      const productId = typeof remote.product === 'string' ? remote.product : remote.product.id;
      const product = await stripe.products.retrieve(productId);
      const taxCode = typeof product.tax_code === 'string' ? product.tax_code : product.tax_code?.id;
      if (product.deleted || !product.active || product.livemode
        || taxCode !== STRIPE_PRODUCT_TAX_CODES[tier]) {
        fail(`${environmentName} Product must be active in test mode and use ${STRIPE_PRODUCT_TAX_CODES[tier]}`);
      }
      productIdsByTier[tier] ??= product.id;
      if (productIdsByTier[tier] !== product.id) {
        fail(`the three ${tier} Prices must share one Product`);
      }
    }
  }
  if (productIdsByTier.particular === productIdsByTier.professional) {
    fail('Particular and Professional must use two different Products');
  }

  console.log('STRIPE_DOCTOR_LIVE=OK (Stripe Tax active + 2 Products + 6 inclusive Prices verified in test mode)');
  console.log('STRIPE_DOCTOR_STATUS=VALID');
}

verifyRemoteStripeConfiguration().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : 'unknown Stripe verification error');
});
