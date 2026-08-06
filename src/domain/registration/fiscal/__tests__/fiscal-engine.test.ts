import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyModel576BaseReduction,
  calculateModel576,
  calculateOfficialDepreciation,
  calculateResidualTaxMinoration,
  classifyFiscalVehicleStatus,
  confirmOfficialVehicleMatch,
  FISCAL_SOURCE_REFERENCE_BY_ID,
  FiscalVehicleStatusInputSchema,
  HISTORICAL_IEDMT_AUTONOMOUS_RATE_RULES,
  HISTORICAL_SPECIAL_TERRITORY_COVERAGE,
  matchOfficialVehicle,
  Model576CalculationInputSchema,
  resolveCurrentEpigraph,
  resolveHistoricalIedmtRate,
  resolveHistoricalVatRate,
  type Model576CalculationInput,
  type OfficialVehicleValue,
} from '../index';

const OFFICIAL_ROW: OfficialVehicleValue = {
  id: 'HAC-2026-TEST-001',
  catalogYear: 2026,
  sourceOrder: 'HAC/1501/2025',
  sourceAnnex: 'I',
  brand: 'Marca Fiscal',
  model: 'Modelo Trazable',
  version: '2.0 220',
  commercialStartYear: 2017,
  commercialEndYear: 2019,
  fuelType: 'Gasolina',
  engineCapacityCc: 1_998,
  cylinders: 4,
  powerKw: 140,
  fiscalPower: 13.25,
  co2Gkm: 220,
  newVehicleOfficialValue: 30_000,
  officialRowReference: 'Anexo I · fila de prueba estructural',
  normalizedSearchText: 'MARCA FISCAL MODELO TRAZABLE 2 0 220',
  sourceChecksum: 'sha256:test-fixture-not-an-official-import',
};

describe('vehículo nuevo o usado: fronteras legales exactas', () => {
  const classify = (firstRegistrationDate: string, referenceDate: string, mileageKm: number) => (
    classifyFiscalVehicleStatus({ firstRegistrationDate, referenceDate, mileageKm })
  );

  it('cinco meses y 20.000 km es nuevo', () => {
    assert.equal(classify('2026-03-01', '2026-08-01', 20_000).vehicleStatus, 'new');
  });

  it('ocho meses y 5.900 km es nuevo', () => {
    assert.equal(classify('2025-12-01', '2026-08-01', 5_900).vehicleStatus, 'new');
  });

  it('un día antes del sexto mes con 6.001 km es nuevo', () => {
    assert.equal(classify('2026-02-05', '2026-08-04', 6_001).vehicleStatus, 'new');
  });

  it('seis meses exactos con 6.001 km es usado', () => {
    const result = classify('2026-02-05', '2026-08-05', 6_001);
    assert.equal(result.vehicleStatus, 'used');
    assert.match(result.explanation[0]?.detail ?? '', /ninguna de las dos condiciones/);
  });

  it('seis meses exactos con 6.000 km sigue siendo nuevo por kilometraje', () => {
    assert.equal(classify('2026-02-05', '2026-08-05', 6_000).vehicleStatus, 'new');
  });

  it('seis meses y un día con 6.001 km es usado', () => {
    assert.equal(classify('2026-02-05', '2026-08-06', 6_001).vehicleStatus, 'used');
  });

  it('bloquea entrega anterior a primera puesta en servicio', () => {
    assert.equal(classify('2026-02-05', '2026-02-04', 1).status, 'blocked');
  });

  it('bloquea una fecha inexistente', () => {
    const result = classifyFiscalVehicleStatus({
      firstRegistrationDate: '2026-02-30', referenceDate: '2026-08-05', mileageKm: 7_000,
    });
    assert.equal(result.status, 'blocked');
  });

  it('rechaza kilometraje negativo en el esquema y en el clasificador', () => {
    const input = { firstRegistrationDate: '2026-01-01', referenceDate: '2026-08-05', mileageKm: -1 };
    assert.equal(FiscalVehicleStatusInputSchema.safeParse(input).success, false);
    assert.equal(classifyFiscalVehicleStatus(input).status, 'blocked');
  });

  it('admite una primera puesta en servicio distinta cuando hay evidencia', () => {
    const result = classifyFiscalVehicleStatus({
      firstRegistrationDate: '2026-03-15',
      referenceDate: '2026-08-05',
      mileageKm: 10_000,
      firstService: { date: '2026-01-01', evidenceConfirmed: true, sourceDescription: 'Documento oficial' },
    });
    assert.equal(result.vehicleStatus, 'used');
    assert.equal(result.dateUsed, '2026-01-01');
  });

  it('bloquea una primera puesta en servicio posterior a la matrícula acreditada', () => {
    const result = classifyFiscalVehicleStatus({
      firstRegistrationDate: '2026-01-01',
      referenceDate: '2026-08-05',
      mileageKm: 10_000,
      firstService: { date: '2026-06-01', evidenceConfirmed: true, sourceDescription: 'Documento incoherente' },
    });
    assert.equal(result.status, 'blocked');
  });
});

