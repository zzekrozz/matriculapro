import { DOMAIN_REVIEW_DATE } from './constants';
import { getTaxRate2026, type TaxEpigraph } from './config/tax-rates-2026';
import type { CostItem, RegistrationCase, RegistrationTaxRoute, RuleResult, TaxCalculation } from './types';

export function selectM1TaxEpigraph(co2GKm: number): 1 | 2 | 3 | 4 {
  if (co2GKm <= 120) return 1;
  if (co2GKm < 160) return 2;
  if (co2GKm < 200) return 3;
  return 4;
}

export function calculateRegistrationTaxEstimate(
  registrationCase: RegistrationCase,
  taxRoute: RuleResult<RegistrationTaxRoute>,
): TaxCalculation {
  const { vehicle } = registrationCase;
  const enoughData = taxRoute.outcome === 'model-576'
    && registrationCase.autonomousCommunity !== null
    && vehicle.category === 'M1'
    && vehicle.co2GKm !== null
    && vehicle.co2Verified
    && vehicle.co2Source !== 'manual-unverified'
    && vehicle.co2Source !== 'unknown'
    && registrationCase.taxableBase !== null
    && registrationCase.registrationTaxSubjectConfirmed === true
    && registrationCase.taxBenefitKind === 'none'
    && registrationCase.specialCircumstances.length === 0
    && !Object.values(vehicle.reforms).some((value) => value === true);

  if (!enoughData) {
    return {
      caseId: registrationCase.id,
      taxableBase: registrationCase.taxableBase,
      marketValue: registrationCase.marketValue,
      co2GKm: vehicle.co2GKm,
      category: vehicle.category,
      autonomousCommunity: registrationCase.autonomousCommunity,
      epigraph: null,
      rate: null,
      estimatedQuota: null,
      calculatedAt: registrationCase.updatedAt,
      sourceIds: ['boe-law-38-1992', 'aeat-registration-tax-rates-2026', 'boe-market-values-2026'],
    };
  }

  const epigraph = selectM1TaxEpigraph(vehicle.co2GKm as number);
  const rate = getTaxRate2026(registrationCase.autonomousCommunity as NonNullable<RegistrationCase['autonomousCommunity']>, epigraph);
  return {
    caseId: registrationCase.id,
    taxableBase: registrationCase.taxableBase,
    marketValue: registrationCase.marketValue,
    co2GKm: vehicle.co2GKm,
    category: vehicle.category,
    autonomousCommunity: registrationCase.autonomousCommunity,
    epigraph,
    rate,
    estimatedQuota: rate === null ? null : roundCurrency((registrationCase.taxableBase as number) * rate),
    calculatedAt: registrationCase.updatedAt,
    sourceIds: ['boe-law-38-1992', 'aeat-registration-tax-rates-2026', 'boe-market-values-2026'],
  };
}

export function estimateCaseCosts(
  registrationCase: RegistrationCase,
  taxRoute: RuleResult<RegistrationTaxRoute>,
): CostItem[] {
  const calculation = calculateRegistrationTaxEstimate(registrationCase, taxRoute);
  const registrationTax: CostItem = calculation.estimatedQuota === null
    ? {
      id: 'registration-tax',
      title: 'Impuesto de matriculación',
      kind: 'unavailable',
      amount: null,
      currency: 'EUR',
      explanation: 'Estimación no disponible todavía. Faltan datos fiscales.',
      sourceIds: calculation.sourceIds,
      reviewedAt: DOMAIN_REVIEW_DATE,
    }
    : {
      id: 'registration-tax',
      title: `Estimación IEDMT · epígrafe ${calculation.epigraph as TaxEpigraph}`,
      kind: 'estimated',
      amount: calculation.estimatedQuota,
      currency: 'EUR',
      explanation: `Base declarada ${formatMoney(calculation.taxableBase as number)} × ${((calculation.rate as number) * 100).toFixed(2)} %. Estimación orientativa: comprueba los datos en la AEAT antes de presentar.`,
      sourceIds: calculation.sourceIds,
      reviewedAt: DOMAIN_REVIEW_DATE,
    };

  return [
    registrationTax,
    {
      id: 'itv',
      title: 'ITV previa a matriculación',
      kind: 'variable',
      amount: null,
      currency: 'EUR',
      explanation: 'El precio depende de la comunidad, estación, categoría y ruta técnica.',
      sourceIds: ['industry-itv-manual-7-9'],
      reviewedAt: DOMAIN_REVIEW_DATE,
    },
    {
      id: 'ivtm',
      title: 'IVTM',
      kind: 'variable',
      amount: null,
      currency: 'EUR',
      explanation: registrationCase.municipality
        ? `Debe liquidarse o justificarse en ${registrationCase.municipality}; depende de potencia fiscal, fecha y bonificaciones.`
        : 'Falta el municipio. No existe un importe nacional único.',
      sourceIds: ['dgt-eu-registration', 'boe-local-finance-law-2-2004'],
      reviewedAt: DOMAIN_REVIEW_DATE,
    },
    {
      id: 'dgt-fee',
      title: 'Tasa DGT',
      kind: 'variable',
      amount: null,
      currency: 'EUR',
      explanation: 'Comprueba el importe vigente de la tasa aplicable en la Sede DGT antes del pago.',
      sourceIds: ['dgt-ordinary-registration'],
      reviewedAt: DOMAIN_REVIEW_DATE,
    },
    {
      id: 'plates-and-insurance',
      title: 'Placas y seguro',
      kind: 'variable',
      amount: null,
      currency: 'EUR',
      explanation: 'Las placas se fabrican tras la asignación de matrícula; el seguro debe estar vigente antes de circular.',
      sourceIds: ['dgt-ordinary-registration'],
      reviewedAt: DOMAIN_REVIEW_DATE,
    },
  ];
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}
