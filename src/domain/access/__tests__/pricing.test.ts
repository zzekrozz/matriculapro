import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHECKOUT_TAX_CONFIGURATION,
  PAYMENT_DISCLOSURES,
  PLAN_PRICES,
  getPlanPrice,
  resolveCheckoutTaxConfiguration,
  splitVatInclusiveCents,
  UnsupportedCheckoutTaxJurisdictionError,
} from '../../../lib/payments/catalog';

describe('central one-time price catalog', () => {
  it('contains the six launch totals with VAT included', () => {
    assert.deepEqual(
      Object.values(PLAN_PRICES.particular).map((price) => price.totalCents),
      [7_900, 17_900, 27_900],
    );
    assert.deepEqual(
      Object.values(PLAN_PRICES.professional).map((price) => price.totalCents),
      [12_900, 29_900, 44_900],
    );
  });

  it('stores base, VAT and total consistently for every plan', () => {
    for (const tier of Object.values(PLAN_PRICES)) {
      for (const price of Object.values(tier)) {
        assert.equal(price.baseCents + price.vatCents, price.totalCents);
        assert.equal(price.vatRateBasisPoints, 2_100);
        assert.equal(price.taxIncluded, true);
        assert.equal(price.paymentKind, 'one_time');
        assert.equal(price.automaticRenewal, false);
      }
    }
  });

  it('keeps the VAT breakdown exact after applying gross upgrade credit', () => {
    assert.deepEqual(splitVatInclusiveCents(10_000, 2_100), {
      baseCents: 8_264,
      vatCents: 1_736,
    });
  });

  it('provides the required commercial disclosures from one source', () => {
    assert.deepEqual(PAYMENT_DISCLOSURES, [
      'IVA incluido', 'Pago único', 'Sin renovación automática',
    ]);
    assert.equal(getPlanPrice('professional', 'six_months').totalCents, 29_900);
  });

  it('does not assume an unreviewed future tax jurisdiction', () => {
    assert.equal(resolveCheckoutTaxConfiguration('es'), CHECKOUT_TAX_CONFIGURATION);
    assert.throws(
      () => resolveCheckoutTaxConfiguration('FR'),
      (error: unknown) => error instanceof UnsupportedCheckoutTaxJurisdictionError,
    );
  });
});
