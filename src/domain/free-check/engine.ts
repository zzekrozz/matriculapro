import { z } from 'zod';
import {
  buildRegistrationDecision,
  createEmptyRegistrationCase,
  looksLikeEuropeanTypeApproval,
  type RegistrationCase,
  type SellerType,
  type VehicleCategory,
} from '../registration';
import type {
  FreeCheckRiskFactor,
  FreeVehicleCheckInput,
  FreeVehicleCheckResult,
} from './types';

export const FREE_CHECK_RULESET_VERSION = '2026.08.05';

export const FreeVehicleCheckInputSchema = z.object({
  registrationCountry: z.string().trim().regex(/^[A-Za-z]{2,3}$/).transform((value) => value.toUpperCase()),
  firstRegistrationDate: z.string().date(),
  mileageKm: z.number().int().min(0).max(5_000_000),
  category: z.enum(['M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'L', 'O', 'SPECIAL', 'UNKNOWN']),
  sellerType: z.enum(['private', 'foreign-professional', 'spanish-professional', 'already-owned', 'inheritance', 'donation', 'unknown']),
  hasInvoice: z.boolean(),
  hasPurchaseContract: z.boolean(),
  fieldK: z.string().trim().max(120),
  approvalNumber: z.string().trim().max(120),
  cocAvailable: z.boolean().nullable(),
  foreignTechnicalDocumentAvailable: z.boolean().nullable(),
  fuel: z.string().trim().max(80),
  co2GKm: z.number().min(0).max(2_000).nullable(),
  apparentReforms: z.boolean(),
  previouslyRegisteredInSpain: z.boolean(),
  specialUse: z.enum(['none', 'taxi-rental-driving-school', 'historical', 'relocation', 'other']),
  engineCc: z.number().int().min(0).max(30_000).nullable(),
  powerKw: z.number().min(0).max(3_000).nullable(),
  massKg: z.number().int().min(0).max(100_000).nullable(),
  seats: z.number().int().min(0).max(200).nullable(),
  checkedAt: z.string().datetime(),
});

/**
 * Documented deterministic weights. They only order review urgency and are
 * never presented as a probability of successfully registering a vehicle.
 */
export const FREE_CHECK_RISK_WEIGHTS = {
  missingOwnershipProof: 30,
  missingForeignTechnicalDocument: 45,
  noEuropeanApprovalEvidence: 20,
  apparentReforms: 25,
  specialUse: 25,
  categoryOutsideM1: 25,
  previousSpanishRegistration: 100,
  thirdCountryOrPostBrexit: 25,
  missingCoreTechnicalData: 10,
  incoherentDate: 100,
} as const;

export function runFreeVehicleCheck(rawInput: FreeVehicleCheckInput): FreeVehicleCheckResult {
  const input = FreeVehicleCheckInputSchema.parse(rawInput);
  const registrationCase = toRegistrationCase(input);
  const decision = buildRegistrationDecision(registrationCase);
  const factors: FreeCheckRiskFactor[] = [];
  const contradictions: string[] = [];
  const ownershipProofExpected = input.sellerType === 'private' ? input.hasPurchaseContract : input.hasInvoice;

  if (!ownershipProofExpected) {
    addFactor(factors, 'ownership-proof', 'Falta una prueba de titularidad adecuada', input.sellerType === 'private'
      ? 'Para una compra a particular conviene exigir un contrato completo antes de pagar.'
      : 'Para una compra profesional conviene exigir una factura identificable antes de pagar.', FREE_CHECK_RISK_WEIGHTS.missingOwnershipProof);
  }
  if (input.foreignTechnicalDocumentAvailable === false) {
    addFactor(factors, 'foreign-technical-document', 'Falta el documento técnico extranjero',
      'La ITV necesitará datos técnicos y correspondencia documental del vehículo.', FREE_CHECK_RISK_WEIGHTS.missingForeignTechnicalDocument, true);
  }
  const europeanApproval = looksLikeEuropeanTypeApproval(input.fieldK || null, input.approvalNumber || null);
  if (!europeanApproval && input.cocAvailable !== true) {
    addFactor(factors, 'approval-evidence', 'No consta homologación europea utilizable',
      'Puede ser necesaria una ficha reducida, equivalencia o homologación individual.', FREE_CHECK_RISK_WEIGHTS.noEuropeanApprovalEvidence);
  }
  if (input.apparentReforms) {
    addFactor(factors, 'apparent-reforms', 'Hay modificaciones aparentes',
      'Las reformas deben contrastarse con el Manual de Reformas y la documentación técnica.', FREE_CHECK_RISK_WEIGHTS.apparentReforms);
  }
  if (input.specialUse !== 'none') {
    addFactor(factors, 'special-use', 'Existe un uso o supuesto especial',
      'El caso puede requerir condiciones fiscales o técnicas adicionales.', FREE_CHECK_RISK_WEIGHTS.specialUse);
  }
  if (input.category !== 'M1') {
    addFactor(factors, 'category', `Categoría ${input.category} fuera del caso ordinario M1`,
      'La ruta técnica y fiscal debe revisarse específicamente para esta categoría.', FREE_CHECK_RISK_WEIGHTS.categoryOutsideM1);
  }
  if (input.previouslyRegisteredInSpain) {
    addFactor(factors, 'previous-spain-registration', 'El vehículo ya estuvo matriculado en España',
      'Debe revisarse una rehabilitación u otro trámite, no una importación ordinaria.', FREE_CHECK_RISK_WEIGHTS.previousSpanishRegistration, true);
  }
  if (decision.originZone.outcome === 'third-country' || decision.originZone.outcome === 'uk-post-brexit') {
    addFactor(factors, 'origin', 'Procedencia con rama aduanera',
      'Antes de comprar deben acreditarse importación, impuestos y situación aduanera.', FREE_CHECK_RISK_WEIGHTS.thirdCountryOrPostBrexit);
  }
  const missingCoreTechnical = [input.engineCc, input.powerKw, input.massKg, input.seats]
    .filter((value) => value === null).length;
  if (missingCoreTechnical >= 2) {
    addFactor(factors, 'technical-data', 'Faltan datos técnicos básicos',
      `Hay ${missingCoreTechnical} datos técnicos básicos sin confirmar.`, FREE_CHECK_RISK_WEIGHTS.missingCoreTechnicalData);
  }

  const checkedDate = new Date(input.checkedAt);
  const firstRegistration = new Date(`${input.firstRegistrationDate}T00:00:00.000Z`);
  if (firstRegistration.getTime() > checkedDate.getTime()) {
    contradictions.push('La fecha de primera matriculación es posterior a la fecha de comprobación.');
    addFactor(factors, 'date-contradiction', 'Las fechas no son coherentes',
      contradictions[contradictions.length - 1], FREE_CHECK_RISK_WEIGHTS.incoherentDate, true);
  }
  if (input.cocAvailable === true && !europeanApproval && !input.fieldK && !input.approvalNumber) {
    contradictions.push('Se indica que existe COC, pero no se ha aportado el campo K ni una contraseña de homologación para contrastarlo.');
  }
  if (input.hasInvoice && input.hasPurchaseContract && input.sellerType !== 'unknown') {
    contradictions.push('Se han marcado factura y contrato; confirma cuál documenta realmente la transmisión.');
  }

  const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.weight, 0));
  const riskLevel = factors.some((factor) => factor.blocking)
    ? 'blocked'
    : score >= 55 ? 'high' : score >= 25 ? 'medium' : 'low';
  const sourceIds = unique([
    ...decision.vatVehicleStatus.sourceIds,
    ...decision.originZone.sourceIds,
    ...decision.technicalPath.sourceIds,
    ...decision.risks.flatMap((risk) => risk.sourceIds),
    ...decision.blockers.flatMap((blocker) => blocker.sourceIds),
  ]);

  return {
    riskLevel,
    internalRiskScore: score,
    factors,
    vatStatus: decision.vatVehicleStatus.outcome,
    vatReason: decision.vatVehicleStatus.reason,
    originZone: decision.originZone.outcome,
    originReason: decision.originZone.reason,
    technicalPath: decision.technicalPath.outcome,
    technicalReason: decision.technicalPath.reason,
    europeanTypeApprovalPossible: europeanApproval || input.cocAvailable === true,
    technicalReviewPossible: decision.technicalPath.outcome !== 'eu-coc' || input.foreignTechnicalDocumentAvailable !== true,
    reformsReviewPossible: input.apparentReforms,
    recommendedDocuments: recommendedDocuments(input),
    sellerQuestions: sellerQuestions(input, europeanApproval),
    contradictions,
    caseKind: input.specialUse !== 'none' || input.category !== 'M1' || input.previouslyRegisteredInSpain
      ? 'special' : 'ordinary',
    mainRisks: unique([
      ...factors.map((factor) => factor.label),
      ...decision.risks.map((risk) => risk.title),
      ...decision.blockers.map((blocker) => blocker.title),
    ]),
    sourceIds,
    updatedAt: input.checkedAt,
  };
}

