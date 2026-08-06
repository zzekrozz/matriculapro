import type {
  OfficialVehicleDiscrepancy,
  OfficialVehicleMatchResult,
  OfficialVehicleValue,
  VehicleCatalogIdentity,
} from './types';

const SOURCE_ID = 'boe-order-hac-1501-2025-annex-i';

export interface MatchOfficialVehicleInput {
  catalog: readonly OfficialVehicleValue[];
  vehicle: VehicleCatalogIdentity;
  firstRegistrationDate: string;
  confirmedOfficialVehicleId?: string | null;
}

export interface ConfirmOfficialVehicleMatchInput {
  officialVehicle: OfficialVehicleValue;
  vehicle: VehicleCatalogIdentity;
  firstRegistrationDate: string;
}

/**
 * Coincidencia determinista. La normalización solo elimina diferencias de
 * mayúsculas, acentos y puntuación; nunca sustituye una versión por otra
 * "parecida" ni elige silenciosamente la primera fila.
 */
export function matchOfficialVehicle(input: MatchOfficialVehicleInput): OfficialVehicleMatchResult {
  const brandAndModelCandidates = input.catalog.filter((row) => (
    normalizeCatalogText(row.brand) === normalizeCatalogText(input.vehicle.brand)
    && normalizeCatalogText(row.model) === normalizeCatalogText(input.vehicle.model)
  ));

  if (input.confirmedOfficialVehicleId) {
    const selected = input.catalog.find((row) => row.id === input.confirmedOfficialVehicleId) ?? null;
    if (!selected) return notFound('El identificador oficial confirmado no existe en el catálogo consultado.');
    const discrepancies = compareVehicleWithOfficialRow(input.vehicle, selected);
    const outsidePeriod = isOutsideCommercialPeriod(selected, input.firstRegistrationDate);
    if (outsidePeriod) {
      return {
        status: 'outside-commercial-period',
        selected,
        candidates: [selected],
        discrepancies: [
          ...discrepancies,
          {
            field: 'firstRegistrationDate',
            caseValue: input.firstRegistrationDate,
            officialValue: commercialPeriodText(selected),
            blocking: true,
          },
        ],
        sourceIds: [SOURCE_ID],
        explanation: 'La fila fue confirmada, pero la primera matriculación no encaja en su periodo comercial oficial. Requiere revisión.',
      };
    }
    if (discrepancies.some((item) => item.blocking)) {
      return {
        status: 'possible-match',
        selected,
        candidates: [selected],
        discrepancies,
        sourceIds: [SOURCE_ID],
        explanation: 'La fila confirmada presenta discrepancias materiales con el expediente y no se considera una coincidencia exacta.',
      };
    }
    return {
      status: 'exact-confirmed',
      selected,
      candidates: [selected],
      discrepancies,
      sourceIds: [SOURCE_ID],
      explanation: 'La persona usuaria confirmó una fila oficial única y los datos comparables son coherentes.',
    };
  }

  if (brandAndModelCandidates.length === 0) {
    return notFound('No existe una fila con marca y modelo exactos. No se propone una versión aproximada.');
  }

  const exactCandidates = brandAndModelCandidates.filter((row) => (
    !isOutsideCommercialPeriod(row, input.firstRegistrationDate)
    && !compareVehicleWithOfficialRow(input.vehicle, row).some((item) => item.blocking)
  ));
  if (exactCandidates.length > 1) {
    return {
      status: 'multiple-candidates',
      selected: null,
      candidates: exactCandidates,
      discrepancies: [],
      sourceIds: [SOURCE_ID],
      explanation: 'Varias filas cumplen los datos indicados. Debe confirmarse una versión exacta; el motor no elige la primera.',
    };
  }
  if (exactCandidates.length === 1) {
    return {
      status: 'possible-match',
      selected: null,
      candidates: exactCandidates,
      discrepancies: [],
      sourceIds: [SOURCE_ID],
      explanation: 'Hay una candidata exacta, pero aún no ha sido confirmada expresamente por la persona usuaria.',
    };
  }

  const allOutsidePeriod = brandAndModelCandidates.every((row) => isOutsideCommercialPeriod(row, input.firstRegistrationDate));
  return {
    status: allOutsidePeriod ? 'outside-commercial-period' : 'possible-match',
    selected: null,
    candidates: brandAndModelCandidates,
    discrepancies: brandAndModelCandidates.length === 1
      ? compareVehicleWithOfficialRow(input.vehicle, brandAndModelCandidates[0])
      : [],
    sourceIds: [SOURCE_ID],
    explanation: allOutsidePeriod
      ? 'Las filas con marca y modelo exactos quedan fuera del periodo comercial declarado.'
      : 'Existen filas relacionadas, pero ninguna coincide exactamente con todos los datos aportados.',
  };
}

