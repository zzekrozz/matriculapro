import { getTaxRate2026, type TaxEpigraph } from '../config/tax-rates-2026';
import type { AutonomousCommunity } from '../types';
import { parseStrictIsoDate } from './date-utils';
import type { CurrentIedmtRateResult } from './types';

const SOURCE_IDS = ['aeat-registration-tax-rates-2026', 'boe-law-38-1992-art-70-current'] as const;

export function resolveCurrentIedmtRate(input: {
  accrualDate: string;
  autonomousCommunity: AutonomousCommunity;
  epigraph: TaxEpigraph;
}): CurrentIedmtRateResult {
  const base = {
    community: input.autonomousCommunity,
    epigraph: input.epigraph,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    sourceIds: [...SOURCE_IDS],
  };
  if (!parseStrictIsoDate(input.accrualDate)) {
    return {
      ...base,
      status: 'blocked',
      rate: null,
      rateExact: null,
      blocker: { id: 'invalid-current-rate-date', message: 'La fecha de devengo no es válida.', sourceIds: [...SOURCE_IDS] },
      explanation: [],
    };
  }
  if (input.accrualDate < base.validFrom || input.accrualDate > base.validTo) {
    return {
      ...base,
      status: 'blocked',
      rate: null,
      rateExact: null,
      blocker: {
        id: 'unsupported-current-rate-period',
        message: 'Los tipos actuales automatizados están versionados únicamente para devengos de 2026.',
        sourceIds: [...SOURCE_IDS],
      },
      explanation: [],
    };
  }
  const rate = getTaxRate2026(input.autonomousCommunity, input.epigraph);
  if (rate === null) {
    return {
      ...base,
      status: 'blocked',
      rate: null,
      rateExact: null,
      blocker: {
        id: 'foral-rate-special-review',
        message: 'Navarra y País Vasco requieren resolver la normativa foral vigente; no se aplica el tipo estatal o autonómico común.',
        sourceIds: [...SOURCE_IDS],
      },
      explanation: [],
    };
  }
  return {
    ...base,
    status: 'resolved',
    rate,
    rateExact: String(rate),
    blocker: null,
    explanation: [{
      id: 'current-iedmt-rate',
      title: 'Tipo actual para la liquidación',
      detail: `El epígrafe ${input.epigraph}.º en ${input.autonomousCommunity} aplica un tipo actual del ${(rate * 100).toFixed(2)} %. Este tipo no se usa para retirar impuestos históricos.`,
      input: {
        accrualDate: input.accrualDate,
        autonomousCommunity: input.autonomousCommunity,
        epigraph: input.epigraph,
      },
      output: { currentIedmtRateForLiquidation: rate },
      sourceIds: [...SOURCE_IDS],
    }],
  };
}