describe('depreciación del anexo IV por aniversarios naturales', () => {
  const exactAnniversaryPercentages = [1, 0.84, 0.67, 0.56, 0.47, 0.39, 0.34, 0.28, 0.24, 0.19, 0.17, 0.13];

  it('prueba todos los intervalos, el aniversario exacto y el día posterior', () => {
    exactAnniversaryPercentages.forEach((expected, index) => {
      const years = index + 1;
      const exact = calculateOfficialDepreciation({
        firstServiceDate: '2010-01-15',
        accrualDate: `${2010 + years}-01-15`,
        officialNewValue: 10_000,
      });
      const nextDay = calculateOfficialDepreciation({
        firstServiceDate: '2010-01-15',
        accrualDate: `${2010 + years}-01-16`,
        officialNewValue: 10_000,
      });
      assert.equal(exact.percentage, expected, `aniversario ${years}`);
      assert.equal(nextDay.percentage, exactAnniversaryPercentages[index + 1] ?? 0.1, `día posterior ${years}`);
    });
  });

  it('ajusta el aniversario del 29 de febrero al último día del mes', () => {
    const exact = calculateOfficialDepreciation({
      firstServiceDate: '2024-02-29', accrualDate: '2025-02-28', officialNewValue: 10_000,
    });
    const nextDay = calculateOfficialDepreciation({
      firstServiceDate: '2024-02-29', accrualDate: '2025-03-01', officialNewValue: 10_000,
    });
    assert.equal(exact.percentage, 1);
    assert.equal(nextDay.percentage, 0.84);
  });

  it('bloquea devengo anterior y no divide días entre 365', () => {
    const result = calculateOfficialDepreciation({
      firstServiceDate: '2024-02-29', accrualDate: '2024-02-28', officialNewValue: 10_000,
    });
    assert.equal(result.status, 'blocked');
  });

  it('aplica el factor profesional 70% solo con más de seis meses y evidencia', () => {
    const applied = calculateOfficialDepreciation({
      firstServiceDate: '2020-01-01',
      accrualDate: '2026-01-01',
      officialNewValue: 10_000,
      professionalUseHistory: {
        activity: 'taxi', startDate: '2020-01-01', endDate: '2020-08-01',
        exclusive: true, durationMonths: 7, evidenceReference: 'licencia-1', confirmed: true,
      },
    });
    assert.equal(applied.percentage, 0.39);
    assert.equal(applied.marketValueBeforeProfessionalUseReduction, 3_900);
    assert.equal(applied.marketValueAfterDepreciation, 2_730);
    const oneDayBeyondSixMonths = calculateOfficialDepreciation({
      firstServiceDate: '2020-01-01',
      accrualDate: '2026-01-01',
      officialNewValue: 10_000,
      professionalUseHistory: {
        activity: 'taxi', startDate: '2020-01-01', endDate: '2020-07-02',
        exclusive: true, durationMonths: 6, evidenceReference: 'licencia-1', confirmed: true,
      },
    });
    assert.equal(oneDayBeyondSixMonths.status, 'complete');
    assert.equal(oneDayBeyondSixMonths.professionalUseFactor, 0.7);
    const blocked = calculateOfficialDepreciation({
      firstServiceDate: '2020-01-01',
      accrualDate: '2026-01-01',
      officialNewValue: 10_000,
      professionalUseHistory: {
        activity: 'taxi', startDate: '2020-01-01', endDate: '2020-07-01',
        exclusive: true, durationMonths: 6, evidenceReference: 'licencia-1', confirmed: true,
      },
    });
    assert.equal(blocked.status, 'blocked');
  });

  it('rechaza periodos profesionales imposibles o duración declarada manipulada', () => {
    const outsideVehicleLife = calculateOfficialDepreciation({
      firstServiceDate: '2025-01-01',
      accrualDate: '2025-04-01',
      officialNewValue: 10_000,
      professionalUseHistory: {
        activity: 'rental', startDate: '2025-01-01', endDate: '2025-08-01',
        exclusive: true, durationMonths: 7, evidenceReference: 'contrato-1', confirmed: true,
      },
    });
    assert.equal(outsideVehicleLife.status, 'blocked');
    const manipulatedDuration = calculateOfficialDepreciation({
      firstServiceDate: '2020-01-01',
      accrualDate: '2026-01-01',
      officialNewValue: 10_000,
      professionalUseHistory: {
        activity: 'driving-school', startDate: '2020-01-01', endDate: '2020-05-01',
        exclusive: true, durationMonths: 7, evidenceReference: 'licencia-2', confirmed: true,
      },
    });
    assert.equal(manipulatedDuration.status, 'blocked');
  });
});