function toRegistrationCase(input: FreeVehicleCheckInput): RegistrationCase {
  const registrationCase = createEmptyRegistrationCase({
    id: 'free-check',
    userId: null,
    mode: 'practice',
    now: input.checkedAt,
  });
  return {
    ...registrationCase,
    // The free tool is pre-purchase, so the check date is the explicit
    // reference date for the EU six-month/6,000-km classification.
    purchaseDate: input.checkedAt.slice(0, 10),
    sellerCountry: input.registrationCountry,
    municipality: 'pendiente-en-comprobacion-gratuita',
    sellerType: input.sellerType as SellerType,
    specialCircumstances: input.specialUse === 'none'
      ? []
      : input.specialUse === 'other' ? ['complex-reform'] : [input.specialUse],
    vehicle: {
      ...registrationCase.vehicle,
      registrationCountry: input.registrationCountry,
      firstRegistrationDate: input.firstRegistrationDate,
      mileageKm: input.mileageKm,
      category: input.category as VehicleCategory,
      fuel: input.fuel || null,
      co2GKm: input.co2GKm,
      co2Source: input.co2GKm === null ? 'unknown' : 'manual-unverified',
      fieldK: input.fieldK || null,
      approvalNumber: input.approvalNumber || null,
      cocAvailable: input.cocAvailable,
      foreignTechnicalDocumentAvailable: input.foreignTechnicalDocumentAvailable,
      approvalType: looksLikeEuropeanTypeApproval(input.fieldK, input.approvalNumber) ? 'eu-type' : 'unknown',
      engineCc: input.engineCc,
      powerKw: input.powerKw,
      massKg: input.massKg,
      seats: input.seats,
      previouslyRegisteredInSpain: input.previouslyRegisteredInSpain,
      reforms: Object.fromEntries(Object.keys(registrationCase.vehicle.reforms).map((key) => [key, input.apparentReforms ? true : false])) as RegistrationCase['vehicle']['reforms'],
    },
  };
}

