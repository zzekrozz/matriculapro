import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLAN_PRICES } from '../../src/lib/payments/catalog';
import { STRIPE_PRODUCT_TAX_CODES } from '../../src/lib/payments/stripe-tax';

const root = resolve(__dirname, '../..');
const checkoutSource = readFileSync(resolve(root, 'src/server/payments/create-checkout.ts'), 'utf8');
const environmentExample = readFileSync(resolve(root, '.env.example'), 'utf8');
const environmentValidator = readFileSync(
  resolve(root, 'scripts/launch/validate-environment.ts'),
  'utf8',
);
const stripeConfiguration = readFileSync(
  resolve(root, 'src/lib/payments/stripe-test-config.ts'),
  'utf8',
);

assert.match(checkoutSource, /automatic_tax:\s*\{\s*enabled:\s*true\s*\}/);
assert.match(checkoutSource, /mode:\s*'payment'/);
assert.match(checkoutSource, /billing_address_collection:\s*'required'/);
assert.match(checkoutSource, /invoice_creation:\s*\{[\s\S]*?enabled:\s*true/);
assert.match(checkoutSource, /customer:\s*billingCustomer\.stripeCustomerId/);
assert.doesNotMatch(checkoutSource, /\btax_rates\s*:/);
assert.doesNotMatch(checkoutSource, /STRIPE_TAX_RATE_ES_IVA_21/);
assert.doesNotMatch(environmentExample, /STRIPE_TAX_RATE_ES_IVA_21/);
assert.doesNotMatch(environmentValidator, /STRIPE_TAX_RATE_ES_IVA_21/);
assert.doesNotMatch(stripeConfiguration, /STRIPE_TAX_RATE_ES_IVA_21/);

assert.deepEqual(
  Object.values(PLAN_PRICES.particular).map((price) => price.totalCents),
  [7_900, 17_900, 27_900],
);
assert.deepEqual(
  Object.values(PLAN_PRICES.professional).map((price) => price.totalCents),
  [12_900, 29_900, 44_900],
);
for (const price of Object.values(PLAN_PRICES).flatMap((tier) => Object.values(tier))) {
  assert.equal(price.paymentKind, 'one_time');
  assert.equal(price.currency, 'EUR');
  assert.equal(price.countryCode, 'ES');
  assert.equal(price.taxIncluded, true);
  assert.equal(price.baseCents + price.vatCents, price.totalCents);
}
assert.deepEqual(STRIPE_PRODUCT_TAX_CODES, {
  particular: 'txcd_10103000',
  professional: 'txcd_10103001',
});

console.log('STRIPE_AUTOMATIC_TAX_CONTRACT_STATUS=VALID');
