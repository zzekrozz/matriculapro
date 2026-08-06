import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRegistrationDecision,
  calculateRegistrationTaxEstimate,
  classifyOriginZone,
  classifyVatVehicleStatus,
  PRACTICE_REGISTRATION_CASE,
  determineRegistrationTaxRoute,
  determineTechnicalPath,
  getTaxRate2026,
  type RegistrationCase,
} from '../index';

function fixture(overrides: Partial<RegistrationCase> = {}): RegistrationCase {
  const base: RegistrationCase = structuredClone(PRACTICE_REGISTRATION_CASE);
  return {
    ...base,
    id: '00000000-0000-4000-8000-000000000099',
    mode: 'case',
    vehicle: { ...base.vehicle },
    ...overrides,
  };
}

describe('clasificación de nuevo/usado a efectos de IVA', () => {
  it('considera nuevo un vehículo de ocho meses con 5.900 km', () => {
    const result = classifyVatVehicleStatus({ firstRegistrationDate: '2025-12-01', referenceDate: '2026-08-01', mileageKm: 5_900 });
    assert.equal(result.outcome, 'new');
    assert.match(result.reason, /6\.000 km o menos/);
  });

  it('considera nuevo un vehículo de cinco meses con 20.000 km', () => {
    const result = classifyVatVehicleStatus({ firstRegistrationDate: '2026-03-01', referenceDate: '2026-08-01', mileageKm: 20_000 });
    assert.equal(result.outcome, 'new');
    assert.match(result.reason, /antes de cumplir seis meses/);
  });

  it('trata seis meses exactos y 6.001 km como usado', () => {
    const result = classifyVatVehicleStatus({ firstRegistrationDate: '2026-02-05', referenceDate: '2026-08-05', mileageKm: 6_001 });
    assert.equal(result.outcome, 'used');
  });

  it('mantiene 6.000 km exactos dentro de la definición de nuevo', () => {
    const result = classifyVatVehicleStatus({ firstRegistrationDate: '2025-01-01', referenceDate: '2026-08-05', mileageKm: 6_000 });
    assert.equal(result.outcome, 'new');
  });

  it('no inventa una clasificación cuando falta la fecha de referencia', () => {
    const result = classifyVatVehicleStatus({ firstRegistrationDate: '2025-01-01', referenceDate: null, mileageKm: 20_000 });
    assert.equal(result.outcome, 'undetermined');
    assert.equal(result.blocking, true);
  });
});

describe('procedencia UE, EEE y Reino Unido', () => {
  it('separa un Estado UE de un Estado EEE no UE', () => {
    const eu = classifyOriginZone({ registrationCountry: 'DE', firstEntryIntoEuDate: null, customsUnionStatusConfirmed: null, northernIrelandV5cConfirmed: null });
    const eea = classifyOriginZone({ registrationCountry: 'NO', firstEntryIntoEuDate: null, customsUnionStatusConfirmed: null, northernIrelandV5cConfirmed: null });
    assert.equal(eu.outcome, 'eu');
    assert.equal(eu.blocking, false);
    assert.equal(eea.outcome, 'eea');
    assert.equal(eea.blocking, true);
  });

  it('exige prueba de V5C para tratar XI como rama comunitaria', () => {
    const missing = classifyOriginZone({ registrationCountry: 'XI', firstEntryIntoEuDate: null, customsUnionStatusConfirmed: null, northernIrelandV5cConfirmed: null });
    const proven = classifyOriginZone({ registrationCountry: 'XI', firstEntryIntoEuDate: null, customsUnionStatusConfirmed: null, northernIrelandV5cConfirmed: true });
    assert.equal(missing.outcome, 'unknown');
    assert.equal(proven.outcome, 'eu');
  });
});

