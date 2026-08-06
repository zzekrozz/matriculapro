import Stripe from 'stripe';
import { PLAN_PRICES, splitVatInclusiveCents } from '../../src/lib/payments/catalog';
import { validateSpanishVatTaxRate } from '../../src/lib/payments/spanish-vat';

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
const taxRateId = process.env.STRIPE_TAX_RATE_ES_IVA_21?.trim() ?? '';
const configuredPriceIds = Object.values(priceEnvironmentNames)
  .flatMap((tier) => Object.values(tier).map((name) => process.env[name]?.trim() ?? ''));

if (!secretKey && !taxRateId && configuredPriceIds.every((value) => !value)) {
  console.log('STRIPE_DOCTOR_LIVE=PENDING (configure test Stripe variables to verify remote objects)');
  process.exit(0);
}
if (!secretKey.startsWith('sk_test_')) fail('STRIPE_SECRET_KEY must use sk_test_');
if (!/^txr_[A-Za-z0-9]+$/.test(taxRateId)) fail('STRIPE_TAX_RATE_ES_IVA_21 is missing or invalid');
if (configuredPriceIds.some((value) => !/^price_[A-Za-z0-9]+$/.test(value))) {
  fail('all six Stripe Price IDs are required');
}
if (new Set(configuredPriceIds).size !== configuredPriceIds.length) fail('Stripe Price IDs must be unique');

async function verifyRemoteStripeConfiguration() {
  const stripe = new Stripe(secretKey);
  const taxRate = await stripe.taxRates.retrieve(taxRateId);
  const taxRateReason = validateSpanishVatTaxRate(taxRate);
  if (taxRateReason) fail(`tax rate rejected: ${taxRateReason}`);

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
    }
  }

  console.log('STRIPE_DOCTOR_LIVE=OK (Tax Rate + 6 Prices verified in test mode)');
  console.log('STRIPE_DOCTOR_STATUS=VALID');
}

verifyRemoteStripeConfiguration().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : 'unknown Stripe verification error');
});
