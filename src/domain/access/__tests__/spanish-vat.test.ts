import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  expectedSpanishVatBreakdown,
  STRIPE_PRODUCT_TAX_CODES,
} from '../../../lib/payments/stripe-tax';

describe('Stripe Tax automatic Spanish VAT contract', () => {
  it('uses official non-downloadable SaaS tax codes for both audiences', () => {
    assert.deepEqual(STRIPE_PRODUCT_TAX_CODES, {
      particular: 'txcd_10103000',
      professional: 'txcd_10103001',
    });
  });

  it('keeps Stripe-compatible cent rounding for inclusive Spanish prices', () => {
    assert.deepEqual(expectedSpanishVatBreakdown(7_900), { baseCents: 6_529, vatCents: 1_371 });
    assert.deepEqual(expectedSpanishVatBreakdown(44_900), { baseCents: 37_107, vatCents: 7_793 });
  });
});