describe('selección inequívoca de la fila oficial', () => {
  it('no elige la primera entre dos versiones similares', () => {
    const result = matchOfficialVehicle({
      catalog: [OFFICIAL_ROW, { ...OFFICIAL_ROW, id: 'HAC-2026-TEST-002', version: '2.0 230', newVehicleOfficialValue: 32_000 }],
      vehicle: { brand: 'Marca Fiscal', model: 'Modelo Trazable' },
      firstRegistrationDate: '2018-05-01',
    });
    assert.equal(result.status, 'multiple-candidates');
    assert.equal(result.selected, null);
  });

  it('solo una confirmación expresa y coherente produce exact-confirmed', () => {
    const result = confirmOfficialVehicleMatch({
      officialVehicle: OFFICIAL_ROW,
      vehicle: {
        brand: 'marca fiscal', model: 'MODELO TRAZABLE', version: '2.0 220',
        fuelType: 'Gasolina', engineCapacityCc: 1_998, powerKw: 140, co2Gkm: 220,
      },
      firstRegistrationDate: '2018-05-01',
    });
    assert.equal(result.status, 'exact-confirmed');
    assert.equal(result.selected?.id, OFFICIAL_ROW.id);
  });

  it('marca una matriculación fuera del periodo comercial', () => {
    const result = confirmOfficialVehicleMatch({
      officialVehicle: OFFICIAL_ROW,
      vehicle: { brand: OFFICIAL_ROW.brand, model: OFFICIAL_ROW.model, version: OFFICIAL_ROW.version },
      firstRegistrationDate: '2022-01-01',
    });
    assert.equal(result.status, 'outside-commercial-period');
  });

  it('devuelve not-found sin inventar una fila alternativa', () => {
    const result = matchOfficialVehicle({
      catalog: [OFFICIAL_ROW],
      vehicle: { brand: 'Marca inexistente', model: 'Modelo inexistente' },
      firstRegistrationDate: '2018-05-01',
    });
    assert.equal(result.status, 'not-found');
    assert.equal(result.selected, null);
    assert.deepEqual(result.candidates, []);
  });
});

