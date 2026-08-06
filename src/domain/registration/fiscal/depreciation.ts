import {
  DEPRECIATION_BY_MAXIMUM_YEARS,
  DEPRECIATION_SOURCE,
  EXCLUSIVE_PROFESSIONAL_USE_FACTOR,
  OVER_TWELVE_YEARS_PERCENTAGE,
} from './config/depreciation-2026';
import { ExactDecimal, type DecimalInput } from './decimal';
import {
  addCalendarMonthsClamped,
  addCalendarYearsClamped,
  formatIsoDate,
  fullCalendarMonthsBetween,
  fullCalendarYearsBetween,
  parseStrictIsoDate,
} from './date-utils';
import type { DepreciationResult, FiscalExplanationStep } from './types';

export interface DepreciationInput {
  firstServiceDate: string;
  accrualDate: string;
  officialNewValue?: DecimalInput | null;
  professionalUseHistory?: {
    activity: 'taxi' | 'rental' | 'driving-school';
    startDate: string;
    endDate: string;
    exclusive: boolean;
    durationMonths: number;
    evidenceReference: string;
    confirmed: boolean;
  } | null;
}

export function calculateOfficialDepreciation(input: DepreciationInput): DepreciationResult {
  const firstService = parseStrictIsoDate(input.firstServiceDate);
  const accrual = parseStrictIsoDate(input.accrualDate);
  if (!firstService || !accrual) return blocked(input, 'Las fechas deben existir y usar el formato AAAA-MM-DD.');
  if (accrual < firstService) {
    return blocked(input, 'La fecha de devengo no puede ser anterior a la primera puesta en servicio.');
  }

  let officialValue: ExactDecimal | null = null;
  if (input.officialNewValue !== undefined && input.officialNewValue !== null) {
    try {
      officialValue = ExactDecimal.from(input.officialNewValue);
    } catch {
      return blocked(input, 'El precio medio oficial debe ser un decimal válido.');
    }
    if (officialValue.compare(0) <= 0) return blocked(input, 'El precio medio oficial debe ser mayor que cero.');
  }

  const completedYears = fullCalendarYearsBetween(firstService, accrual);
  const totalCompletedMonths = fullCalendarMonthsBetween(firstService, accrual);
  const completedMonthsAfterAnniversary = Math.max(0, totalCompletedMonths - completedYears * 12);
  let percentageText: string = OVER_TWELVE_YEARS_PERCENTAGE.percentageText;
  let maximumYears: number | null = null;
  for (const band of DEPRECIATION_BY_MAXIMUM_YEARS) {
    const anniversary = addCalendarYearsClamped(firstService, band.maximumYearsInclusive);
    if (accrual <= anniversary) {
      percentageText = band.percentageText;
      maximumYears = band.maximumYearsInclusive;
      break;
    }
  }

  const percentage = ExactDecimal.from(percentageText);
  const beforeProfessionalUse = officialValue?.times(percentage) ?? null;
  let professionalUseFactor: ExactDecimal | null = null;
  const professionalUse = input.professionalUseHistory;
  if (professionalUse) {
    const professionalStart = parseStrictIsoDate(professionalUse.startDate);
    const professionalEnd = parseStrictIsoDate(professionalUse.endDate);
    if (!professionalStart || !professionalEnd) {
      return blocked(input, 'El periodo de uso profesional debe contener fechas reales en formato AAAA-MM-DD.');
    }
    const completedProfessionalMonths = professionalEnd >= professionalStart
      ? fullCalendarMonthsBetween(professionalStart, professionalEnd)
      : -1;
    const moreThanSixCalendarMonths = professionalEnd > addCalendarMonthsClamped(professionalStart, 6);
    const periodIsCoherent = professionalStart >= firstService
      && professionalEnd <= accrual
      && professionalEnd >= professionalStart;
    const evidenceComplete = professionalUse.confirmed
      && professionalUse.exclusive
      && periodIsCoherent
      && moreThanSixCalendarMonths
      && professionalUse.durationMonths === completedProfessionalMonths
      && professionalUse.evidenceReference.trim().length > 0;
    if (!evidenceComplete) {
      return blocked(
        input,
        'No se aplica el ajuste profesional del anexo IV: el periodo debe ser coherente, superar seis meses naturales, coincidir con la duración declarada y constar como exclusivo y confirmado por la persona usuaria, con una referencia introducida. MatriculaPro no comprueba el soporte documental.',
      );
    }
    professionalUseFactor = ExactDecimal.from(EXCLUSIVE_PROFESSIONAL_USE_FACTOR);
  }
  const marketValue = beforeProfessionalUse
    ? beforeProfessionalUse.times(professionalUseFactor ?? 1)
    : null;

  const nextAnniversary = addCalendarYearsClamped(firstService, completedYears + 1);
  const bandText = maximumYears === null
    ? 'más de doce años'
    : `hasta ${maximumYears} ${maximumYears === 1 ? 'año' : 'años'}`;
  const explanation: FiscalExplanationStep[] = [{
    id: 'annex-iv-depreciation',
    title: 'Porcentaje oficial por antigüedad',
    detail: `El tramo ${bandText} aplica el ${percentage.times(100).toDecimalString(2)} %. Los aniversarios se calculan por calendario, sin dividir días entre 365.`,
    formula: 'valor de mercado = precio medio oficial × porcentaje del anexo IV',
    input: {
      firstServiceDate: input.firstServiceDate,
      accrualDate: input.accrualDate,
      officialNewValue: officialValue?.toNumber() ?? null,
    },
    output: {
      percentage: percentage.toNumber(),
      valueBeforeProfessionalUseReduction: beforeProfessionalUse?.toNumber() ?? null,
    },
    sourceIds: [DEPRECIATION_SOURCE.id],
  }];
  if (professionalUseFactor) {
    explanation.push({
      id: 'annex-iv-professional-use',
      title: 'Uso profesional confirmado por la persona usuaria',
      detail: 'El resultado de la depreciación se reduce al 70 % porque el uso exclusivo durante más de seis meses consta como confirmado y con referencia introducida. Pendiente de comprobación documental externa; no comprobado por MatriculaPro.',
      formula: 'valor tras uso profesional = valor depreciado × 0,70',
      input: {
        activity: professionalUse?.activity ?? null,
        startDate: professionalUse?.startDate ?? null,
        endDate: professionalUse?.endDate ?? null,
        completedMonths: professionalUse?.durationMonths ?? null,
      },
      output: { professionalUseFactor: 0.7, marketValue: marketValue?.toNumber() ?? null },
      sourceIds: [DEPRECIATION_SOURCE.id],
    });
  }

  return {
    status: 'complete',
    firstServiceDate: input.firstServiceDate,
    accrualDate: input.accrualDate,
    completedYears,
    completedMonthsAfterAnniversary,
    nextAnniversary: formatIsoDate(nextAnniversary),
    percentage: percentage.toNumber(),
    percentageExact: percentage.toDecimalString(),
    officialNewValue: officialValue?.toNumber() ?? null,
    marketValueBeforeProfessionalUseReduction: beforeProfessionalUse?.toNumber() ?? null,
    professionalUseFactor: professionalUseFactor?.toNumber() ?? null,
    marketValueAfterDepreciation: marketValue?.toNumber() ?? null,
    marketValueExact: marketValue?.toDecimalString() ?? null,
    blockers: [],
    sourceIds: [DEPRECIATION_SOURCE.id],
    explanation,
  };
}

function blocked(input: DepreciationInput, message: string): DepreciationResult {
  return {
    status: 'blocked',
    firstServiceDate: input.firstServiceDate || null,
    accrualDate: input.accrualDate || null,
    completedYears: null,
    completedMonthsAfterAnniversary: null,
    nextAnniversary: null,
    percentage: null,
    percentageExact: null,
    officialNewValue: null,
    marketValueBeforeProfessionalUseReduction: null,
    professionalUseFactor: null,
    marketValueAfterDepreciation: null,
    marketValueExact: null,
    blockers: [{ id: 'depreciation-blocked', message, sourceIds: [DEPRECIATION_SOURCE.id] }],
    sourceIds: [DEPRECIATION_SOURCE.id],
    explanation: [],
  };
}
