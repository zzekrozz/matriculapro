export function parseStrictIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return date;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarMonthsClamped(date: Date, months: number): Date {
  const targetFirst = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const targetLastDay = new Date(Date.UTC(
    targetFirst.getUTCFullYear(),
    targetFirst.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  targetFirst.setUTCDate(Math.min(date.getUTCDate(), targetLastDay));
  return targetFirst;
}

export function addCalendarYearsClamped(date: Date, years: number): Date {
  const targetYear = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, month, Math.min(date.getUTCDate(), lastDay)));
}

export function fullCalendarYearsBetween(start: Date, end: Date): number {
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  if (end < addCalendarYearsClamped(start, years)) years -= 1;
  return Math.max(0, years);
}

export function fullCalendarMonthsBetween(start: Date, end: Date): number {
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
    + end.getUTCMonth() - start.getUTCMonth();
  if (end < addCalendarMonthsClamped(start, months)) months -= 1;
  return Math.max(0, months);
}

export function isInClosedPeriod(date: string, validFrom: string, validTo: string): boolean {
  return date >= validFrom && date <= validTo;
}
