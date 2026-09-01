const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

/** Local-only owner used while the public beta intentionally has no account. */
export const PUBLIC_BETA_LOCAL_USER_ID = '00000000-0000-4000-8000-00000000b001';

export function parsePublicBetaMode(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return true;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return false;
}

/**
 * Server-side source of truth for the temporary, reversible public beta.
 * The current launch is open by default; set PUBLIC_BETA_MODE=false to restore
 * the commercial/authentication gates deliberately.
 */
export function isPublicBetaEnabled(): boolean {
  return parsePublicBetaMode(process.env.PUBLIC_BETA_MODE);
}
