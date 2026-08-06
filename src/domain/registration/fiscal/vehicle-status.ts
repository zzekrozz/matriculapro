import { FiscalVehicleStatusInputSchema } from './schemas';
import { addCalendarMonthsClamped, formatIsoDate, parseStrictIsoDate } from './date-utils';
import type { FiscalVehicleStatusInput, FiscalVehicleStatusResult } from './types';

const SOURCE_IDS = ['boe-law-37-1992-art-13', 'aeat-vat-new-vehicle'] as const;

export function classifyFiscalVehicleStatus(input: FiscalVehicleStatusInput): FiscalVehicleStatusResult {
  const parsed = FiscalVehicleStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    return blocked('Los datos de fecha o kilometraje no son válidos. El kilometraje no puede ser negativo.');
  }

  const firstRegistration = parseStrictIsoDate(parsed.data.firstRegistrationDate);
  const referenceDate = parseStrictIsoDate(parsed.data.referenceDate);
  if (!firstRegistration || !referenceDate) return blocked('Las fechas deben existir y usar el formato AAAA-MM-DD.');

  let fiscalStartDate = firstRegistration;
  let usedDocumentedFirstService = false;
  if (parsed.data.firstService?.evidenceConfirmed) {
    const firstService = parseStrictIsoDate(parsed.data.firstService.date);
    if (!firstService) return blocked('La fecha de primera puesta en servicio confirmada por la persona usuaria no es válida.');
    if (firstService > firstRegistration) {
      return blocked('La primera puesta en servicio confirmada por la persona usuaria no puede ser posterior a la fecha de primera matriculación introducida.');
    }
    fiscalStartDate = firstService;
    usedDocumentedFirstService = true;
  }

  if (referenceDate < fiscalStartDate) {
    return blocked('La fecha de entrega o devengo no puede ser anterior a la primera puesta en servicio introducida y confirmada por la persona usuaria.');
  }

  const anniversary = addCalendarMonthsClamped(fiscalStartDate, 6);
  const deliveredBeforeSixMonths = referenceDate < anniversary;
  const sixThousandKmOrLess = parsed.data.mileageKm <= 6_000;
  const isNew = deliveredBeforeSixMonths || sixThousandKmOrLess;
  const dateUsed = formatIsoDate(fiscalStartDate);
  const anniversaryText = formatIsoDate(anniversary);

  return {
    status: 'complete',
    vehicleStatus: isNew ? 'new' : 'used',
    newByAge: deliveredBeforeSixMonths,
    newByMileage: sixThousandKmOrLess,
    dateUsed,
    sixMonthAnniversary: anniversaryText,
    blockers: [],
    sourceIds: [...SOURCE_IDS],
    explanation: [{
      id: 'vehicle-new-or-used',
      title: isNew ? 'Medio de transporte nuevo' : 'Medio de transporte usado',
      detail: isNew
        ? `Basta una condición de vehículo nuevo: ${deliveredBeforeSixMonths ? 'la entrega es anterior al sexto aniversario mensual' : 'el kilometraje no supera 6.000 km'}.`
        : 'Para considerarse usado deben no cumplirse ninguna de las dos condiciones de vehículo nuevo: la entrega ya no se produce antes de los seis meses y el kilometraje supera los 6.000 km.',
      formula: 'nuevo = fechaReferencia < aniversario6Meses OR kilometraje <= 6000',
      input: {
        firstRegistrationDate: parsed.data.firstRegistrationDate,
        userConfirmedFirstServiceDate: usedDocumentedFirstService ? dateUsed : null,
        referenceDate: parsed.data.referenceDate,
        mileageKm: parsed.data.mileageKm,
      },
      output: { vehicleStatus: isNew ? 'new' : 'used', sixMonthAnniversary: anniversaryText },
      sourceIds: [...SOURCE_IDS],
    }],
  };
}

function blocked(message: string): FiscalVehicleStatusResult {
  return {
    status: 'blocked',
    vehicleStatus: null,
    newByAge: null,
    newByMileage: null,
    dateUsed: null,
    sixMonthAnniversary: null,
    blockers: [{ id: 'invalid-vehicle-status-data', message, sourceIds: [...SOURCE_IDS] }],
    explanation: [],
    sourceIds: [...SOURCE_IDS],
  };
}
