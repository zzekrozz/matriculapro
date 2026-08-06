/**
 * Orden HAC/1501/2025, artículo 5 y anexo IV, vigente desde 2026-01-01.
 * Fuente primaria: BOE-A-2025-26357.
 *
 * Cada límite es inclusivo: exactamente un año conserva el 100 %, exactamente
 * dos años conserva el 84 %, etc. Solo el instante posterior al aniversario
 * entra en el tramo siguiente.
 */
export const DEPRECIATION_SOURCE = {
  id: 'boe-order-hac-1501-2025-annex-iv',
  boeId: 'BOE-A-2025-26357',
  order: 'HAC/1501/2025',
  article: 'Artículo 5 y anexo IV',
  effectiveFrom: '2026-01-01',
  reviewedAt: '2026-08-05',
  url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26357',
} as const;

export const DEPRECIATION_BY_MAXIMUM_YEARS = [
  { maximumYearsInclusive: 1, percentage: 1, percentageText: '1' },
  { maximumYearsInclusive: 2, percentage: 0.84, percentageText: '0.84' },
  { maximumYearsInclusive: 3, percentage: 0.67, percentageText: '0.67' },
  { maximumYearsInclusive: 4, percentage: 0.56, percentageText: '0.56' },
  { maximumYearsInclusive: 5, percentage: 0.47, percentageText: '0.47' },
  { maximumYearsInclusive: 6, percentage: 0.39, percentageText: '0.39' },
  { maximumYearsInclusive: 7, percentage: 0.34, percentageText: '0.34' },
  { maximumYearsInclusive: 8, percentage: 0.28, percentageText: '0.28' },
  { maximumYearsInclusive: 9, percentage: 0.24, percentageText: '0.24' },
  { maximumYearsInclusive: 10, percentage: 0.19, percentageText: '0.19' },
  { maximumYearsInclusive: 11, percentage: 0.17, percentageText: '0.17' },
  { maximumYearsInclusive: 12, percentage: 0.13, percentageText: '0.13' },
] as const;

export const OVER_TWELVE_YEARS_PERCENTAGE = {
  percentage: 0.1,
  percentageText: '0.10',
} as const;

/** Resultado adicional al 70 % para usos profesionales que cumplan el anexo IV. */
export const EXCLUSIVE_PROFESSIONAL_USE_FACTOR = '0.70' as const;
