import {
  HISTORICAL_SPECIAL_TERRITORY_COVERAGE,
  HISTORICAL_VAT_RULES,
} from './historical-tax-config';
import { parseStrictIsoDate } from './date-utils';
import type { FiscalTerritory, HistoricalTaxRateResult } from './types';

export function resolveHistoricalVatRate(input: {
  firstRegistrationDate: string;
  territory: FiscalTerritory;
}): HistoricalTaxRateResult {
  if (!parseStrictIsoDate(input.firstRegistrationDate)) {
    return blocked('historical-vat-invalid-date', 'La fecha de primera matriculación no es válida.');
  }
  if (input.territory !== 'peninsula-balearics-common') {
    const coverage = HISTORICAL_SPECIAL_TERRITORY_COVERAGE[input.territory];
    return blocked(
      coverage.blockerId,
      `${coverage.reason} No se extrapola el IVA estatal. Solo puede continuarse con datos introducidos en modo avanzado y revisión externa.`,
      coverage.sourceIds,
    );
  }
  const rule = HISTORICAL_VAT_RULES.find((candidate) => (
    input.firstRegistrationDate >= candidate.validFrom
    && input.firstRegistrationDate <= candidate.validTo
  ));
  if (!rule) {
    return blocked(
      'historical-vat-unsupported-period',
      'El IVA histórico automático solo está versionado entre 1993-01-01 y 2026-12-31.',
    );
  }
  const rate = Number(rule.rate);
  return {
    status: 'resolved',
    rate,
    rateExact: rule.rate,
    validFrom: rule.validFrom,
    validTo: rule.validTo,
    sourceIds: [rule.sourceId],
    sourceArticle: rule.sourceArticle,
    blocker: null,
    explanation: [{
      id: 'historical-vat-rate',
      title: 'IVA histórico para la minoración',
      detail: `En la fecha de primera matriculación el tipo general versionado era ${rate * 100} %. Este tipo se usa solo dentro del denominador de la minoración.`,
      input: { firstRegistrationDate: input.firstRegistrationDate, territory: input.territory },
      output: { historicalVatRateForResidualTax: rate },
      sourceIds: [rule.sourceId],
    }],
  };
}

function blocked(
  id: string,
  message: string,
  sourceIds: readonly string[] = [],
): HistoricalTaxRateResult {
  return {
    status: 'blocked',
    rate: null,
    rateExact: null,
    validFrom: null,
    validTo: null,
    sourceIds: [...sourceIds],
    sourceArticle: null,
    blocker: { id, message, sourceIds: [...sourceIds] },
    explanation: [],
  };
}
