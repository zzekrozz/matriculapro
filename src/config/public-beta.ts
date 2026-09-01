const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function parsePublicBetaMode(value: string | undefined): boolean {
  return TRUE_VALUES.has(value?.trim().toLowerCase() ?? '');
}

/** Server-side source of truth for the temporary, reversible public beta. */
export function isPublicBetaEnabled(): boolean {
  return parsePublicBetaMode(process.env.PUBLIC_BETA_MODE);
}
