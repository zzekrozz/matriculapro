import { calculateLicenseExpiration } from './calendar';
import type { LicenseDuration, PaidAccessTier, UserLicense } from './types';
import { DateTime } from 'luxon';

export const LICENSE_BUSINESS_TIME_ZONE = 'Europe/Madrid';

function asDateTime(value: string | Date): DateTime {
  const dateTime = value instanceof Date
    ? DateTime.fromJSDate(value)
    : DateTime.fromISO(value, { setZone: true });
  if (!dateTime.isValid) throw new RangeError('date must be valid');
  return dateTime;
}

export type RenewalRejectionReason =
  | 'missing_paid_license'
  | 'tier_change_not_allowed'
  | 'renewal_window_not_open'
  | 'license_not_renewable';

export type RenewalQuote =
  | {
      eligible: true;
      tier: PaidAccessTier;
      duration: LicenseDuration;
      startsAt: string;
      expiresAt: string;
      status: 'scheduled' | 'active';
    }
  | { eligible: false; reason: RenewalRejectionReason };

/**
 * The 30-day boundary is an inclusive instant. Periods remain half-open and
 * calendar-month expiration is derived from the scheduled start, so no paid
 * day is lost and January/leap-year boundaries remain deterministic.
 */
export function quoteRenewal(input: {
  currentLicense: UserLicense | null;
  tier: PaidAccessTier;
  duration: LicenseDuration;
  now?: string | Date;
}): RenewalQuote {
  const now = new Date(input.now ?? new Date());
  const license = input.currentLicense;
  if (!license || license.tier === 'free' || !license.expiresAt) {
    return { eligible: false, reason: 'missing_paid_license' };
  }
  if (license.tier !== input.tier) return { eligible: false, reason: 'tier_change_not_allowed' };
  if (!['active', 'expired'].includes(license.status)) {
    return { eligible: false, reason: 'license_not_renewable' };
  }
  const expiresAt = new Date(license.expiresAt);
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(expiresAt.getTime())) {
    return { eligible: false, reason: 'license_not_renewable' };
  }
  if (
    license.status === 'active'
    && now.getTime() < new Date(renewalWindowOpensAt(expiresAt)).getTime()
  ) {
    return { eligible: false, reason: 'renewal_window_not_open' };
  }
  const startsAt = license.status === 'active' && expiresAt.getTime() > now.getTime()
    ? expiresAt.toISOString()
    : now.toISOString();
  return {
    eligible: true,
    tier: input.tier,
    duration: input.duration,
    startsAt,
    expiresAt: calculateLicenseExpiration(startsAt, input.duration),
    status: new Date(startsAt).getTime() > now.getTime() ? 'scheduled' : 'active',
  };
}

export function renewalWindowOpensAt(expiresAt: string | Date): string {
  const boundary = asDateTime(expiresAt)
    .setZone(LICENSE_BUSINESS_TIME_ZONE)
    .minus({ days: 30 })
    .toUTC()
    .toISO();
  if (!boundary) throw new RangeError('expiresAt must be valid');
  return boundary;
}

export function isWithinRenewalWindow(now: string | Date, expiresAt: string | Date): boolean {
  const current = asDateTime(now).toUTC();
  const expiry = asDateTime(expiresAt).toUTC();
  const opens = asDateTime(renewalWindowOpensAt(expiresAt)).toUTC();
  return current.toMillis() >= opens.toMillis() && current.toMillis() < expiry.toMillis();
}

export function formatRenewalWindowOpenEs(expiresAt: string | Date): string {
  return asDateTime(renewalWindowOpensAt(expiresAt))
    .setZone(LICENSE_BUSINESS_TIME_ZONE)
    .setLocale('es')
    .toLocaleString({
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
}
