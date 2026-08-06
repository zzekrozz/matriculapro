import { DOMAIN_REVIEW_DATE, EEA_NON_EU_COUNTRY_CODES, EU_COUNTRY_CODES } from './constants';
import type { OriginZone, RuleResult, VatVehicleStatus } from './types';

function parseIsoDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetFirst = new Date(Date.UTC(year, month + months, 1));
  const lastDay = new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0)).getUTCDate();
  targetFirst.setUTCDate(Math.min(day, lastDay));
  return targetFirst;
}

export function classifyVatVehicleStatus(input: {
  firstRegistrationDate: string | null;
  mileageKm: number | null;
  referenceDate: string | null;
}): RuleResult<VatVehicleStatus> {
  const missingData: string[] = [];
  if (!input.firstRegistrationDate) missingData.push('Fecha de primera puesta en servicio');
  if (input.mileageKm === null) missingData.push('Kilometraje');
  if (!input.referenceDate) missingData.push('Fecha de entrega, compra o evaluación');

  if (missingData.length > 0) {
    return {
      ruleId: 'vat-new-or-used',
      outcome: 'undetermined',
      reason: 'No se puede determinar si el vehículo es nuevo o usado a efectos de IVA sin fecha y kilometraje.',
      usedData: {
        firstRegistrationDate: input.firstRegistrationDate,
        mileageKm: input.mileageKm,
        referenceDate: input.referenceDate,
      },
      missingData,
      sourceIds: ['aeat-vat-new-vehicle', 'boe-vat-law-37-1992'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'low',
      blocking: true,
    };
  }

  const firstRegistration = parseIsoDate(input.firstRegistrationDate as string);
  const referenceDate = parseIsoDate(input.referenceDate as string);
  if (!firstRegistration || !referenceDate || referenceDate < firstRegistration) {
    return {
      ruleId: 'vat-new-or-used',
      outcome: 'undetermined',
      reason: 'Las fechas introducidas no son coherentes y deben revisarse.',
      usedData: {
        firstRegistrationDate: input.firstRegistrationDate,
        mileageKm: input.mileageKm,
        referenceDate: input.referenceDate,
      },
      missingData: ['Fechas válidas y coherentes'],
      sourceIds: ['aeat-vat-new-vehicle', 'boe-vat-law-37-1992'],
      reviewedAt: DOMAIN_REVIEW_DATE,
      confidence: 'low',
      blocking: true,
    };
  }

  const sixMonthAnniversary = addCalendarMonths(firstRegistration, 6);
  const deliveredBeforeSixMonths = referenceDate < sixMonthAnniversary;
  const sixThousandKmOrLess = (input.mileageKm as number) <= 6_000;
  const isNew = deliveredBeforeSixMonths || sixThousandKmOrLess;

  const triggers = [
    deliveredBeforeSixMonths ? 'la entrega se produce antes de cumplir seis meses' : null,
    sixThousandKmOrLess ? 'el vehículo tiene 6.000 km o menos' : null,
  ].filter((item): item is string => Boolean(item));

  return {
    ruleId: 'vat-new-or-used',
    outcome: isNew ? 'new' : 'used',
    reason: isNew
      ? `Se considera nuevo a efectos de IVA porque ${triggers.join(' y ')}. Basta una de las dos condiciones.`
      : 'Se considera usado a efectos de IVA: la entrega no es anterior al sexto mes y el kilometraje supera 6.000 km.',
    usedData: {
      firstRegistrationDate: input.firstRegistrationDate,
      mileageKm: input.mileageKm,
      referenceDate: input.referenceDate,
      sixMonthAnniversary: sixMonthAnniversary.toISOString().slice(0, 10),
    },
    missingData: [],
    sourceIds: ['aeat-vat-new-vehicle', 'boe-vat-law-37-1992'],
    reviewedAt: DOMAIN_REVIEW_DATE,
    confidence: 'high',
    blocking: false,
  };
}

export function classifyOriginZone(input: {
  registrationCountry: string;
  firstEntryIntoEuDate: string | null;
  customsUnionStatusConfirmed: boolean | null;
  northernIrelandV5cConfirmed: boolean | null;
}): RuleResult<OriginZone> {
  const country = input.registrationCountry.trim().toUpperCase();
  let outcome: OriginZone = 'unknown';
  let reason = 'No se ha podido identificar la zona de procedencia.';
  let blocking = true;
  let confidence: RuleResult<OriginZone>['confidence'] = 'low';

  if (country === 'ES') {
    outcome = 'spain';
    reason = 'El vehículo figura con procedencia española; debe descartarse una rehabilitación o un trámite distinto de importación ordinaria.';
    blocking = true;
    confidence = 'high';
  } else if (EU_COUNTRY_CODES.has(country)) {
    outcome = 'eu';
    reason = 'El país de matriculación pertenece a la Unión Europea.';
    blocking = false;
    confidence = 'high';
  } else if (EEA_NON_EU_COUNTRY_CODES.has(country)) {
    outcome = 'eea';
    reason = 'El país pertenece al EEE, pero no a la unión aduanera ni al territorio IVA de la UE. La vía técnica EEE y la rama fiscal/aduanera deben tratarse por separado.';
    blocking = true;
    confidence = 'high';
  } else if (country === 'XI') {
    if (input.northernIrelandV5cConfirmed === true) {
      outcome = 'eu';
      reason = 'Se ha declarado V5C de Irlanda del Norte. Debe conservarse como prueba; esta comprobación no valida por sí sola la homologación.';
      blocking = false;
      confidence = 'medium';
    } else {
      outcome = 'unknown';
      reason = 'Irlanda del Norte requiere documentación que acredite el tratamiento aplicable, incluido el V5C cuando corresponda.';
      blocking = true;
      confidence = 'low';
    }
  } else if (country === 'GB' || country === 'UK') {
    const cutoff = '2021-01-01';
    const postBrexit = !input.firstEntryIntoEuDate || input.firstEntryIntoEuDate >= cutoff;
    const oldUnionGoodsProven = !postBrexit && input.customsUnionStatusConfirmed === true;
    outcome = oldUnionGoodsProven ? 'eu' : 'uk-post-brexit';
    reason = !oldUnionGoodsProven
      ? 'Los vehículos procedentes de Gran Bretaña importados desde el 1 de enero de 2021 siguen la rama de terceros países, salvo acreditación de estatuto de la UE.'
      : 'La entrada declarada en el territorio UE-27 es anterior a 2021 y se ha confirmado prueba de estatuto de mercancía de la Unión; debe conservarse dicha prueba.';
    blocking = !oldUnionGoodsProven;
    confidence = input.firstEntryIntoEuDate && input.customsUnionStatusConfirmed !== null ? 'medium' : 'low';
  } else if (country && country !== 'UNKNOWN' && country !== 'OTHER') {
    outcome = 'third-country';
    reason = 'El país de matriculación no pertenece a la UE ni al EEE; se abre una rama aduanera y técnica especial.';
    blocking = true;
    confidence = 'high';
  }

  return {
    ruleId: 'origin-zone',
    outcome,
    reason,
    usedData: {
      registrationCountry: country || null,
      firstEntryIntoEuDate: input.firstEntryIntoEuDate,
      customsUnionStatusConfirmed: input.customsUnionStatusConfirmed,
      northernIrelandV5cConfirmed: input.northernIrelandV5cConfirmed,
    },
    missingData: country ? [] : ['País de matriculación'],
    sourceIds: ['dgt-ordinary-registration', 'aeat-brexit-vehicle-note'],
    reviewedAt: DOMAIN_REVIEW_DATE,
    confidence,
    blocking,
  };
}

export function looksLikeEuropeanTypeApproval(fieldK: string | null, approvalNumber: string | null): boolean {
  const candidate = `${fieldK ?? ''} ${approvalNumber ?? ''}`.trim();
  return /(?:^|\s)e\d{1,2}\*/i.test(candidate);
}