function recommendedDocuments(input: FreeVehicleCheckInput): string[] {
  const documents = [
    input.sellerType === 'private' ? 'Contrato de compraventa completo y firmado' : 'Factura con identificación fiscal del vendedor',
    'Permiso o certificado de matriculación extranjero original',
    'Documento técnico extranjero completo',
    'Prueba de titularidad y trazabilidad del vendedor',
  ];
  if (input.cocAvailable !== true) documents.push('COC válido o alternativa técnica emitida por profesional competente');
  if (input.apparentReforms) documents.push('Documentación de las modificaciones, informes y certificados disponibles');
  if (input.registrationCountry === 'GB' || input.registrationCountry === 'UK') documents.push('Documentación aduanera y prueba de estatuto de la mercancía');
  if (input.specialUse !== 'none') documents.push('Pruebas del uso anterior y de las fechas relevantes');
  return unique(documents);
}

function sellerQuestions(input: FreeVehicleCheckInput, europeanApproval: boolean): string[] {
  const questions = [
    '¿Coinciden el VIN del vehículo, el documento técnico y el permiso de circulación?',
    '¿Puede entregar los documentos originales antes del pago final?',
    '¿Está el vehículo dado de baja para exportación cuando el país lo exige?',
  ];
  if (!europeanApproval) questions.push('¿Qué homologación consta exactamente en el campo K y puede enviar una copia legible?');
  if (input.cocAvailable !== true) questions.push('¿Existe COC del fabricante y coincide con este VIN?');
  if (input.apparentReforms) questions.push('¿Qué piezas se modificaron y qué certificados o legalizaciones existen?');
  if (!input.hasInvoice && !input.hasPurchaseContract) questions.push('¿Qué documento acreditará la transmisión y el precio real?');
  return questions;
}

function addFactor(
  factors: FreeCheckRiskFactor[],
  id: string,
  label: string,
  detail: string,
  weight: number,
  blocking = false,
) {
  factors.push({ id, label, detail, weight, blocking });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
