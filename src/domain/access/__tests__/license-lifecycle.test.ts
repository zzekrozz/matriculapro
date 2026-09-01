import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AccessDeniedError,
  addCalendarMonthsUtc,
  assertCapability,
  calculateLicenseExpiration,
  createPublicBetaAccessContext,
  evaluateAccess,
  type UserLicense,
} from '..';
import { parsePublicBetaMode } from '../../../config/public-beta';

const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('reversible public beta access', () => {
  it('keeps the temporary launch open by default and supports an explicit rollback', () => {
    for (const value of ['true', 'TRUE', '1', 'yes', 'on']) assert.equal(parsePublicBetaMode(value), true);
    for (const value of [undefined, '']) assert.equal(parsePublicBetaMode(value), true);
    for (const value of ['false', '0', 'no', 'off', 'production']) assert.equal(parsePublicBetaMode(value), false);
  });

  it('opens every user capability without fabricating a paid licence', () => {
    const context = createPublicBetaAccessContext(USER_ID);
    assert.equal(context.publicBeta, true);
    assert.equal(context.userId, USER_ID);
    assert.equal(context.tier, 'free');
    assert.equal(context.mode, 'free');
    assert.equal(context.license, null);
    assert.equal(context.canViewPaidCases, true);
    assert.equal(context.canCreateFullCases, true);
    assert.equal(context.canManageFullCases, true);
    assert.equal(context.canRunFiscalCalculations, true);
    assert.equal(context.canUseProfessional, true);
    assert.equal(context.canExport, true);
  });
});

function paidLicense(overrides: Partial<UserLicense> = {}): UserLicense {
  return {
    id: '00000000-0000-4000-8000-000000000101',
    userId: USER_ID,
    tier: 'particular',
    duration: 'one_month',
    status: 'active',
    startsAt: '2026-01-31T12:30:00.000Z',
    expiresAt: '2026-02-28T12:30:00.000Z',
    originalPurchaseId: '00000000-0000-4000-8000-000000000201',
    upgradedFromLicenseId: null,
    createdAt: '2026-01-31T12:30:00.000Z',
    updatedAt: '2026-01-31T12:30:00.000Z',
    ...overrides,
  };
}

describe('natural calendar licence expiration', () => {
  it('clamps a 31 January purchase to the last day of February', () => {
    assert.equal(
      calculateLicenseExpiration('2025-01-31T12:30:00.000Z', 'one_month'),
      '2025-02-28T12:30:00.000Z',
    );
  });

  it('uses 29 February in a leap year', () => {
    assert.equal(
      calculateLicenseExpiration('2024-01-31T12:30:00.000Z', 'one_month'),
      '2024-02-29T12:30:00.000Z',
    );
  });

  it('calculates six and twelve months from the original instant', () => {
    assert.equal(
      calculateLicenseExpiration('2026-08-05T10:15:30.000Z', 'six_months'),
      '2027-02-05T10:15:30.000Z',
    );
    assert.equal(
      calculateLicenseExpiration('2024-02-29T10:15:30.000Z', 'twelve_months'),
      '2025-02-28T10:15:30.000Z',
    );
  });

  it('is independent from the server timezone and preserves the absolute instant', () => {
    assert.equal(
      addCalendarMonthsUtc('2026-01-31T23:30:00+01:00', 1).toISOString(),
      '2026-02-28T22:30:00.000Z',
    );
  });
});

