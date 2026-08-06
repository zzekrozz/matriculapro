import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateSpanishVatTaxRate } from '../../../lib/payments/spanish-vat';

const VALID = {
  active: true,
  country: 'ES',
  inclusive: true,
  livemode: false,
  percentage: 21,
};

describe('Stripe Spanish manual VAT Tax Rate', () => {
  it('accepts only an active test-mode inclusive Spanish 21 percent rate', () => {
    assert.equal(validateSpanishVatTaxRate(VALID), null);
  });

  it('rejects missing/foreign country, 10 percent, exclusive, inactive and live rates', () => {
    const cases = [
      [{ ...VALID, country: null }, 'tax_rate_country_mismatch'],
      [{ ...VALID, country: 'FR' }, 'tax_rate_country_mismatch'],
      [{ ...VALID, percentage: 10 }, 'tax_rate_percentage_mismatch'],
      [{ ...VALID, inclusive: false }, 'tax_rate_not_inclusive'],
      [{ ...VALID, active: false }, 'tax_rate_inactive'],
      [{ ...VALID, livemode: true }, 'live_tax_rate_not_allowed'],
    ] as const;
    for (const [taxRate, reason] of cases) {
      assert.equal(validateSpanishVatTaxRate(taxRate), reason);
    }
  });
});
