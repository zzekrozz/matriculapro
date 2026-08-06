import { applyModel576BaseReduction } from './base-reductions';
import { resolveCurrentEpigraph } from './current-epigraph-resolver';
import { resolveCurrentIedmtRate } from './current-iedmt-rate-resolver';
import { ExactDecimal, moneyNumber } from './decimal';
import { calculateOfficialDepreciation } from './depreciation';
import { buildModel576BoxGuidance } from './explanation-builder';
import { resolveHistoricalIedmtRate } from './historical-iedmt-rate-resolver';
import { resolveHistoricalVatRate } from './historical-vat-rate-resolver';
import { calculateResidualTaxMinoration } from './residual-tax-minoration';
import { Model576CalculationInputSchema } from './schemas';
import { classifyFiscalVehicleStatus } from './vehicle-status';
import type {
  FiscalBlocker,
  FiscalExplanationStep,
  FiscalMissingData,
  FiscalWarning,
  Model576Calculation,
  Model576CalculationInput,
  OfficialVehicleMatchResult,
  OfficialVehicleValue,
  UsedInvoiceComparison,
} from './types';

const MODEL_576_SOURCE = 'aeat-model-576-instructions';
/** No existe una deducción lineal general versionada para 2026. */
const OFFICIAL_LINEAR_DEDUCTION_MEASURES_2026: ReadonlyMap<string, string> = new Map();