describe('server-side access modes', () => {
  it('grants Particular full access strictly before expiresAt', () => {
    const context = evaluateAccess({
      userId: USER_ID,
      licenses: [paidLicense()],
      now: '2026-02-28T12:29:59.999Z',
    });
    assert.equal(context.tier, 'particular');
    assert.equal(context.mode, 'full');
    assert.equal(context.canManageFullCases, true);
    assert.equal(context.canUseProfessional, false);
  });

  it('switches to read-only at the exact expiration instant', () => {
    const context = evaluateAccess({
      userId: USER_ID,
      licenses: [paidLicense()],
      now: '2026-02-28T12:30:00.000Z',
    });
    assert.equal(context.tier, 'particular');
    assert.equal(context.mode, 'read_only');
    assert.equal(context.canUseFreeChecker, true);
    assert.equal(context.canViewPaidCases, true);
    assert.equal(context.canManageFullCases, false);
    assert.equal(context.expiredAt, '2026-02-28T12:30:00.000Z');
  });

  it('retains historical read-only data after refunds and revocations', () => {
    for (const status of ['refunded', 'revoked'] as const) {
      const context = evaluateAccess({
        userId: USER_ID,
        licenses: [paidLicense({ status })],
        now: '2026-02-01T00:00:00.000Z',
      });
      assert.equal(context.mode, 'read_only');
      assert.equal(context.canViewHistoricalPaidData, true);
      assert.equal(context.canManageFullCases, false);
    }
  });

  it('uses the latest started reversed period as read-only history', () => {
    const oldExpired = paidLicense({
      id: '00000000-0000-4000-8000-000000000102',
      status: 'expired',
      startsAt: '2025-08-01T00:00:00.000Z',
      expiresAt: '2025-09-01T00:00:00.000Z',
      createdAt: '2025-08-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z',
    });
    for (const status of ['refunded', 'revoked'] as const) {
      const context = evaluateAccess({
        userId: USER_ID,
        licenses: [oldExpired, paidLicense({ status })],
        now: '2026-02-01T00:00:00.000Z',
      });
      assert.equal(context.tier, 'particular');
      assert.equal(context.mode, 'read_only');
      assert.equal(context.canViewHistoricalPaidData, true);
    }
  });

  it('does not treat a pending payment as paid access history', () => {
    const context = evaluateAccess({
      userId: USER_ID,
      licenses: [paidLicense({ status: 'pending_payment' })],
      now: '2026-02-01T00:00:00.000Z',
    });
    assert.equal(context.mode, 'free');
    assert.equal(context.canViewPaidCases, false);
  });

  it('does not grant a future scheduled period before its start', () => {
    const context = evaluateAccess({
      userId: USER_ID,
      licenses: [paidLicense({
        status: 'scheduled',
        startsAt: '2026-03-01T00:00:00.000Z',
        expiresAt: '2026-04-01T00:00:00.000Z',
      })],
      now: '2026-02-28T23:59:59.999Z',
    });
    assert.equal(context.mode, 'free');
    assert.equal(context.scheduledLicense?.status, 'scheduled');
    assert.equal(context.canCreateFullCases, false);
  });

  it('activates a scheduled period logically at the exact start', () => {
    const context = evaluateAccess({
      userId: USER_ID,
      licenses: [paidLicense({
        status: 'scheduled',
        startsAt: '2026-03-01T00:00:00.000Z',
        expiresAt: '2026-04-01T00:00:00.000Z',
      })],
      now: '2026-03-01T00:00:00.000Z',
    });
    assert.equal(context.mode, 'full');
    assert.equal(context.canRunFiscalCalculations, true);
  });

  it('does not expose a scheduled renewal refunded before it starts', () => {
    const context = evaluateAccess({
      userId: USER_ID,
      licenses: [paidLicense({
        status: 'refunded',
        startsAt: '2026-03-01T00:00:00.000Z',
        expiresAt: '2026-04-01T00:00:00.000Z',
      })],
      now: '2026-02-28T23:59:59.999Z',
    });
    assert.equal(context.mode, 'free');
    assert.equal(context.scheduledLicense, null);
    assert.equal(context.canViewHistoricalPaidData, false);
  });

  it('grants professional features only to an active professional licence', () => {
    const professional = paidLicense({ tier: 'professional' });
    const context = evaluateAccess({
      userId: USER_ID,
      licenses: [professional],
      now: '2026-02-01T00:00:00.000Z',
    });
    assert.equal(context.canUseProfessional, true);
    assert.doesNotThrow(() => assertCapability(context, 'use_professional_tools'));
  });

  it('rejects professional operations for Particular', () => {
    const context = evaluateAccess({
      userId: USER_ID,
      licenses: [paidLicense()],
      now: '2026-02-01T00:00:00.000Z',
    });
    assert.throws(
      () => assertCapability(context, 'use_professional_tools'),
      (error: unknown) => error instanceof AccessDeniedError && error.code === 'access_denied',
    );
  });

  it('does not derive access from injected cookie or client metadata fields', () => {
    const manipulatedInput = {
      userId: USER_ID,
      licenses: [],
      now: '2026-02-01T00:00:00.000Z',
      cookieTier: 'professional',
      userMetadata: { tier: 'professional' },
    };
    const context = evaluateAccess(manipulatedInput);
    assert.equal(context.tier, 'free');
    assert.equal(context.mode, 'free');
    assert.equal(context.canUseProfessional, false);
  });
});
