import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  calculateModel576,
  confirmOfficialVehicleMatch,
  Model576CalculationInputSchema,
  type Model576CalculationInput,
  type OfficialVehicleValue,
} from '@/domain/registration/fiscal';
import type { Model576ApiRequest, Model576ApiResponse } from '@/lib/fiscal/calculation-api';
import { getFiscalCatalogVehicleById } from '@/server/fiscal/catalog-search';
import { AuthenticationRequiredError, requireServerCapability } from '@/server/access/current-access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestEnvelopeSchema = z.object({
  registrationTaxRoute: z.enum(['model-576', 'model-06', 'model-05', 'special-review']),
  registrationTaxSubjectConfirmed: z.boolean(),
  referenceDate: z.string().date(),
  accrualDate: z.string().date(),
  firstRegistrationDate: z.string().date(),
  firstService: z.object({
    date: z.string().date(),
    evidenceConfirmed: z.boolean(),
    sourceDescription: z.string().trim().min(1),
  }).nullable(),
  mileageKm: z.number().finite().nonnegative(),
  currentAutonomousCommunity: z.string().min(1),
  vehicle: z.object({
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    version: z.string().trim().min(1).nullable(),
    fuelType: z.string().trim().min(1).nullable(),
    engineCapacityCc: z.number().finite().nonnegative().nullable(),
    powerKw: z.number().finite().nonnegative().nullable(),
    category: z.string().min(1),
    co2GKm: z.number().finite().nonnegative().nullable(),
    co2Verified: z.boolean(),
    singleNonCombustionEngine: z.boolean(),
    kind: z.enum(['standard', 'quad', 'motorcycle', 'motorhome', 'other']),
  }),
  previouslyRegisteredAbroad: z.boolean(),
  professionalUseHistory: z.object({
    activity: z.enum(['taxi', 'rental', 'driving-school']),
    startDate: z.string().date(),
    endDate: z.string().date(),
    exclusive: z.boolean(),
    durationMonths: z.number().int().nonnegative(),
    evidenceReference: z.string().trim().min(1),
    confirmed: z.boolean(),
  }).nullable(),
  valuation: z.discriminatedUnion('method', [
    z.object({
      method: z.literal('new-vehicle-vat-base'),
      vatTaxableBase: z.string().min(1),
      currency: z.string().trim().length(3),
      exchangeRateToEur: z.string().nullable(),
      netPrice: z.string().nullable(),
      discounts: z.string().nullable(),
      taxableAccessoryCosts: z.string().nullable(),
      indirectTaxAmount: z.string().nullable(),
      acquisitionDate: z.string().date().nullable(),
      territory: z.string().nullable(),
      sourceDescription: z.string().trim().min(1),
    }),
    z.object({ method: z.literal('official-table'), catalogVehicleId: z.string().trim().min(1), invoicePrice: z.string().nullable() }),
    z.object({
      method: z.literal('justified-market-value'),
      marketValue: z.string().min(1),
      valuationDate: z.string().date(),
      methodDescription: z.string().trim().min(1),
      sourceDescription: z.string().trim().min(1),
      reasonForNotUsingTable: z.string().trim().min(1),
      supportingDocument: z.string().nullable(),
      invoicePrice: z.string().nullable(),
    }),
  ]),
  historicalTaxes: z.unknown().optional(),
  reductions: z.unknown().optional(),
  confirmation: z.object({ reviewedByUser: z.boolean(), confirmedAt: z.string().datetime().nullable() }),
});

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = (await requireServerCapability('run_fiscal_calculations')).userId;
  } catch (error) {
    return errorResponse('invalid-input', error instanceof AuthenticationRequiredError ? 'Debes iniciar sesión.' : 'Necesitas una licencia activa para calcular el Modelo 576.', error instanceof AuthenticationRequiredError ? 401 : 403);
  }
  const limited = await rateLimitedResponse(request, `fiscal:model-576:${userId}`, { limit: 120, windowSeconds: 3_600 });
  if (limited) return limited;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid-input', 'El cuerpo de la solicitud no contiene JSON válido.', 400);
  }

  const envelope = requestEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    const message = envelope.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' · ');
    return errorResponse('invalid-input', `Revisa los datos enviados: ${message}`, 400);
  }
  const apiInput = envelope.data as Model576ApiRequest;

  try {
    let valuation: Model576CalculationInput['valuation'];
    let selectedCatalogVehicleId: string | null = null;
    if (apiInput.valuation.method === 'official-table') {
      const catalogRow = await getFiscalCatalogVehicleById(apiInput.valuation.catalogVehicleId);
      if (!catalogRow) {
        return errorResponse(
          'catalog-row-not-found',
          'La fila oficial confirmada no existe en el catálogo activo del servidor. Vuelve a buscarla; no se utilizará otra versión.',
          409,
        );
      }
      selectedCatalogVehicleId = catalogRow.vehicle.id;
      const officialVehicle = catalogRow.vehicle as OfficialVehicleValue;
      const match = confirmOfficialVehicleMatch({
        officialVehicle,
        vehicle: {
          brand: apiInput.vehicle.brand,
          model: apiInput.vehicle.model,
          version: apiInput.vehicle.version,
          fuelType: apiInput.vehicle.fuelType,
          engineCapacityCc: apiInput.vehicle.engineCapacityCc,
          powerKw: apiInput.vehicle.powerKw,
          co2Gkm: apiInput.vehicle.co2GKm,
        },
        firstRegistrationDate: apiInput.firstRegistrationDate,
      });
      valuation = {
        method: 'official-table',
        match,
        catalogVersion: catalogRow.catalogVersion,
        invoicePrice: apiInput.valuation.invoicePrice,
      };
    } else if (apiInput.valuation.method === 'new-vehicle-vat-base') {
      valuation = {
        method: 'new-vehicle-vat-base',
        vatTaxableBase: apiInput.valuation.vatTaxableBase,
        currency: apiInput.valuation.currency,
        exchangeRateToEur: apiInput.valuation.exchangeRateToEur,
        netPrice: apiInput.valuation.netPrice,
        discounts: apiInput.valuation.discounts,
        taxableAccessoryCosts: apiInput.valuation.taxableAccessoryCosts,
        indirectTaxAmount: apiInput.valuation.indirectTaxAmount,
        acquisitionDate: apiInput.valuation.acquisitionDate,
        territory: apiInput.valuation.territory,
        sourceDescription: apiInput.valuation.sourceDescription,
      };
    } else {
      valuation = { ...apiInput.valuation };
    }

    const candidate: Model576CalculationInput = {
      registrationTaxRoute: apiInput.registrationTaxRoute,
      registrationTaxSubjectConfirmed: apiInput.registrationTaxSubjectConfirmed,
      referenceDate: apiInput.referenceDate,
      accrualDate: apiInput.accrualDate,
      firstRegistrationDate: apiInput.firstRegistrationDate,
      firstService: apiInput.firstService,
      mileageKm: apiInput.mileageKm,
      currentAutonomousCommunity: apiInput.currentAutonomousCommunity,
      vehicle: {
        category: apiInput.vehicle.category,
        co2GKm: apiInput.vehicle.co2GKm,
        co2Verified: apiInput.vehicle.co2Verified,
        singleNonCombustionEngine: apiInput.vehicle.singleNonCombustionEngine,
        kind: apiInput.vehicle.kind,
      },
      previouslyRegisteredAbroad: apiInput.previouslyRegisteredAbroad,
      professionalUseHistory: apiInput.professionalUseHistory,
      valuation,
      historicalTaxes: apiInput.historicalTaxes,
      reductions: apiInput.reductions,
    };
    const parsed = Model576CalculationInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' · ');
      return errorResponse('invalid-input', `El motor fiscal ha rechazado datos incompletos: ${message}`, 400);
    }

    const response: Model576ApiResponse = {
      ok: true,
      calculation: calculateModel576(parsed.data as Model576CalculationInput),
      selectedCatalogVehicleId,
    };
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return errorResponse('calculation-error', 'El cálculo no se ha podido completar. No se ha generado una cuota.', 500);
  }
}

function errorResponse(
  code: Extract<Model576ApiResponse, { ok: false }>['code'],
  message: string,
  status: number,
) {
  const body: Model576ApiResponse = { ok: false, code, message };
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