export function calculateModel576(input: Model576CalculationInput): Model576Calculation {
  const validated = Model576CalculationInputSchema.safeParse(input);
  if (!validated.success) {
    const missingData: FiscalMissingData[] = validated.error.issues.map((issue, index) => ({
      id: `invalid-input-${index + 1}`,
      label: issue.path.join('.') || 'input',
      reason: issue.message,
    }));
    return finish(emptyResult(input, 'incomplete', [], missingData));
  }
  const data = validated.data as Model576CalculationInput;
  if (data.registrationTaxRoute !== 'model-576') {
    return finish(emptyResult(data, 'special-review', [{
      id: 'model-576-route-not-confirmed',
      message: `El router ha determinado ${data.registrationTaxRoute}. No se calculan las casillas del Modelo 576.`,
      sourceIds: ['aeat-model-05', 'aeat-model-06', MODEL_576_SOURCE],
    }]));
  }
  if (!data.registrationTaxSubjectConfirmed) {
    return finish(emptyResult(data, 'blocked', [{
      id: 'model-576-subjection-not-confirmed',
      message: 'La selección del Modelo 576 no basta: debe confirmarse expresamente que el caso está sujeto, no exento y no tiene pendiente otra ruta fiscal.',
      sourceIds: ['aeat-model-05', 'aeat-model-06', MODEL_576_SOURCE],
    }]));
  }

  const blockers: FiscalBlocker[] = [];
  const warnings: FiscalWarning[] = [];
  const explanation: FiscalExplanationStep[] = [];
  const sourceIds = new Set<string>([MODEL_576_SOURCE, 'boe-law-38-1992']);
  const vehicleStatus = classifyFiscalVehicleStatus({
    firstRegistrationDate: data.firstRegistrationDate,
    referenceDate: data.referenceDate,
    mileageKm: data.mileageKm,
    firstService: data.firstService,
  });
  addSources(sourceIds, vehicleStatus.sourceIds);
  explanation.push(...vehicleStatus.explanation);
  blockers.push(...vehicleStatus.blockers);
  if (vehicleStatus.vehicleStatus === null) {
    return finish({
      ...emptyResult(data, 'blocked', blockers),
      explanation,
      sourceIds: [...sourceIds],
    });
  }

  const isNew = vehicleStatus.vehicleStatus === 'new';
  if (isNew && data.valuation.method !== 'new-vehicle-vat-base') {
    blockers.push({
      id: 'new-vehicle-needs-vat-base',
      message: 'Un medio de transporte nuevo debe usar la base de IVA, impuesto equivalente o contraprestación aplicable; no se deprecia.',
      sourceIds: ['boe-law-38-1992-art-69-residual-tax', MODEL_576_SOURCE],
    });
  }
  if (!isNew && data.valuation.method === 'new-vehicle-vat-base') {
    blockers.push({
      id: 'used-vehicle-needs-market-value',
      message: 'Un medio de transporte usado debe partir de su valor de mercado; la factura no sustituye automáticamente esa valoración.',
      sourceIds: ['boe-law-38-1992-art-69-residual-tax', MODEL_576_SOURCE],
    });
  }
  if (blockers.length > 0) {
    return finish({
      ...emptyResult(data, 'blocked', blockers),
      vehicleStatus: vehicleStatus.vehicleStatus,
      explanation,
      sourceIds: [...sourceIds],
    });
  }

  let officialVehicleValue: ExactDecimal | null = null;
  let depreciationPercentage: number | null = null;
  let marketValue: ExactDecimal | null = null;
  let catalogVersion: string | null = null;
  let invoicePrice: string | number | null | undefined;

  if (data.valuation.method === 'new-vehicle-vat-base') {
    const originalCurrencyBase = ExactDecimal.from(data.valuation.vatTaxableBase);
    const currency = data.valuation.currency.toUpperCase();
    let exchangeRate = ExactDecimal.from(1);
    if (currency !== 'EUR') {
      if (data.valuation.exchangeRateToEur === null || data.valuation.exchangeRateToEur === undefined) {
        blockers.push({
          id: 'missing-exchange-rate',
          message: 'La base de un vehículo nuevo en moneda distinta de EUR requiere el tipo de cambio a euros y su fuente.',
          sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
        });
      } else {
        exchangeRate = ExactDecimal.from(data.valuation.exchangeRateToEur);
      }
    } else if (
      data.valuation.exchangeRateToEur !== null
      && data.valuation.exchangeRateToEur !== undefined
      && ExactDecimal.from(data.valuation.exchangeRateToEur).compare(1) !== 0
    ) {
      blockers.push({
        id: 'unexpected-eur-exchange-rate',
        message: 'Una base ya expresada en EUR no debe incorporar un tipo de cambio distinto de 1.',
        sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
      });
    }
    const componentValues = [
      data.valuation.netPrice,
      data.valuation.discounts,
      data.valuation.taxableAccessoryCosts,
    ];
    const presentComponents = componentValues.filter((value) => value !== null && value !== undefined);
    if (presentComponents.length > 0 && presentComponents.length < componentValues.length) {
      warnings.push({
        id: 'incomplete-new-vehicle-base-breakdown',
        message: 'El desglose informativo de precio neto, descuentos y gastos accesorios está incompleto; se conserva la base de IVA aportada como dato principal.',
        sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
      });
    }
    if (presentComponents.length === componentValues.length) {
      const componentBase = ExactDecimal.from(data.valuation.netPrice as string | number)
        .minus(data.valuation.discounts as string | number)
        .plus(data.valuation.taxableAccessoryCosts as string | number);
      const difference = componentBase.minus(originalCurrencyBase);
      const absoluteDifference = difference.isNegative() ? ExactDecimal.from(0).minus(difference) : difference;
      if (absoluteDifference.compare('0.01') > 0) {
        blockers.push({
          id: 'new-vehicle-base-breakdown-mismatch',
          message: 'La base de IVA no coincide con precio neto menos descuentos más gastos accesorios incorporables.',
          sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
        });
      }
    }
    marketValue = originalCurrencyBase.times(exchangeRate);
    explanation.push({
      id: 'new-vehicle-vat-base',
      title: 'Base de vehículo nuevo',
      detail: 'Se utiliza la base imponible determinada para IVA o impuesto equivalente. No se aplican depreciación ni minoración de usado.',
      formula: currency === 'EUR' ? 'base EUR = base de IVA' : 'base EUR = base de IVA en moneda original × tipo de cambio a EUR',
      input: {
        vatTaxableBase: originalCurrencyBase.toNumber(),
        currency,
        exchangeRateToEur: exchangeRate.toNumber(),
        sourceDescription: data.valuation.sourceDescription,
      },
      output: { taxableBase: marketValue.toNumber() },
      sourceIds: ['boe-law-38-1992-art-69-residual-tax', MODEL_576_SOURCE],
    });
  } else if (data.valuation.method === 'official-table') {
    invoicePrice = data.valuation.invoicePrice;
    catalogVersion = data.valuation.catalogVersion;
    addSources(sourceIds, data.valuation.match.sourceIds);
    if (!isCoherentExactOfficialMatch(data.valuation.match)) {
      blockers.push({
        id: data.valuation.match.status === 'exact-confirmed'
          ? 'official-row-match-inconsistent'
          : 'official-row-not-exact-confirmed',
        message: data.valuation.match.status === 'multiple-candidates'
          ? 'La versión del vehículo no está confirmada por la persona usuaria: existen varias filas candidatas.'
          : 'Hace falta que la persona usuaria seleccione y confirme una fila oficial exacta. MatriculaPro no inspecciona documentos ni usará una coincidencia aproximada.',
        sourceIds: data.valuation.match.sourceIds,
      });
    } else {
      officialVehicleValue = ExactDecimal.from(data.valuation.match.selected.newVehicleOfficialValue);
      const depreciation = calculateOfficialDepreciation({
        firstServiceDate: data.firstService?.evidenceConfirmed
          ? data.firstService.date
          : data.firstRegistrationDate,
        accrualDate: data.accrualDate,
        officialNewValue: data.valuation.match.selected.newVehicleOfficialValue,
        professionalUseHistory: data.professionalUseHistory,
      });
      addSources(sourceIds, depreciation.sourceIds);
      explanation.push(...depreciation.explanation);
      blockers.push(...depreciation.blockers);
      depreciationPercentage = depreciation.percentage;
      if (depreciation.marketValueExact !== null) marketValue = ExactDecimal.from(depreciation.marketValueExact);
    }
  } else {
    invoicePrice = data.valuation.invoicePrice;
    if (data.valuation.valuationDate !== data.accrualDate) {
      blockers.push({
        id: 'justified-valuation-date-mismatch',
        message: 'La valoración de mercado aportada debe estar referida a la fecha de devengo del impuesto.',
        sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
      });
    }
    marketValue = ExactDecimal.from(data.valuation.marketValue);
    warnings.push({
      id: 'user-justified-market-value-not-verified',
      message: 'Valor introducido por la persona usuaria y calculado por MatriculaPro. Pendiente de comprobación documental externa; MatriculaPro no comprueba ni garantiza su aceptación por la Administración.',
      sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
    });
    explanation.push({
      id: 'justified-market-value',
      title: 'Valoración de mercado justificada',
      detail: `${data.valuation.methodDescription}. Fuente aportada: ${data.valuation.sourceDescription}.`,
      input: { valuationDate: data.valuation.valuationDate, marketValue: marketValue.toNumber() },
      output: { marketValue: marketValue.toNumber() },
      sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
    });
  }

  if (blockers.length > 0 || !marketValue) {
    return finish({
      ...emptyResult(data, 'blocked', blockers),
      vehicleStatus: vehicleStatus.vehicleStatus,
      officialVehicleValue: officialVehicleValue?.toNumber() ?? null,
      depreciationPercentage,
      marketValueAfterDepreciation: marketValue?.toNumber() ?? null,
      exactValues: {
        ...emptyExactValues(),
        marketValueAfterDepreciation: marketValue?.toDecimalString(18) ?? null,
      },
      warnings,
      explanation,
      sourceIds: [...sourceIds],
      catalogVersion,
    });
  }

  const invoiceComparison = buildInvoiceComparison(invoicePrice, marketValue, warnings);
  let box01Exact = marketValue;
  let historicalVat: number | null = null;
  let historicalIedmt: number | null = null;
  let otherIndirectTotal: number | null = null;
  let residualRemoved: number | null = null;
  let usedAdvancedHistoricalRates = false;

  if (!isNew && data.previouslyRegisteredAbroad) {
    if (!data.historicalTaxes) {
      blockers.push({
        id: 'missing-historical-taxes',
        message: 'Falta confirmar el tipo histórico necesario para calcular la minoración.',
        sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
      });
    } else {
      let vatRate: string | number | null = null;
      let iedmtRate: string | number | null = null;
      let otherRates: Array<string | number> | null = null;
      const rateSources: string[] = [];
      if (data.historicalTaxes.mode === 'automatic') {
        const vat = resolveHistoricalVatRate({
          firstRegistrationDate: data.firstRegistrationDate,
          territory: data.historicalTaxes.territory,
        });
        const iedmt = resolveHistoricalIedmtRate({
          firstRegistrationDate: data.firstRegistrationDate,
          territory: data.historicalTaxes.territory,
          currentAutonomousCommunity: data.currentAutonomousCommunity,
          classification: {
            category: data.vehicle.category,
            co2GKm: data.vehicle.co2GKm,
            co2Verified: data.vehicle.co2Verified,
            singleNonCombustionEngine: data.vehicle.singleNonCombustionEngine,
            vehicleKind: data.vehicle.kind,
          },
        });
        if (vat.blocker) blockers.push(vat.blocker);
        if (iedmt.blocker) blockers.push(iedmt.blocker);
        warnings.push(...iedmt.warnings);
        explanation.push(...vat.explanation, ...iedmt.explanation);
        addSources(sourceIds, vat.sourceIds);
        addSources(sourceIds, iedmt.sourceIds);
        vatRate = vat.rateExact;
        iedmtRate = iedmt.rateExact;
        rateSources.push(...vat.sourceIds, ...iedmt.sourceIds);
        if (
          data.historicalTaxes.territory === 'peninsula-balearics-common'
          && data.historicalTaxes.otherIndirectTaxesConfirmedNone
        ) {
          otherRates = [];
        } else {
          blockers.push({
            id: 'other-indirect-taxes-not-confirmed',
            message: data.historicalTaxes.territory === 'peninsula-balearics-common'
              ? 'Debe confirmarse que no se ha identificado otro impuesto indirecto incorporado.'
              : 'En este territorio tiposOTROS permanece desconocido hasta aportar una fuente territorial; no se fija a cero.',
            sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
          });
        }
      } else {
        usedAdvancedHistoricalRates = true;
        vatRate = data.historicalTaxes.historicalVatRate;
        iedmtRate = data.historicalTaxes.historicalIedmtRate;
        otherRates = data.historicalTaxes.otherIndirectTaxRates;
        rateSources.push('user-provided-historical-tax-source');
        warnings.push({
          id: 'historical-rates-user-provided-unverified',
          message: `Tipos históricos introducidos y confirmados por la persona usuaria (${data.historicalTaxes.sourceDescription}). Pendientes de comprobación documental externa; no comprobados por MatriculaPro.`,
          sourceIds: ['user-provided-historical-tax-source'],
        });
      }

      if (blockers.length === 0) {
        const minoration = calculateResidualTaxMinoration({
          marketValueAfterDepreciation: marketValue.toDecimalString(18),
          firstRegistrationDate: data.firstRegistrationDate,
          currentRegistrationTerritory: data.historicalTaxes.mode === 'automatic'
            ? data.historicalTaxes.territory
            : territoryForCommunity(data.currentAutonomousCommunity),
          historicalVehicleTaxClassification: {
            category: data.vehicle.category,
            co2GKm: data.vehicle.co2GKm,
            co2Verified: data.vehicle.co2Verified,
            singleNonCombustionEngine: data.vehicle.singleNonCombustionEngine,
            vehicleKind: data.vehicle.kind,
          },
          historicalVatRate: vatRate,
          historicalIedmtRate: iedmtRate,
          otherIndirectTaxRates: otherRates,
          rateSourceIds: rateSources,
        });
        blockers.push(...minoration.blockers);
        explanation.push(...minoration.explanation);
        addSources(sourceIds, minoration.sourceIds);
        historicalVat = minoration.historicalVatRate;
        historicalIedmt = minoration.historicalIedmtRate;
        otherIndirectTotal = minoration.otherIndirectTaxRateTotal;
        residualRemoved = minoration.residualTaxAmountRemoved;
        if (
          minoration.exactValues.taxableBaseAfterMinoration !== null
          && vatRate !== null
          && iedmtRate !== null
          && otherRates !== null
        ) {
          const otherRateExact = otherRates.reduce(
            (total, rate) => total.plus(rate),
            ExactDecimal.from(0),
          );
          box01Exact = marketValue.dividedBy(
            ExactDecimal.from(1).plus(vatRate).plus(iedmtRate).plus(otherRateExact),
          );
        }
      }
    }
  }

  const reduction = blockers.length === 0
    ? applyModel576BaseReduction(
        box01Exact.toDecimalString(18),
        data.reductions,
        { vehicleKind: data.vehicle.kind },
      )
    : null;
  if (reduction) {
    blockers.push(...reduction.blockers);
    explanation.push(...reduction.explanation);
    addSources(sourceIds, reduction.sourceIds);
  }
  const reducedBaseExact = reduction?.reducedBaseExact
    ? ExactDecimal.from(reduction.reducedBaseExact)
    : null;

  const epigraphResult = resolveCurrentEpigraph({
    registrationTaxRoute: data.registrationTaxRoute,
    category: data.vehicle.category,
    co2GKm: data.vehicle.co2GKm,
    co2Verified: data.vehicle.co2Verified,
    singleNonCombustionEngine: data.vehicle.singleNonCombustionEngine,
    vehicleKind: data.vehicle.kind,
    motorcyclePowerKw: data.vehicle.motorcyclePowerKw,
    motorcycleMassKg: data.vehicle.motorcycleMassKg,
  });
  blockers.push(...epigraphResult.blockers);
  warnings.push(...epigraphResult.warnings);
  explanation.push(...epigraphResult.explanation);
  addSources(sourceIds, epigraphResult.sourceIds);

  const currentRate = epigraphResult.status === 'resolved' && epigraphResult.epigraph !== null
    ? resolveCurrentIedmtRate({
        accrualDate: data.accrualDate,
        autonomousCommunity: data.currentAutonomousCommunity,
        epigraph: epigraphResult.epigraph,
      })
    : null;
  if (currentRate) {
    if (currentRate.blocker) blockers.push(currentRate.blocker);
    explanation.push(...currentRate.explanation);
    addSources(sourceIds, currentRate.sourceIds);
  }

  let quotaExact: ExactDecimal | null = null;
  let linearDeductionExact: ExactDecimal | null = null;
  let afterDeductionExact: ExactDecimal | null = null;
  let previousReturnsExact: ExactDecimal | null = null;
  let finalExact: ExactDecimal | null = null;
  if (blockers.length === 0 && currentRate?.rateExact !== null && currentRate?.rateExact !== undefined) {
    const applicableBase = reducedBaseExact ?? box01Exact;
    quotaExact = applicableBase.times(currentRate.rateExact);
    linearDeductionExact = ExactDecimal.from(0);
    if (data.linearDeduction && ExactDecimal.from(data.linearDeduction.amount).compare(0) > 0) {
      if (!data.linearDeduction.applicableConfirmed) {
        blockers.push({
          id: 'linear-deduction-not-confirmed',
          message: 'La casilla 05 no es de uso libre: falta que la persona usuaria confirme la medida oficial extraordinaria aplicable y su referencia. MatriculaPro no comprueba el documento.',
          sourceIds: [MODEL_576_SOURCE],
        });
      } else {
        const officialSourceId = OFFICIAL_LINEAR_DEDUCTION_MEASURES_2026.get(
          data.linearDeduction.officialMeasureId,
        );
        if (!officialSourceId || officialSourceId !== data.linearDeduction.sourceId) {
          blockers.push({
            id: 'linear-deduction-measure-not-versioned',
            message: 'No existe una medida oficial de deducción lineal versionada para 2026 con ese identificador y fuente. La casilla 05 permanece bloqueada.',
            sourceIds: [MODEL_576_SOURCE],
          });
        } else {
          linearDeductionExact = ExactDecimal.from(data.linearDeduction.amount);
          addSources(sourceIds, [officialSourceId]);
          if (linearDeductionExact.compare(quotaExact) > 0) {
            blockers.push({
              id: 'linear-deduction-exceeds-quota',
              message: 'La deducción lineal no puede superar la cuota de la casilla 04.',
              sourceIds: [MODEL_576_SOURCE, officialSourceId],
            });
          }
        }
      }
    }
    if (blockers.length === 0) {
      afterDeductionExact = quotaExact.minus(linearDeductionExact);
      previousReturnsExact = ExactDecimal.from(0);
      if (data.complementary?.isComplementary) {
        previousReturnsExact = ExactDecimal.from(data.complementary.previousReturnsAmount);
        if (previousReturnsExact.compare(afterDeductionExact) > 0) {
          blockers.push({
            id: 'previous-returns-exceed-amount',
            message: 'La casilla 07 no puede producir un resultado negativo en la casilla 08.',
            sourceIds: [MODEL_576_SOURCE],
          });
        }
      } else if (data.complementary && ExactDecimal.from(data.complementary.previousReturnsAmount).compare(0) > 0) {
        blockers.push({
          id: 'box-07-only-complementary',
          message: 'La casilla 07 solo puede usarse en una autoliquidación complementaria.',
          sourceIds: [MODEL_576_SOURCE],
        });
      }
      if (blockers.length === 0) finalExact = afterDeductionExact.minus(previousReturnsExact);
    }
  }

  const completed = blockers.length === 0 && finalExact !== null;
  const status = completed
    ? usedAdvancedHistoricalRates
      ? 'special-review'
      : data.valuation.method === 'new-vehicle-vat-base'
        ? 'complete-new-vehicle'
        : data.valuation.method === 'official-table'
          ? 'complete-official-table'
          : 'estimated-justified-market-value'
    : epigraphResult.status === 'special-review'
      ? 'special-review'
      : 'blocked';

  const withoutGuidance: Omit<Model576Calculation, 'boxGuidance'> = {
    status,
    vehicleStatus: vehicleStatus.vehicleStatus,
    valuationMethod: data.valuation.method,
    officialVehicleValue: officialVehicleValue?.toNumber() ?? null,
    depreciationPercentage,
    marketValueAfterDepreciation: marketValue.toNumber(18),
    historicalVatRateForResidualTax: historicalVat,
    historicalIedmtRateForResidualTax: historicalIedmt,
    otherIndirectTaxRateTotal: otherIndirectTotal,
    residualTaxAmountRemoved: residualRemoved,
    box01TaxableBase: moneyNumber(box01Exact),
    reductionKind: reduction?.kind ?? null,
    box02ReducedTaxableBase: reducedBaseExact ? moneyNumber(reducedBaseExact) : null,
    epigraph: epigraphResult.epigraph,
    currentIedmtRateForLiquidation: currentRate?.rate ?? null,
    box04TaxQuota: quotaExact ? moneyNumber(quotaExact) : null,
    box05LinearDeduction: linearDeductionExact ? moneyNumber(linearDeductionExact) : null,
    box06AmountAfterDeduction: afterDeductionExact ? moneyNumber(afterDeductionExact) : null,
    box07PreviousReturnsToDeduct: previousReturnsExact ? moneyNumber(previousReturnsExact) : null,
    box08FinalResult: finalExact ? moneyNumber(finalExact) : null,
    exactValues: {
      marketValueAfterDepreciation: marketValue.toDecimalString(18),
      box01TaxableBase: box01Exact.toDecimalString(18),
      box02ReducedTaxableBase: reducedBaseExact?.toDecimalString(18) ?? null,
      box04TaxQuotaBeforeRounding: quotaExact?.toDecimalString(18) ?? null,
      box08FinalResultBeforeRounding: finalExact?.toDecimalString(18) ?? null,
    },
    usedInvoiceComparison: invoiceComparison,
    missingData: [],
    blockers,
    warnings,
    explanation,
    sourceIds: [...sourceIds],
    catalogVersion,
    calculatedAt: new Date().toISOString(),
  };
  return { ...withoutGuidance, boxGuidance: buildModel576BoxGuidance(withoutGuidance) };
}