describe('motor de expedientes', () => {
  it('crea ruta ordinaria para M1 usado alemán comprado a particular', () => {
    const decision = buildRegistrationDecision(fixture());
    assert.equal(decision.processKind, 'ordinary-import');
    assert.equal(decision.supportedScope, true);
    assert.equal(decision.vatVehicleStatus.outcome, 'used');
    assert.equal(decision.purchaseTaxRoute.outcome, 'itp');
    assert.equal(decision.technicalPath.outcome, 'eu-coc');
    const documents = decision.requiredDocuments.map((document) => document.type);
    for (const required of ['purchase-contract', 'itp-proof', 'spanish-itv-card', 'model-576-proof', 'ivtm-proof', 'dgt-fee'] as const) {
      assert.ok(documents.includes(required));
    }
    assert.deepEqual(decision.route.map((step) => step.id), [
      'document-feasibility', 'technical-itv', 'purchase-tax', 'registration-tax',
      'ivtm', 'dgt', 'plates-insurance',
    ]);
  });

  it('pide factura con IVA y no ITP por defecto a profesional neerlandés', () => {
    const base = fixture();
    const decision = buildRegistrationDecision(fixture({
      sellerType: 'foreign-professional', sellerCountry: 'NL', invoiceVatNumber: 'NL123456789B01',
      vehicle: { ...base.vehicle, registrationCountry: 'NL' },
    }));
    assert.equal(decision.purchaseTaxRoute.outcome, 'foreign-professional-invoice-review');
    const documents = decision.requiredDocuments.map((document) => document.type);
    assert.ok(documents.includes('invoice'));
    assert.ok(!documents.includes('itp-proof'));
    assert.equal(decision.processKind, 'ordinary-import');
  });

  it('no aplica la tabla M1 automáticamente a N1', () => {
    const base = fixture();
    const registrationCase = fixture({
      vehicle: { ...base.vehicle, category: 'N1', categoryConfirmedOnSpanishItv: false },
      n1EconomicUseConfirmed: null, n1VatDeductionPercent: null,
    });
    const decision = buildRegistrationDecision(registrationCase);
    assert.equal(decision.registrationTaxRoute.outcome, 'special-review');
    assert.match(decision.registrationTaxRoute.reason, /no implica por sí sola/);
    assert.equal(calculateRegistrationTaxEstimate(registrationCase, decision.registrationTaxRoute).epigraph, null);
  });

  it('abre posible Modelo 06 para N1 sólo tras acreditar categoría y uso', () => {
    const base = fixture();
    const decision = buildRegistrationDecision(fixture({
      vehicle: { ...base.vehicle, category: 'N1', categoryConfirmedOnSpanishItv: true },
      n1EconomicUseConfirmed: true, n1VatDeductionPercent: 50,
    }));
    assert.equal(decision.registrationTaxRoute.outcome, 'model-06');
  });

  it('permite posible ficha reducida sin COC cuando hay homologación europea', () => {
    const technical = determineTechnicalPath({ ...fixture().vehicle, cocAvailable: false, approvalType: 'eu-type' });
    assert.equal(technical.outcome, 'eu-reduced-sheet');
    assert.equal(technical.blocking, false);
    assert.match(technical.reason, /técnico competente/);
  });

  it('bloquea la ficha reducida ordinaria sin homologación europea', () => {
    const technical = determineTechnicalPath({ ...fixture().vehicle, cocAvailable: false, approvalType: 'none', fieldK: null, approvalNumber: null });
    assert.equal(technical.outcome, 'spanish-individual-approval');
    assert.equal(technical.blocking, true);
    assert.match(technical.reason, /No debe continuarse/);
  });

  it('activa alerta de reformas sin emitir resultado favorable o desfavorable', () => {
    const base = fixture();
    const decision = buildRegistrationDecision(fixture({ vehicle: { ...base.vehicle, reforms: { ...base.vehicle.reforms, suspension: true } } }));
    assert.equal(decision.warnings.some((warning) => warning.id === 'possible-reforms'), true);
    assert.match(decision.warnings[0]?.detail ?? '', /no afirma un resultado favorable o desfavorable/);
  });

  it('trata Gran Bretaña post-Brexit como tercer país salvo acreditación', () => {
    const base = fixture();
    const decision = buildRegistrationDecision(fixture({ firstEntryIntoEuDate: '2021-01-01', vehicle: { ...base.vehicle, registrationCountry: 'GB' } }));
    assert.equal(decision.originZone.outcome, 'uk-post-brexit');
    assert.equal(decision.purchaseTaxRoute.outcome, 'customs');
  });

  it('abre revisión especial para traslado de residencia', () => {
    const decision = buildRegistrationDecision(fixture({
      operation: 'relocation', sellerType: 'already-owned', specialCircumstances: ['relocation'],
      relocationDates: { previousResidenceFrom: null, spanishResidenceFrom: null, ownershipFrom: null, useFrom: null },
    }));
    assert.equal(decision.processKind, 'relocation');
    assert.equal(decision.purchaseTaxRoute.outcome, 'relocation-review');
    assert.equal(decision.registrationTaxRoute.outcome, 'special-review');
    assert.ok(decision.registrationTaxRoute.missingData.length > 0);
  });

  it('deriva rehabilitación si estuvo matriculado antes en España', () => {
    const base = fixture();
    const decision = buildRegistrationDecision(fixture({ vehicle: { ...base.vehicle, previouslyRegisteredInSpain: true } }));
    assert.equal(decision.processKind, 'rehabilitation');
    assert.equal(decision.purchaseTaxRoute.outcome, 'rehabilitation-review');
    assert.equal(decision.blockers.some((blocker) => blocker.id === 'previously-registered-spain'), true);
  });

  it('selecciona Modelo 05 cuando el beneficio exige reconocimiento previo', () => {
    const decision = buildRegistrationDecision(fixture({ taxBenefitKind: 'reduction', taxBenefitRequiresPriorRecognition: true }));
    assert.equal(decision.registrationTaxRoute.outcome, 'model-05');
    const documents = decision.requiredDocuments.map((document) => document.type);
    assert.ok(documents.includes('model-05-resolution'));
    assert.ok(documents.includes('model-576-proof'));
  });

  it('no enruta a Modelo 576 mientras la sujeción siga sin confirmar', () => {
    const result = determineRegistrationTaxRoute(fixture({ registrationTaxSubjectConfirmed: null }));
    assert.equal(result.outcome, 'special-review');
    assert.equal(result.blocking, true);
    assert.ok(result.missingData.some((item) => /sujeción/i.test(item)));
  });
});

describe('configuración fiscal versionada 2026', () => {
  it('aplica tipos autonómicos publicados y excluye regímenes forales', () => {
    assert.equal(getTaxRate2026('asturias', 4), 0.16);
    assert.equal(getTaxRate2026('murcia', 4), 0.159);
    assert.equal(getTaxRate2026('madrid', 2), 0.0475);
    assert.equal(getTaxRate2026('canarias', 2), 0.0375);
    assert.equal(getTaxRate2026('navarra', 2), null);
    assert.equal(getTaxRate2026('pais-vasco', 2), null);
  });
});
