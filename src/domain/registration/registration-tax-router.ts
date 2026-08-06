import { DOMAIN_REVIEW_DATE } from './constants';
import type { RegistrationCase, RegistrationTaxRoute, RuleResult } from './types';

export function determineRegistrationTaxRoute(registrationCase: RegistrationCase): RuleResult<RegistrationTaxRoute> {
  const { vehicle } = registrationCase;
  const usedData = {
    category: vehicle.category,
    categoryConfirmedOnSpanishItv: vehicle.categoryConfirmedOnSpanishItv,
    operation: registrationCase.operation,
    registrationTaxSubjectConfirmed: registrationCase.registrationTaxSubjectConfirmed,
    taxBenefitKind: registrationCase.taxBenefitKind,
    taxBenefitRequiresPriorRecognition: registrationCase.taxBenefitRequiresPriorRecognition,
    n1EconomicUseConfirmed: registrationCase.n1EconomicUseConfirmed,
    n1VatDeductionPercent: registrationCase.n1VatDeductionPercent,
  };

  if (vehicle.category === 'N1') {
    const isMotorhome = registrationCase.specialCircumstances.includes('motorhome');
    const economicUseSupported = registrationCase.n1EconomicUseConfirmed === true
      && (registrationCase.n1VatDeductionPercent ?? 0) >= 50;
    if (!vehicle.categoryConfirmedOnSpanishItv || !economicUseSupported || isMotorhome) {
      return result(
        'special-review',
        'La categoría N1 no implica por sí sola Modelo 06. Deben confirmarse categoría/configuración, afectación significativa a una actividad económica y posibles excepciones, incluida la configuración como vivienda.',
        usedData,
        [
          ...(!vehicle.categoryConfirmedOnSpanishItv ? ['Categoría definitiva en ficha ITV española'] : []),
          ...(!economicUseSupported ? ['Uso económico y porcentaje de deducción de IVA acreditado'] : []),
          ...(isMotorhome ? ['Revisión específica de vehículo acondicionado como vivienda'] : []),
        ],
        ['aeat-model-06-instructions', 'boe-law-38-1992'],
        true,
        'medium',
      );
    }
    return result(
      'model-06',
      'La categoría N1 y su afectación económica acreditada abren la declaración de posible no sujeción mediante Modelo 06; no se aplica la tabla de CO₂ de M1.',
      usedData,
      ['Confirmación de que no concurre una excepción de sujeción por configuración o uso'],
      ['aeat-model-06', 'aeat-model-06-instructions'],
      false,
      'medium',
    );
  }

  if (vehicle.category === 'N2' || vehicle.category === 'N3') {
    const isMotorhome = registrationCase.specialCircumstances.includes('motorhome');
    if (!vehicle.categoryConfirmedOnSpanishItv || isMotorhome) {
      return result(
        'special-review',
        'N2/N3 debe confirmarse en ficha ITV y no puede tratarse como no sujeto si está acondicionado como vivienda sin revisar su sujeción.',
        usedData,
        [
          ...(!vehicle.categoryConfirmedOnSpanishItv ? ['Categoría definitiva en ficha ITV española'] : []),
          ...(isMotorhome ? ['Configuración como vivienda y sujeción específica'] : []),
        ],
        ['aeat-model-06-instructions', 'boe-law-38-1992'],
        true,
        'medium',
      );
    }
    return result(
      'model-06',
      'La categoría N2/N3 confirmada abre una posible no sujeción mediante Modelo 06, sin aplicar la tabla M1 y revisando las excepciones por configuración.',
      usedData,
      ['Categoría y configuración confirmadas en ficha ITV española'],
      ['aeat-model-06-instructions', 'boe-law-38-1992'],
      false,
      'medium',
    );
  }

  if (vehicle.category === 'M2' || vehicle.category === 'M3') {
    return result(
      'special-review',
      'M2/M3 queda fuera de la automatización del MVP. Puede existir no sujeción declarable mediante Modelo 06, pero debe confirmarse categoría, configuración y documentación antes de recomendarlo.',
      usedData,
      ['Categoría confirmada en ficha ITV española'],
      ['aeat-model-06-instructions'],
      true,
      'medium',
    );
  }

  if (registrationCase.operation === 'relocation') {
    const dates = registrationCase.relocationDates;
    const residenceMonths = fullMonthsBetween(dates.previousResidenceFrom, dates.spanishResidenceFrom);
    const useMonths = fullMonthsBetween(dates.useFrom, dates.spanishResidenceFrom);
    const missing = [
      !dates.previousResidenceFrom ? 'Inicio de residencia anterior' : null,
      !dates.spanishResidenceFrom ? 'Inicio de residencia en España' : null,
      !dates.ownershipFrom ? 'Fecha desde la que es propietario' : null,
      !dates.useFrom ? 'Fecha desde la que usa el vehículo' : null,
      residenceMonths !== null && residenceMonths < 12 ? 'Residencia fuera de España durante al menos 12 meses' : null,
      useMonths !== null && useMonths < 6 ? 'Uso del vehículo durante al menos 6 meses antes del traslado' : null,
      registrationCase.relocationNormalTaxationConfirmed !== true ? 'Adquisición con tributación normal en el país de origen' : null,
      registrationCase.relocationRegistrationDeadlineConfirmed !== true ? 'Comprobación del plazo aplicable de matriculación' : null,
      !registrationCase.relocationNonTransferAcknowledged ? 'Compromiso de no transmisión durante 12 meses' : null,
    ].filter((item): item is string => Boolean(item));
    return result(
      missing.length ? 'special-review' : 'model-06',
      missing.length
        ? 'El traslado de residencia puede dar lugar a exención, pero no se selecciona modelo hasta acreditar fechas, propiedad y uso.'
        : 'Las condiciones declaradas abren una ruta de posible exención mediante Modelo 06. Deben conservarse pruebas y confirmarse antes de presentar.',
      usedData,
      missing,
      ['aeat-model-06', 'dgt-eu-registration'],
      true,
      missing.length ? 'low' : 'medium',
    );
  }

  if (registrationCase.taxBenefitKind === 'unknown') {
    return result(
      'special-review',
      'No se ha confirmado si existe no sujeción, exención o reducción.',
      usedData,
      ['Confirmación de posibles beneficios fiscales'],
      ['aeat-model-05', 'aeat-model-06', 'aeat-model-576'],
      true,
      'low',
    );
  }

  if (registrationCase.taxBenefitKind !== 'none') {
    if (registrationCase.taxBenefitRequiresPriorRecognition === true) {
      return result(
        'model-05',
        registrationCase.taxBenefitKind === 'reduction'
          ? 'La reducción declarada requiere reconocimiento previo mediante Modelo 05 y, una vez reconocida, autoliquidación posterior mediante Modelo 576 con la base reducida.'
          : 'El beneficio fiscal declarado requiere reconocimiento previo de la AEAT antes de la matriculación definitiva.',
        { ...usedData, followUpModel576: registrationCase.taxBenefitKind === 'reduction' },
        [],
        ['aeat-model-05'],
        false,
        'medium',
      );
    }
    if (registrationCase.taxBenefitRequiresPriorRecognition === false) {
      return result(
        'model-06',
        'El supuesto declarado de no sujeción o exención no requiere reconocimiento previo y puede corresponder al Modelo 06.',
        usedData,
        [],
        ['aeat-model-06'],
        false,
        'medium',
      );
    }
    return result(
      'special-review',
      'Existe un posible beneficio fiscal, pero falta determinar si requiere reconocimiento previo (Modelo 05) o declaración sin reconocimiento previo (Modelo 06).',
      usedData,
      ['Naturaleza y requisitos del beneficio fiscal'],
      ['aeat-model-05', 'aeat-model-06'],
      true,
      'low',
    );
  }

  if (vehicle.category !== 'M1') {
    return result(
      'special-review',
      'La categoría no está dentro de la ruta automatizada M1 del MVP.',
      usedData,
      ['Revisión de categoría y sujeción'],
      ['boe-law-38-1992'],
      true,
      'low',
    );
  }

  if (registrationCase.registrationTaxSubjectConfirmed === false) {
    return result(
      'special-review',
      'Se ha indicado que la operación no está sujeta, pero debe identificarse y documentarse el fundamento antes de elegir Modelo 06.',
      usedData,
      ['Fundamento legal de la no sujeción'],
      ['aeat-model-06'],
      true,
      'low',
    );
  }
  if (registrationCase.registrationTaxSubjectConfirmed !== true) {
    return result(
      'special-review',
      'La ruta del Modelo 576 no puede confirmarse mientras siga pendiente verificar que la operación está sujeta y no exenta.',
      usedData,
      ['Confirmación expresa de sujeción al IEDMT y ausencia de no sujeción o exención pendiente'],
      ['aeat-model-05', 'aeat-model-06', 'aeat-model-576'],
      true,
      'low',
    );
  }

  return result(
    'model-576',
    'Para un M1 sujeto y sin beneficio fiscal declarado, la ruta ordinaria es la autoliquidación mediante Modelo 576. La cuota sólo se estima cuando están todos los datos fiscales.',
    usedData,
    [],
    ['aeat-model-576', 'boe-law-38-1992'],
    false,
    'high',
  );
}

function fullMonthsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return null;
  let months = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12
    + endDate.getUTCMonth() - startDate.getUTCMonth();
  if (endDate.getUTCDate() < startDate.getUTCDate()) months -= 1;
  return months;
}

function result(
  outcome: RegistrationTaxRoute,
  reason: string,
  usedData: RuleResult<RegistrationTaxRoute>['usedData'],
  missingData: string[],
  sourceIds: string[],
  blocking: boolean,
  confidence: RuleResult<RegistrationTaxRoute>['confidence'],
): RuleResult<RegistrationTaxRoute> {
  return {
    ruleId: 'registration-tax-route',
    outcome,
    reason,
    usedData,
    missingData,
    sourceIds,
    reviewedAt: DOMAIN_REVIEW_DATE,
    confidence,
    blocking,
  };
}