function buildInvoiceComparison(
  invoicePriceInput: string | number | null | undefined,
  marketValue: ExactDecimal,
  warnings: FiscalWarning[],
): UsedInvoiceComparison | null {
  if (invoicePriceInput === null || invoicePriceInput === undefined) return null;
  const invoice = ExactDecimal.from(invoicePriceInput);
  const signedDifference = invoice.minus(marketValue);
  const absoluteDifference = signedDifference.isNegative()
    ? ExactDecimal.from(0).minus(signedDifference)
    : signedDifference;
  const percentage = marketValue.compare(0) === 0
    ? null
    : absoluteDifference.dividedBy(marketValue).times(100);
  if (percentage && percentage.compare(20) >= 0) {
    warnings.push({
      id: 'material-invoice-market-difference',
      message: 'Existe una diferencia igual o superior al 20 % entre el precio pagado y la valoración. Puede requerir justificación.',
      sourceIds: ['boe-law-38-1992-art-69-residual-tax'],
    });
  }
  return {
    invoicePrice: invoice.toNumber(),
    officialOrJustifiedMarketValue: marketValue.toNumber(),
    absoluteDifference: absoluteDifference.toNumber(18),
    percentageDifference: percentage?.toNumber(12) ?? null,
    explanation: 'El precio pagado se conserva como comparación, pero no sustituye por sí solo al valor de mercado utilizado en el Modelo 576.',
  };
}