describe('cronologías históricas conservadoras', () => {
  it('resuelve las fronteras oficiales del IVA común', () => {
    assert.equal(resolveHistoricalVatRate({ firstRegistrationDate: '1994-12-31', territory: 'peninsula-balearics-common' }).rate, 0.15);
    assert.equal(resolveHistoricalVatRate({ firstRegistrationDate: '1995-01-01', territory: 'peninsula-balearics-common' }).rate, 0.16);
    assert.equal(resolveHistoricalVatRate({ firstRegistrationDate: '2010-06-30', territory: 'peninsula-balearics-common' }).rate, 0.16);
    assert.equal(resolveHistoricalVatRate({ firstRegistrationDate: '2010-07-01', territory: 'peninsula-balearics-common' }).rate, 0.18);
    assert.equal(resolveHistoricalVatRate({ firstRegistrationDate: '2012-08-31', territory: 'peninsula-balearics-common' }).rate, 0.18);
    assert.equal(resolveHistoricalVatRate({ firstRegistrationDate: '2012-09-01', territory: 'peninsula-balearics-common' }).rate, 0.21);
  });

  it('no extrapola IVA a Canarias ni periodos anteriores a 1993', () => {
    assert.equal(resolveHistoricalVatRate({ firstRegistrationDate: '2020-01-01', territory: 'canary-islands' }).status, 'blocked');
    assert.equal(resolveHistoricalVatRate({ firstRegistrationDate: '1992-12-31', territory: 'peninsula-balearics-common' }).status, 'blocked');
  });

  it('aplica la regla transitoria 144/192/240 solamente desde 2021-07-11', () => {
    const classification = {
      category: 'M1' as const,
      co2GKm: 130,
      co2Verified: true,
      singleNonCombustionEngine: false,
      vehicleKind: 'standard' as const,
    };
    const before = resolveHistoricalIedmtRate({
      firstRegistrationDate: '2021-07-10', territory: 'peninsula-balearics-common',
      currentAutonomousCommunity: 'madrid', classification,
    });
    const during = resolveHistoricalIedmtRate({
      firstRegistrationDate: '2021-07-11', territory: 'peninsula-balearics-common',
      currentAutonomousCommunity: 'madrid', classification,
    });
    const after = resolveHistoricalIedmtRate({
      firstRegistrationDate: '2022-01-01', territory: 'peninsula-balearics-common',
      currentAutonomousCommunity: 'madrid', classification,
    });
    assert.equal(before.epigraph, 2);
    assert.equal(during.epigraph, 1);
    assert.equal(after.epigraph, 2);
    assert.equal(before.rate, 0.0475);
    assert.equal(during.rate, 0);
    assert.ok(before.warnings.some((warning) => warning.id === 'historical-iedmt-july-2021-source-date-conflict'));
    assert.ok(during.warnings.some((warning) => warning.id === 'historical-iedmt-july-2021-source-date-conflict'));
    assert.ok(before.sourceIds.includes('aeat-iedmt-statistics-2021-boundary'));
    assert.ok(during.sourceIds.includes('boe-law-11-2021-additional-5'));
  });

  it('bloquea IEDMT pre-2008, territorios no comunes y CO2 no acreditado', () => {
    const classification = {
      category: 'M1' as const,
      co2GKm: 150,
      co2Verified: true,
      singleNonCombustionEngine: false,
      vehicleKind: 'standard' as const,
    };
    assert.equal(resolveHistoricalIedmtRate({ firstRegistrationDate: '2007-12-31', territory: 'peninsula-balearics-common', currentAutonomousCommunity: 'madrid', classification }).status, 'blocked');
    assert.equal(resolveHistoricalIedmtRate({ firstRegistrationDate: '2020-01-01', territory: 'navarra', currentAutonomousCommunity: 'navarra', classification }).status, 'blocked');
    assert.equal(resolveHistoricalIedmtRate({ firstRegistrationDate: '2020-01-01', territory: 'peninsula-balearics-common', currentAutonomousCommunity: 'madrid', classification: { ...classification, co2Verified: false } }).status, 'blocked');
  });

  it('resuelve todas las fronteras de tipos autonómicos versionadas', () => {
    const rate = (
      currentAutonomousCommunity: Parameters<typeof resolveHistoricalIedmtRate>[0]['currentAutonomousCommunity'],
      firstRegistrationDate: string,
      co2GKm = 220,
    ) => resolveHistoricalIedmtRate({
      firstRegistrationDate,
      territory: 'peninsula-balearics-common',
      currentAutonomousCommunity,
      classification: {
        category: 'M1', co2GKm, co2Verified: true,
        singleNonCombustionEngine: false, vehicleKind: 'standard',
      },
    });

    assert.equal(rate('andalucia', '2010-07-09').rate, 0.1475);
    assert.equal(rate('andalucia', '2010-07-10').rate, 0.16);
    assert.equal(rate('andalucia', '2011-12-31').rate, 0.16);
    assert.equal(rate('andalucia', '2012-01-01').rate, 0.169);
    assert.equal(rate('andalucia', '2021-12-31', 250).rate, 0.169);
    assert.equal(rate('andalucia', '2022-01-01', 250).rate, 0.1475);

    assert.equal(rate('asturias', '2010-07-14').rate, 0.1475);
    assert.equal(rate('asturias', '2010-07-15').rate, 0.16);

    assert.equal(rate('baleares', '2012-04-30').rate, 0.1475);
    assert.equal(rate('baleares', '2012-05-01').rate, 0.16);

    assert.equal(rate('cantabria', '2010-12-31').rate, 0.1475);
    assert.equal(rate('cantabria', '2011-01-01').rate, 0.16);
    assert.equal(rate('cantabria', '2017-12-31').rate, 0.16);
    assert.equal(rate('cantabria', '2018-01-01').rate, 0.15);
    assert.equal(rate('cantabria', '2010-12-31', 170).rate, 0.0975);
    assert.equal(rate('cantabria', '2011-01-01', 170).rate, 0.11);
    assert.equal(rate('cantabria', '2017-12-31', 170).rate, 0.11);
    assert.equal(rate('cantabria', '2018-01-01', 170).rate, 0.0975);

    assert.equal(rate('cataluna', '2010-06-30').rate, 0.1475);
    assert.equal(rate('cataluna', '2010-07-01').rate, 0.16);

    assert.equal(rate('murcia', '2014-08-02').rate, 0.1475);
    assert.equal(rate('murcia', '2014-08-03').rate, 0.159);

    assert.equal(rate('comunidad-valenciana', '2016-12-31').rate, 0.1475);
    assert.equal(rate('comunidad-valenciana', '2017-01-01').rate, 0.16);
  });

  it('cada fila autonómica conserva metadatos y una fuente oficial registrada', () => {
    assert.ok(HISTORICAL_IEDMT_AUTONOMOUS_RATE_RULES.length > 0);
    for (const rule of HISTORICAL_IEDMT_AUTONOMOUS_RATE_RULES) {
      assert.match(rule.validFrom, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(rule.validTo, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(rule.validFrom <= rule.validTo);
      assert.ok(rule.epigraph >= 1 && rule.epigraph <= 9);
      assert.ok(Number(rule.rate) >= 0);
      assert.ok(rule.law.length > 0);
      assert.ok(rule.article.length > 0);
      assert.equal(rule.reviewedAt, '2026-08-05');
      assert.match(rule.officialSourceUrl, /^https:\/\/www\.boe\.es\//);
      assert.ok(rule.sourceIds.length > 0);
      rule.sourceIds.forEach((sourceId) => assert.ok(FISCAL_SOURCE_REFERENCE_BY_ID[sourceId]));
    }
  });

  it('bloquea honestamente cada territorio especial con fuentes y salida avanzada', () => {
    const classification = {
      category: 'M1' as const, co2GKm: 220, co2Verified: true,
      singleNonCombustionEngine: false, vehicleKind: 'standard' as const,
    };
    const cases = [
      ['canary-islands', 'canarias'],
      ['ceuta-melilla', 'ceuta'],
      ['ceuta-melilla', 'melilla'],
      ['navarra', 'navarra'],
      ['basque-country', 'pais-vasco'],
    ] as const;
    for (const [territory, currentAutonomousCommunity] of cases) {
      const result = resolveHistoricalIedmtRate({
        firstRegistrationDate: '2020-01-01', territory, currentAutonomousCommunity, classification,
      });
      assert.equal(result.status, 'blocked');
      assert.equal(result.blocker?.id, HISTORICAL_SPECIAL_TERRITORY_COVERAGE[territory].blockerId);
      assert.ok((result.blocker?.sourceIds.length ?? 0) > 0);
      assert.match(result.blocker?.message ?? '', /modo avanzado/);
      assert.match(result.blocker?.message ?? '', /revisión externa/);
    }
  });
});

describe('minoración residual con aritmética decimal exacta', () => {
  it('calcula VM 10.000 / 1,2575 sin redondeos intermedios', () => {
    const result = calculateResidualTaxMinoration({
      marketValueAfterDepreciation: '10000',
      firstRegistrationDate: '2018-01-01',
      currentRegistrationTerritory: 'peninsula-balearics-common',
      historicalVehicleTaxClassification: {
        category: 'M1', co2GKm: 140, co2Verified: true, singleNonCombustionEngine: false, vehicleKind: 'standard',
      },
      historicalVatRate: '0.21',
      historicalIedmtRate: '0.0475',
      otherIndirectTaxRates: [],
      rateSourceIds: ['test-official-rates'],
    });
    assert.equal(result.denominator, 1.2575);
    assert.equal(result.exactValues.taxableBaseAfterMinoration, '7952.286282306163021869');
    closeTo(result.taxableBaseAfterMinoration, 7_952.286282306163, 1e-12);
  });

  it('calcula VM 16.380 con IVA 21% e IEDMT 9,75%', () => {
    const result = calculateResidualTaxMinoration({
      marketValueAfterDepreciation: '16380',
      firstRegistrationDate: '2018-01-01',
      currentRegistrationTerritory: 'peninsula-balearics-common',
      historicalVehicleTaxClassification: {
        category: 'M1', co2GKm: 170, co2Verified: true, singleNonCombustionEngine: false, vehicleKind: 'standard',
      },
      historicalVatRate: '0.21',
      historicalIedmtRate: '0.0975',
      otherIndirectTaxRates: [],
    });
    assert.equal(result.exactValues.taxableBaseAfterMinoration, '12527.724665391969407266');
    closeTo(result.taxableBaseAfterMinoration, 12_527.72466539197, 1e-11);
  });

  it('bloquea tipos ausentes y no convierte tiposOTROS desconocido en cero', () => {
    const result = calculateResidualTaxMinoration({
      marketValueAfterDepreciation: 10_000,
      firstRegistrationDate: '2018-01-01',
      currentRegistrationTerritory: 'canary-islands',
      historicalVehicleTaxClassification: {
        category: 'M1', co2GKm: 140, co2Verified: true, singleNonCombustionEngine: false, vehicleKind: 'standard',
      },
      historicalVatRate: null,
      historicalIedmtRate: null,
      otherIndirectTaxRates: null,
    });
    assert.equal(result.status, 'blocked');
    assert.ok(result.blockers.some((item) => item.id === 'unknown-other-indirect-taxes'));
  });
});

describe('reducciones legales separadas de la minoración', () => {
  it('mantiene la casilla 02 vacía sin reducción', () => {
    assert.equal(applyModel576BaseReduction(10_000, undefined, { vehicleKind: 'standard' }).status, 'not-applicable');
  });

  it('aplica 50%, 70% y 20% con la evidencia necesaria', () => {
    const family = {
      claimed: true as const,
      priorRecognitionStatus: 'granted' as const,
      resolutionReference: 'RES-1',
      resolutionDate: '2026-01-01',
      evidenceReference: 'DOC-1',
    };
    const motorhome = { claimed: true as const, eligibilityConfirmed: true, evidenceReference: 'ITV-1' };
    assert.equal(applyModel576BaseReduction(10_000, { largeFamily: family }, { vehicleKind: 'standard' }).reducedBase, 5_000);
    assert.equal(applyModel576BaseReduction(10_000, { motorhome }, { vehicleKind: 'motorhome' }).reducedBase, 7_000);
    assert.equal(applyModel576BaseReduction(10_000, { largeFamily: family, motorhome }, { vehicleKind: 'motorhome' }).reducedBase, 2_000);
  });

  it('bloquea familia numerosa sin reconocimiento previo', () => {
    const result = applyModel576BaseReduction(10_000, {
      largeFamily: { claimed: true, priorRecognitionStatus: 'pending' },
    }, { vehicleKind: 'standard' });
    assert.equal(result.status, 'blocked');
  });

  it('bloquea la reducción de vivienda para un vehículo standard', () => {
    const result = applyModel576BaseReduction(10_000, {
      motorhome: { claimed: true, eligibilityConfirmed: true, evidenceReference: 'FICHA-ITV-1' },
    }, { vehicleKind: 'standard' });
    assert.equal(result.status, 'blocked');
    assert.ok(result.blockers.some((item) => item.id === 'motorhome-reduction-incompatible-vehicle'));
  });
});

describe('epígrafe actual explícito', () => {
  it('respeta todas las fronteras M1 actuales', () => {
    const epigraph = (co2GKm: number) => resolveCurrentEpigraph({
      registrationTaxRoute: 'model-576', category: 'M1', co2GKm, co2Verified: true,
      singleNonCombustionEngine: false, vehicleKind: 'standard',
    }).epigraph;
    assert.equal(epigraph(120), 1);
    assert.equal(epigraph(121), 2);
    assert.equal(epigraph(159), 2);
    assert.equal(epigraph(160), 3);
    assert.equal(epigraph(199), 3);
    assert.equal(epigraph(200), 4);
  });

  it('no aplica M1 a N1 y somete CO2 no acreditado a revisión', () => {
    assert.equal(resolveCurrentEpigraph({
      registrationTaxRoute: 'model-576', category: 'N1', co2GKm: 130, co2Verified: true,
      singleNonCombustionEngine: false, vehicleKind: 'standard',
    }).status, 'blocked');
    const unverified = resolveCurrentEpigraph({
      registrationTaxRoute: 'model-576', category: 'M1', co2GKm: null, co2Verified: false,
      singleNonCombustionEngine: false, vehicleKind: 'standard',
    });
    assert.equal(unverified.status, 'special-review');
    assert.equal(unverified.epigraph, 4);
  });
});

describe('orquestador Modelo 576', () => {
  function usedOfficialInput(overrides: Partial<Model576CalculationInput> = {}): Model576CalculationInput {
    const match = confirmOfficialVehicleMatch({
      officialVehicle: OFFICIAL_ROW,
      vehicle: {
        brand: OFFICIAL_ROW.brand, model: OFFICIAL_ROW.model, version: OFFICIAL_ROW.version,
        fuelType: OFFICIAL_ROW.fuelType, engineCapacityCc: OFFICIAL_ROW.engineCapacityCc,
        powerKw: OFFICIAL_ROW.powerKw, co2Gkm: OFFICIAL_ROW.co2Gkm,
      },
      firstRegistrationDate: '2018-01-01',
    });
    return {
      registrationTaxRoute: 'model-576',
      registrationTaxSubjectConfirmed: true,
      accrualDate: '2026-08-05',
      referenceDate: '2026-08-05',
      firstRegistrationDate: '2018-01-01',
      mileageKm: 100_000,
      currentAutonomousCommunity: 'madrid',
      vehicle: {
        category: 'M1', co2GKm: 220, co2Verified: true,
        singleNonCombustionEngine: false, kind: 'standard',
      },
      previouslyRegisteredAbroad: true,
      valuation: { method: 'official-table', match, catalogVersion: 'HAC-2026', invoicePrice: 3_000 },
      historicalTaxes: {
        mode: 'automatic', territory: 'peninsula-balearics-common', otherIndirectTaxesConfirmedNone: true,
      },
      ...overrides,
    };
  }

  it('separa el IEDMT histórico 0% del tipo actual madrileño 4,75%', () => {
    const row2021 = { ...OFFICIAL_ROW, commercialEndYear: 2022, co2Gkm: 130 };
    const match = confirmOfficialVehicleMatch({
      officialVehicle: row2021,
      vehicle: {
        brand: row2021.brand, model: row2021.model, version: row2021.version,
        fuelType: row2021.fuelType, engineCapacityCc: row2021.engineCapacityCc,
        powerKw: row2021.powerKw, co2Gkm: row2021.co2Gkm,
      },
      firstRegistrationDate: '2021-08-15',
    });
    const result = calculateModel576(usedOfficialInput({
      firstRegistrationDate: '2021-08-15',
      currentAutonomousCommunity: 'madrid',
      vehicle: {
        category: 'M1', co2GKm: 130, co2Verified: true,
        singleNonCombustionEngine: false, kind: 'standard',
      },
      valuation: { method: 'official-table', match, catalogVersion: 'HAC-2026' },
    }));
    assert.equal(result.status, 'complete-official-table');
    assert.equal(result.vehicleStatus, 'used');
    assert.equal(result.historicalVatRateForResidualTax, 0.21);
    assert.equal(result.historicalIedmtRateForResidualTax, 0);
    assert.equal(result.currentIedmtRateForLiquidation, 0.0475);
    assert.notEqual(result.historicalIedmtRateForResidualTax, result.currentIedmtRateForLiquidation);
    assert.equal(result.epigraph, 2);
  });

  it('un vehículo nuevo usa base IVA sin depreciación ni minoración', () => {
    const result = calculateModel576({
      registrationTaxRoute: 'model-576',
      registrationTaxSubjectConfirmed: true,
      accrualDate: '2026-08-05',
      referenceDate: '2026-08-05',
      firstRegistrationDate: '2026-05-01',
      mileageKm: 20_000,
      currentAutonomousCommunity: 'madrid',
      vehicle: {
        category: 'M1', co2GKm: 130, co2Verified: true,
        singleNonCombustionEngine: false, kind: 'standard',
      },
      previouslyRegisteredAbroad: false,
      valuation: {
        method: 'new-vehicle-vat-base', vatTaxableBase: '20000', currency: 'EUR', sourceDescription: 'Factura desglosada',
      },
    });
    assert.equal(result.status, 'complete-new-vehicle');
    assert.equal(result.box01TaxableBase, 20_000);
    assert.equal(result.depreciationPercentage, null);
    assert.equal(result.residualTaxAmountRemoved, null);
    assert.equal(result.box08FinalResult, 950);
  });

  it('convierte una base de vehículo nuevo en moneda extranjera y bloquea si falta el cambio', () => {
    const base: Model576CalculationInput = {
      registrationTaxRoute: 'model-576',
      registrationTaxSubjectConfirmed: true,
      accrualDate: '2026-08-05',
      referenceDate: '2026-08-05',
      firstRegistrationDate: '2026-05-01',
      mileageKm: 20_000,
      currentAutonomousCommunity: 'madrid',
      vehicle: {
        category: 'M1', co2GKm: 130, co2Verified: true,
        singleNonCombustionEngine: false, kind: 'standard',
      },
      previouslyRegisteredAbroad: false,
      valuation: {
        method: 'new-vehicle-vat-base',
        vatTaxableBase: '20000',
        currency: 'USD',
        exchangeRateToEur: '0.90',
        netPrice: '21000',
        discounts: '1500',
        taxableAccessoryCosts: '500',
        sourceDescription: 'Factura y cambio oficial aportado',
      },
    };
    assert.equal(calculateModel576(base).box01TaxableBase, 18_000);
    const missingRate = calculateModel576({
      ...base,
      valuation: {
        method: 'new-vehicle-vat-base',
        vatTaxableBase: '20000',
        currency: 'USD',
        exchangeRateToEur: null,
        sourceDescription: 'Factura sin cambio acreditado',
      },
    });
    assert.equal(missingRate.status, 'blocked');
    assert.ok(missingRate.blockers.some((blocker) => blocker.id === 'missing-exchange-rate'));
  });

  it('la factura de usado queda como comparación y no sustituye el valor oficial', () => {
    const result = calculateModel576(usedOfficialInput());
    assert.equal(result.usedInvoiceComparison?.invoicePrice, 3_000);
    assert.equal(result.usedInvoiceComparison?.officialOrJustifiedMarketValue, 7_200);
    assert.ok((result.box01TaxableBase ?? 0) > 3_000);
  });

  it('una selección ambigua bloquea y no inventa valor', () => {
    const ambiguous = matchOfficialVehicle({
      catalog: [OFFICIAL_ROW, { ...OFFICIAL_ROW, id: 'HAC-2026-TEST-002', version: 'OTRA' }],
      vehicle: { brand: OFFICIAL_ROW.brand, model: OFFICIAL_ROW.model },
      firstRegistrationDate: '2018-01-01',
    });
    const result = calculateModel576(usedOfficialInput({
      valuation: { method: 'official-table', match: ambiguous, catalogVersion: 'HAC-2026' },
    }));
    assert.equal(result.status, 'blocked');
    assert.equal(result.box01TaxableBase, null);
  });

  it('rechaza un exact-confirmed construido con candidatas incoherentes', () => {
    const valid = confirmOfficialVehicleMatch({
      officialVehicle: OFFICIAL_ROW,
      vehicle: { brand: OFFICIAL_ROW.brand, model: OFFICIAL_ROW.model, version: OFFICIAL_ROW.version },
      firstRegistrationDate: '2018-01-01',
    });
    const input = usedOfficialInput({
      valuation: {
        method: 'official-table',
        match: { ...valid, candidates: [] },
        catalogVersion: 'HAC-2026',
      },
    });
    assert.equal(Model576CalculationInputSchema.safeParse(input).success, false);
    assert.equal(calculateModel576(input).status, 'incomplete');
  });

  it('los tipos históricos aportados exigen fuente y quedan no verificados', () => {
    const result = calculateModel576(usedOfficialInput({
      historicalTaxes: {
        mode: 'user-provided', historicalVatRate: '0.20', historicalIedmtRate: '0.10',
        otherIndirectTaxRates: ['0.01'], sourceDescription: 'Resolución aportada por el usuario',
      },
    }));
    assert.equal(result.status, 'special-review');
    assert.ok(result.box08FinalResult !== null);
    assert.ok(result.warnings.some((warning) => warning.id === 'historical-rates-user-provided-unverified'));
  });

  it('prepara una valoración de mercado justificada sin equipararla a la tabla oficial', () => {
    const base = usedOfficialInput();
    const result = calculateModel576({
      ...base,
      valuation: {
        method: 'justified-market-value',
        marketValue: '8000',
        valuationDate: base.accrualDate,
        methodDescription: 'Informe pericial por estado singular',
        sourceDescription: 'Informe PER-2026-1',
        reasonForNotUsingTable: 'La versión exacta no figura en el catálogo',
        supportingDocument: 'PER-2026-1.pdf',
        invoicePrice: '5000',
      },
    });
    assert.equal(result.status, 'estimated-justified-market-value');
    assert.equal(result.officialVehicleValue, null);
    assert.equal(result.marketValueAfterDepreciation, 8_000);
    assert.ok(result.warnings.some((warning) => warning.id === 'user-justified-market-value-not-verified'));
  });

  it('genera las ocho casillas y aplica la concurrencia acreditada al 20%', () => {
    const result = calculateModel576(usedOfficialInput({
      previouslyRegisteredAbroad: false,
      vehicle: {
        category: 'M1', co2GKm: 220, co2Verified: true,
        singleNonCombustionEngine: false, kind: 'motorhome',
      },
      reductions: {
        largeFamily: {
          claimed: true,
          priorRecognitionStatus: 'granted',
          resolutionReference: 'RES-576-1',
          resolutionDate: '2026-07-01',
          evidenceReference: 'MODELO-05-1',
        },
        motorhome: { claimed: true, eligibilityConfirmed: true, evidenceReference: 'FICHA-ITV-1' },
      },
    }));
    assert.equal(result.status, 'complete-official-table');
    assert.equal(result.reductionKind, 'large-family-and-motorhome-20');
    assert.equal(result.box02ReducedTaxableBase, 1_440);
    assert.deepEqual(result.boxGuidance.map((box) => box.box), ['01', '02', '03', '04', '05', '06', '07', '08']);
  });

  it('bloquea una reducción de vivienda incompatible en el orquestador', () => {
    const result = calculateModel576(usedOfficialInput({
      reductions: {
        motorhome: { claimed: true, eligibilityConfirmed: true, evidenceReference: 'FICHA-ITV-1' },
      },
    }));
    assert.equal(result.status, 'blocked');
    assert.ok(result.blockers.some((item) => item.id === 'motorhome-reduction-incompatible-vehicle'));
  });

  it('no acepta una deducción lineal no incluida en un registro oficial 2026', () => {
    const result = calculateModel576(usedOfficialInput({
      linearDeduction: {
        amount: '100', officialMeasureId: 'MEDIDA-INVENTADA',
        sourceId: 'fuente-inventada', applicableConfirmed: true,
      },
    }));
    assert.equal(result.status, 'blocked');
    assert.ok(result.blockers.some((item) => item.id === 'linear-deduction-measure-not-versioned'));
    assert.equal(result.box08FinalResult, null);
  });

  it('limita la casilla 07 a complementarias y descuenta una previa válida', () => {
    const invalid = calculateModel576(usedOfficialInput({
      complementary: { isComplementary: false, previousReturnsAmount: '100' },
    }));
    assert.equal(invalid.status, 'blocked');
    assert.ok(invalid.blockers.some((item) => item.id === 'box-07-only-complementary'));

    const valid = calculateModel576(usedOfficialInput({
      complementary: { isComplementary: true, previousReturnsAmount: '100' },
    }));
    assert.equal(valid.status, 'complete-official-table');
    assert.equal(valid.box07PreviousReturnsToDeduct, 100);
    assert.equal(valid.box08FinalResult, (valid.box06AmountAfterDeduction ?? 0) - 100);
  });

  it('bloquea el 576 cuando la sujeción no está confirmada', () => {
    const result = calculateModel576(usedOfficialInput({ registrationTaxSubjectConfirmed: false }));
    assert.equal(result.status, 'blocked');
    assert.ok(result.blockers.some((item) => item.id === 'model-576-subjection-not-confirmed'));
  });

  it('no calcula si el router determina Modelo 05/06 o en territorios forales', () => {
    assert.equal(calculateModel576(usedOfficialInput({ registrationTaxRoute: 'model-05' })).status, 'special-review');
    assert.equal(calculateModel576(usedOfficialInput({ registrationTaxRoute: 'model-06' })).status, 'special-review');
    const navarra = calculateModel576(usedOfficialInput({
      currentAutonomousCommunity: 'navarra',
      historicalTaxes: { mode: 'automatic', territory: 'navarra', otherIndirectTaxesConfirmedNone: false },
    }));
    assert.equal(navarra.status, 'blocked');
    assert.equal(navarra.box08FinalResult, null);
    const basqueCountry = calculateModel576(usedOfficialInput({
      currentAutonomousCommunity: 'pais-vasco',
      historicalTaxes: { mode: 'automatic', territory: 'basque-country', otherIndirectTaxesConfirmedNone: false },
    }));
    assert.equal(basqueCountry.status, 'blocked');
    assert.equal(basqueCountry.box08FinalResult, null);
  });

  it('usa la serie histórica asturiana versionada en el cálculo completo', () => {
    const result = calculateModel576(usedOfficialInput({ currentAutonomousCommunity: 'asturias' }));
    assert.equal(result.status, 'complete-official-table');
    assert.equal(result.historicalIedmtRateForResidualTax, 0.16);
    assert.ok(result.sourceIds.includes('boe-asturias-law-5-2010-art-7'));
  });
});

function closeTo(actual: number | null, expected: number, tolerance: number): void {
  assert.notEqual(actual, null);
  assert.ok(Math.abs((actual as number) - expected) <= tolerance, `${actual} ≉ ${expected}`);
}
