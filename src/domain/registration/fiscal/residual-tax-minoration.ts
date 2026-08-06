import { ExactDecimal } from './decimal';
import { RESIDUAL_TAX_FORMULA_SOURCE } from './historical-tax-config';
import type {
  FiscalBlocker,
  ResidualTaxMinorationInput,
  ResidualTaxMinorationResult,
} from './types';

/**
 * Ley 38/1992, artículo 69.b; desarrollo operativo descrito por la AEAT en las
 * instrucciones de la casilla 01 del Modelo 576.
 *
 * BI = VM / (1 + IVA_historico + IEDMT_historico + otros_indirectos)
 */
export function calculateResidualTaxMinoration(
  input: ResidualTaxMinorationInput,
): ResidualTaxMinorationResult {
  const blockers: FiscalBlocker[] = [];
  let marketValue: ExactDecimal | null = null;
  let historicalVat: ExactDecimal | null = null;
  let historicalIedmt: ExactDecimal | null = null;
  const otherRates: ExactDecimal[] = [];

  try {
    marketValue = ExactDecimal.from(input.marketValueAfterDepreciation);
    if (marketValue.compare(0) <= 0) blockers.push(blocker('invalid-market-value', 'El valor de mercado debe ser mayor que cero.'));
  } catch {
    blockers.push(blocker('invalid-market-value', 'El valor de mercado no es un decimal válido.'));
  }

  if (input.historicalVatRate === null) {
    blockers.push(blocker('missing-historical-vat', 'Falta confirmar el tipo histórico de IVA necesario para calcular la minoración.'));
  } else {
    historicalVat = parseRate(input.historicalVatRate, 'historical-vat-rate', blockers);
  }
  if (input.historicalIedmtRate === null) {
    blockers.push(blocker('missing-historical-iedmt', 'Falta confirmar el tipo histórico de IEDMT necesario para calcular la minoración.'));
  } else {
    historicalIedmt = parseRate(input.historicalIedmtRate, 'historical-iedmt-rate', blockers);
  }
  if (input.otherIndirectTaxRates === null) {
    blockers.push(blocker(
      'unknown-other-indirect-taxes',
      'Debe confirmarse que no hay otros impuestos indirectos incorporados o aportarse sus tipos con fuente.',
    ));
  } else {
    input.otherIndirectTaxRates.forEach((rate, index) => {
      const parsed = parseRate(rate, `other-indirect-tax-${index + 1}`, blockers);
      if (parsed) otherRates.push(parsed);
    });
  }

  if (blockers.length > 0 || !marketValue || !historicalVat || !historicalIedmt) {
    return blockedResult(blockers);
  }

  const otherTotal = otherRates.reduce((total, rate) => total.plus(rate), ExactDecimal.from(0));
  const denominator = ExactDecimal.from(1).plus(historicalVat).plus(historicalIedmt).plus(otherTotal);
  const taxableBase = marketValue.dividedBy(denominator);
  const removed = marketValue.minus(taxableBase);
  const sourceIds = [...new Set([
    RESIDUAL_TAX_FORMULA_SOURCE.id,
    'aeat-model-576-instructions-box-01',
    ...(input.rateSourceIds ?? []),
  ])];

  return {
    marketValueBeforeMinoration: marketValue.toNumber(),
    historicalVatRate: historicalVat.toNumber(),
    historicalIedmtRate: historicalIedmt.toNumber(),
    otherIndirectTaxRateTotal: otherTotal.toNumber(),
    denominator: denominator.toNumber(),
    taxableBaseAfterMinoration: taxableBase.toNumber(18),
    residualTaxAmountRemoved: removed.toNumber(18),
    exactValues: {
      marketValueBeforeMinoration: marketValue.toDecimalString(),
      historicalVatRate: historicalVat.toDecimalString(),
      historicalIedmtRate: historicalIedmt.toDecimalString(),
      otherIndirectTaxRateTotal: otherTotal.toDecimalString(),
      denominator: denominator.toDecimalString(),
      taxableBaseAfterMinoration: taxableBase.toDecimalString(18),
      residualTaxAmountRemoved: removed.toDecimalString(18),
    },
    sourceIds,
    status: 'complete-official-table',
    blockers: [],
    explanation: [{
      id: 'residual-indirect-tax-minoration',
      title: 'Minoración de impuestos indirectos residuales',
      detail: 'El valor usado puede conservar una parte residual de los impuestos que habría soportado el vehículo nuevo en España. Se retira mediante división; no se restan impuestos pagados en otro país.',
      formula: 'BI = VM / [1 + (IVA histórico + IEDMT histórico + otros impuestos indirectos)]',
      input: {
        marketValue: marketValue.toNumber(),
        historicalVatRateForResidualTax: historicalVat.toNumber(),
        historicalIedmtRateForResidualTax: historicalIedmt.toNumber(),
        otherIndirectTaxRateTotal: otherTotal.toNumber(),
      },
      output: {
        denominator: denominator.toNumber(),
        taxableBaseAfterMinoration: taxableBase.toNumber(18),
        residualTaxAmountRemoved: removed.toNumber(18),
      },
      sourceIds,
    }],
  };
}

function parseRate(
  input: string | number,
  id: string,
  blockers: FiscalBlocker[],
): ExactDecimal | null {
  try {
    const rate = ExactDecimal.from(input);
    if (rate.compare(0) < 0 || rate.compare(1) > 0) {
      blockers.push(blocker(id, 'Los tipos deben expresarse en tanto por uno, entre 0 y 1.'));
      return null;
    }
    return rate;
  } catch {
    blockers.push(blocker(id, 'El tipo indicado no es un decimal válido.'));
    return null;
  }
}

function blocker(id: string, message: string): FiscalBlocker {
  return { id, message, sourceIds: [RESIDUAL_TAX_FORMULA_SOURCE.id] };
}

function blockedResult(blockers: FiscalBlocker[]): ResidualTaxMinorationResult {
  return {
    marketValueBeforeMinoration: null,
    historicalVatRate: null,
    historicalIedmtRate: null,
    otherIndirectTaxRateTotal: null,
    denominator: null,
    taxableBaseAfterMinoration: null,
    residualTaxAmountRemoved: null,
    exactValues: {
      marketValueBeforeMinoration: null,
      historicalVatRate: null,
      historicalIedmtRate: null,
      otherIndirectTaxRateTotal: null,
      denominator: null,
      taxableBaseAfterMinoration: null,
      residualTaxAmountRemoved: null,
    },
    sourceIds: [RESIDUAL_TAX_FORMULA_SOURCE.id],
    status: 'blocked',
    blockers,
    explanation: [],
  };
}