export function confirmOfficialVehicleMatch(input: ConfirmOfficialVehicleMatchInput): OfficialVehicleMatchResult {
  return matchOfficialVehicle({
    catalog: [input.officialVehicle],
    vehicle: input.vehicle,
    firstRegistrationDate: input.firstRegistrationDate,
    confirmedOfficialVehicleId: input.officialVehicle.id,
  });
}

export function compareVehicleWithOfficialRow(
  vehicle: VehicleCatalogIdentity,
  official: OfficialVehicleValue,
): OfficialVehicleDiscrepancy[] {
  const differences: OfficialVehicleDiscrepancy[] = [];
  compareText('brand', vehicle.brand, official.brand, true, differences);
  compareText('model', vehicle.model, official.model, true, differences);
  compareOptionalText('version', vehicle.version, official.version, differences);
  compareOptionalText('fuelType', vehicle.fuelType, official.fuelType, differences);
  compareOptionalNumber('engineCapacityCc', vehicle.engineCapacityCc, official.engineCapacityCc, 0, differences);
  compareOptionalNumber('powerKw', vehicle.powerKw, official.powerKw, 0.1, differences);
  compareOptionalNumber('co2Gkm', vehicle.co2Gkm, official.co2Gkm, 0, differences);
  return differences;
}

export function normalizeCatalogText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function compareText(
  field: string,
  caseValue: string,
  officialValue: string,
  blocking: boolean,
  output: OfficialVehicleDiscrepancy[],
): void {
  if (normalizeCatalogText(caseValue) !== normalizeCatalogText(officialValue)) {
    output.push({ field, caseValue, officialValue, blocking });
  }
}

function compareOptionalText(
  field: string,
  caseValue: string | null | undefined,
  officialValue: string | null,
  output: OfficialVehicleDiscrepancy[],
): void {
  if (caseValue === undefined || caseValue === null || officialValue === null) return;
  compareText(field, caseValue, officialValue, true, output);
}

function compareOptionalNumber(
  field: string,
  caseValue: number | null | undefined,
  officialValue: number | null,
  tolerance: number,
  output: OfficialVehicleDiscrepancy[],
): void {
  if (caseValue === undefined || caseValue === null || officialValue === null) return;
  if (Math.abs(caseValue - officialValue) > tolerance) {
    output.push({ field, caseValue, officialValue, blocking: true });
  }
}

function isOutsideCommercialPeriod(row: OfficialVehicleValue, firstRegistrationDate: string): boolean {
  const year = /^(\d{4})-\d{2}-\d{2}$/.exec(firstRegistrationDate)?.[1];
  if (!year) return true;
  const numericYear = Number(year);
  return (row.commercialStartYear !== null && numericYear < row.commercialStartYear)
    || (row.commercialEndYear !== null && numericYear > row.commercialEndYear);
}

function commercialPeriodText(row: OfficialVehicleValue): string {
  return `${row.commercialStartYear ?? 'sin inicio'}–${row.commercialEndYear ?? 'sin fin'}`;
}

function notFound(explanation: string): OfficialVehicleMatchResult {
  return {
    status: 'not-found',
    selected: null,
    candidates: [],
    discrepancies: [],
    sourceIds: [SOURCE_ID],
    explanation,
  };
}