function emptyResult(
  input: Model576CalculationInput,
  status: Model576Calculation['status'],
  blockers: FiscalBlocker[],
  missingData: FiscalMissingData[] = [],
): Omit<Model576Calculation, 'boxGuidance'> {
  return {
    status,
    vehicleStatus: null,
    valuationMethod: input.valuation.method,
    officialVehicleValue: null,
    depreciationPercentage: null,
    marketValueAfterDepreciation: null,
    historicalVatRateForResidualTax: null,
    historicalIedmtRateForResidualTax: null,
    otherIndirectTaxRateTotal: null,
    residualTaxAmountRemoved: null,
    box01TaxableBase: null,
    reductionKind: null,
    box02ReducedTaxableBase: null,
    epigraph: null,
    currentIedmtRateForLiquidation: null,
    box04TaxQuota: null,
    box05LinearDeduction: null,
    box06AmountAfterDeduction: null,
    box07PreviousReturnsToDeduct: null,
    box08FinalResult: null,
    exactValues: emptyExactValues(),
    usedInvoiceComparison: null,
    missingData,
    blockers,
    warnings: [],
    explanation: [],
    sourceIds: [MODEL_576_SOURCE],
    catalogVersion: input.valuation.method === 'official-table' ? input.valuation.catalogVersion : null,
    calculatedAt: new Date().toISOString(),
  };
}

