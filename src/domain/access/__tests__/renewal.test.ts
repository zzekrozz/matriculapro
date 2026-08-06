import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isWithinRenewalWindow, quoteRenewal, renewalWindowOpensAt, type UserLicense } from '..';

const license: UserLicense = {
  id: '00000000-0000-4000-8000-000000000101',
  userId: '00000000-0000-4000-8000-000000000001',
  tier: 'particular', duration: 'one_month', status: 'active',
  startsAt: '2026-01-31T23:30:00.000Z', expiresAt: '2026-02-28T23:30:00.000Z',
  originalPurchaseId: '00000000-0000-4000-8000-000000000201',
  upgradedFromLicenseId: null, createdAt: '2026-01-31T23:30:00.000Z',
  updatedAt: '2026-01-31T23:30:00.000Z',
};

describe('30-day manual renewal', () => {
  it('opens inclusively at exactly 30 days and rejects one second before', () => {
    const boundary = renewalWindowOpensAt(license.expiresAt!);
    assert.equal(quoteRenewal({ currentLicense: license, tier: 'particular', duration: 'six_months', now: boundary }).eligible, true);
    const oneSecondBefore = new Date(Date.parse(boundary) - 1_000).toISOString();
    assert.deepEqual(
      quoteRenewal({ currentLicense: license, tier: 'particular', duration: 'six_months', now: oneSecondBefore }),
      { eligible: false, reason: 'renewal_window_not_open' },
    );
  });

  it('preserves Madrid wall time across the spring DST transition instead of subtracting 720 hours', () => {
    const expiry = '2026-04-15T10:00:00+02:00';
    assert.equal(renewalWindowOpensAt(expiry), '2026-03-16T09:00:00.000Z');
    assert.notEqual(
      renewalWindowOpensAt(expiry),
      new Date(Date.parse(expiry) - 30 * 24 * 60 * 60 * 1_000).toISOString(),
    );
  });

  it('preserves Madrid wall time across the autumn DST transition', () => {
    assert.equal(
      renewalWindowOpensAt('2026-11-15T10:00:00+01:00'),
      '2026-10-16T08:00:00.000Z',
    );
  });

  it('includes the exact boundary and one millisecond after, excluding one millisecond before', () => {
    const expiry = '2026-10-31T18:00:00+01:00';
    const opens = renewalWindowOpensAt(expiry);
    assert.equal(isWithinRenewalWindow(opens, expiry), true);
    assert.equal(isWithinRenewalWindow(new Date(Date.parse(opens) + 1), expiry), true);
    assert.equal(isWithinRenewalWindow(new Date(Date.parse(opens) - 1), expiry), false);
    assert.equal(isWithinRenewalWindow(expiry, expiry), false);
  });

  it('handles month-end, leap day, midnight and end-of-day wall times', () => {
    const cases = [
      ['2026-01-31T18:00:00+01:00', '2026-01-01T17:00:00.000Z'],
      ['2026-03-31T18:00:00+02:00', '2026-03-01T17:00:00.000Z'],
      ['2026-10-31T18:00:00+01:00', '2026-10-01T16:00:00.000Z'],
      ['2028-02-29T00:00:00+01:00', '2028-01-29T23:00:00.000Z'],
      ['2026-12-31T23:59:59+01:00', '2026-12-01T22:59:59.000Z'],
    ] as const;
    for (const [expiry, expected] of cases) assert.equal(renewalWindowOpensAt(expiry), expected);
  });

  it('does not open a second renewal from a future scheduled licence', () => {
    assert.deepEqual(
      quoteRenewal({
        currentLicense: { ...license, status: 'scheduled' },
        tier: 'particular', duration: 'one_month', now: renewalWindowOpensAt(license.expiresAt!),
      }),
      { eligible: false, reason: 'license_not_renewable' },
    );
  });

  it('schedules 1, 6 and 12 calendar months exactly after the current period', () => {
    const expected = {
      one_month: '2026-03-28T23:30:00.000Z',
      six_months: '2026-08-28T23:30:00.000Z',
      twelve_months: '2027-02-28T23:30:00.000Z',
    } as const;
    for (const duration of ['one_month', 'six_months', 'twelve_months'] as const) {
      const quote = quoteRenewal({ currentLicense: license, tier: 'particular', duration, now: '2026-02-01T00:00:00.000Z' });
      assert.equal(quote.eligible, true);
      if (quote.eligible) {
        assert.equal(quote.startsAt, license.expiresAt);
        assert.equal(quote.expiresAt, expected[duration]);
        assert.equal(quote.status, 'scheduled');
      }
    }
  });

  it('remains available on the final day without removing the paid remainder', () => {
    const quote = quoteRenewal({
      currentLicense: license,
      tier: 'particular',
      duration: 'one_month',
      now: '2026-02-28T23:29:59+01:00',
    });
    assert.equal(quote.eligible, true);
    if (quote.eligible) assert.equal(quote.startsAt, license.expiresAt);
  });

  it('starts immediately after expiration and forbids a tier change', () => {
    const expired = { ...license, status: 'expired' as const };
    const now = '2026-03-29T00:30:00+02:00';
    const quote = quoteRenewal({ currentLicense: expired, tier: 'particular', duration: 'one_month', now });
    assert.equal(quote.eligible, true);
    if (quote.eligible) assert.equal(quote.startsAt, '2026-03-28T22:30:00.000Z');
    assert.deepEqual(
      quoteRenewal({ currentLicense: expired, tier: 'professional', duration: 'one_month', now }),
      { eligible: false, reason: 'tier_change_not_allowed' },
    );
  });
});
