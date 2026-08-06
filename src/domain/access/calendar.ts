import type { LicenseDuration } from './types';

const MONTHS_BY_DURATION: Readonly<Record<LicenseDuration, number>> = Object.freeze({
  one_month: 1,
  six_months: 6,
  twelve_months: 12,
});

const UPGRADE_WINDOW_DAYS = 15;

function parseInstant(value: string | Date, label: string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError(`${label} must be a valid ISO-8601 instant`);
  }
  return date;
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Adds natural calendar months in UTC and clamps end-of-month dates.
 * Licences use half-open intervals: [startsAt, expiresAt).
 */
export function addCalendarMonthsUtc(value: string | Date, months: number): Date {
  if (!Number.isSafeInteger(months) || months < 0) {
    throw new RangeError('months must be a non-negative integer');
  }

  const source = parseInstant(value, 'value');
  const sourceDay = source.getUTCDate();
  const absoluteMonth = source.getUTCFullYear() * 12 + source.getUTCMonth() + months;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonth = absoluteMonth % 12;
  const targetDay = Math.min(sourceDay, daysInUtcMonth(targetYear, targetMonth));

  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds(),
  ));
}

export function calculateLicenseExpiration(
  startsAt: string | Date,
  duration: LicenseDuration,
): string {
  return addCalendarMonthsUtc(startsAt, MONTHS_BY_DURATION[duration]).toISOString();
}

/** The promotional boundary is inclusive at exactly 15 * 24 hours. */
export function calculateUpgradeDeadline(startsAt: string | Date): string {
  const start = parseInstant(startsAt, 'startsAt');
  return new Date(start.getTime() + UPGRADE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function isInstantInHalfOpenRange(
  instant: string | Date,
  startsAt: string | Date,
  expiresAt: string | Date,
): boolean {
  const nowMs = parseInstant(instant, 'instant').getTime();
  return nowMs >= parseInstant(startsAt, 'startsAt').getTime()
    && nowMs < parseInstant(expiresAt, 'expiresAt').getTime();
}

export function isAtOrBeforeInstant(value: string | Date, boundary: string | Date): boolean {
  return parseInstant(value, 'value').getTime() <= parseInstant(boundary, 'boundary').getTime();
}

export function durationMonths(duration: LicenseDuration): number {
  return MONTHS_BY_DURATION[duration];
}