function finish(result: Omit<Model576Calculation, 'boxGuidance'>): Model576Calculation {
  return { ...result, boxGuidance: buildModel576BoxGuidance(result) };
}

function emptyExactValues(): Model576Calculation['exactValues'] {
  return {
    marketValueAfterDepreciation: null,
    box01TaxableBase: null,
    box02ReducedTaxableBase: null,
    box04TaxQuotaBeforeRounding: null,
    box08FinalResultBeforeRounding: null,
  };
}

function addSources(target: Set<string>, sources: readonly string[]): void {
  sources.forEach((source) => target.add(source));
}

function isCoherentExactOfficialMatch(
  match: OfficialVehicleMatchResult,
): match is OfficialVehicleMatchResult & { status: 'exact-confirmed'; selected: OfficialVehicleValue } {
  if (match.status !== 'exact-confirmed' || !match.selected) return false;
  if (match.discrepancies.some((item) => item.blocking)) return false;
  if (match.candidates.length !== 1) return false;
  const candidate = match.candidates[0];
  return candidate.id === match.selected.id
    && candidate.sourceChecksum === match.selected.sourceChecksum
    && candidate.officialRowReference === match.selected.officialRowReference
    && candidate.newVehicleOfficialValue === match.selected.newVehicleOfficialValue;
}

function territoryForCommunity(community: Model576CalculationInput['currentAutonomousCommunity']) {
  if (community === 'canarias') return 'canary-islands' as const;
  if (community === 'ceuta' || community === 'melilla') return 'ceuta-melilla' as const;
  if (community === 'navarra') return 'navarra' as const;
  if (community === 'pais-vasco') return 'basque-country' as const;
  return 'peninsula-balearics-common' as const;
}
