import test from 'node:test';
import assert from 'node:assert/strict';
import { runFreeVehicleCheck, type FreeVehicleCheckInput } from '..';

function baseInput(overrides: Partial<FreeVehicleCheckInput> = {}): FreeVehicleCheckInput {
  return {
    registrationCountry: 'DE',
    firstRegistrationDate: '2022-01-15',
    mileageKm: 45_000,
    category: 'M1',
    sellerType: 'foreign-professional',
    hasInvoice: true,
    hasPurchaseContract: false,
    fieldK: 'e1*2007/46*1234*01',
    approvalNumber: '',
    cocAvailable: true,
    foreignTechnicalDocumentAvailable: true,
    fuel: 'gasolina',
    co2GKm: 128,
    apparentReforms: false,
    previouslyRegisteredInSpain: false,
    specialUse: 'none',
    engineCc: 1_498,
    powerKw: 110,
    massKg: 1_720,
    seats: 5,
    checkedAt: '2026-08-05T10:00:00.000Z',
    ...overrides,
  };
}

test('classifies an ordinary documented EU M1 case with low risk', () => {
  const result = runFreeVehicleCheck(baseInput());
  assert.equal(result.originZone, 'eu');
  assert.equal(result.vatStatus, 'used');
  assert.equal(result.caseKind, 'ordinary');
  assert.equal(result.riskLevel, 'low');
  assert.equal(result.europeanTypeApprovalPossible, true);
});

test('never hides a missing foreign technical document behind the score', () => {
  const result = runFreeVehicleCheck(baseInput({ foreignTechnicalDocumentAvailable: false }));
  assert.equal(result.riskLevel, 'blocked');
  assert.ok(result.factors.some((factor) => factor.id === 'foreign-technical-document' && factor.blocking));
});

test('routes a previously Spanish-registered vehicle out of ordinary import', () => {
  const result = runFreeVehicleCheck(baseInput({ previouslyRegisteredInSpain: true }));
  assert.equal(result.riskLevel, 'blocked');
  assert.equal(result.caseKind, 'special');
});

test('detects a future first-registration date as a contradiction', () => {
  const result = runFreeVehicleCheck(baseInput({ firstRegistrationDate: '2027-01-01' }));
  assert.equal(result.riskLevel, 'blocked');
  assert.ok(result.contradictions.length > 0);
});

test('accepts a manually entered ISO country code for an unlisted country', () => {
  const result = runFreeVehicleCheck(baseInput({ registrationCountry: 'CA' }));
  assert.equal(result.originZone, 'third-country');
});

test('rejects the UI sentinel instead of treating OTHER as a country', () => {
  assert.throws(() => runFreeVehicleCheck(baseInput({ registrationCountry: 'OTHER' })));
});
