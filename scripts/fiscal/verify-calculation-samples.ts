import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  calculateModel576,
  calculateOfficialDepreciation,
  matchOfficialVehicle,
  type FiscalExplanationStep,
  type Model576CalculationInput,
  type OfficialVehicleValue as FiscalOfficialVehicleValue,
  type VehicleCatalogIdentity,
} from "../../src/domain/registration/fiscal";
import {
  CATALOG_PATH,
  CATALOG_VERSION_ID,
  GENERATED_DIR,
  PDF_URL,
  SAMPLES_PATH,
  SOURCE_ID,
  type OfficialVehicleValue as CatalogOfficialVehicleValue,
  readJsonLines,
} from "./catalog-utils";

const OUTPUT_PATH = resolve(
  GENERATED_DIR,
  "verification-calculations-2026.json",
);

/**
 * CO2 acreditado únicamente para estos escenarios de prueba. El Anexo I de la
 * Orden HAC/1501/2025 no publica CO2 y este script nunca lo infiere de allí.
 */
const SCENARIO_CO2_G_KM = [165, 220, 110, 130, 210, 155, 0, 105, 125, 0] as const;

/**
 * Páginas cotejadas en el PDF oficial. `documentPageNumber` cuenta páginas del
 * archivo desde 1; `boePrintedPageNumber` es la numeración impresa en el BOE.
 */
const VERIFIED_PDF_PAGE_MAP = [
  { sampleNumber: 1, documentPageNumber: 178, boePrintedPageNumber: 171757 },
  { sampleNumber: 2, documentPageNumber: 844, boePrintedPageNumber: 172423 },
  { sampleNumber: 3, documentPageNumber: 27, boePrintedPageNumber: 171606 },
  { sampleNumber: 4, documentPageNumber: 1605, boePrintedPageNumber: 173184 },
  { sampleNumber: 5, documentPageNumber: 1260, boePrintedPageNumber: 172839 },
  { sampleNumber: 6, documentPageNumber: 1185, boePrintedPageNumber: 172764 },
  { sampleNumber: 7, documentPageNumber: 1272, boePrintedPageNumber: 172851 },
  { sampleNumber: 8, documentPageNumber: 1553, boePrintedPageNumber: 173132 },
  { sampleNumber: 9, documentPageNumber: 20, boePrintedPageNumber: 171599 },
  { sampleNumber: 10, documentPageNumber: 6, boePrintedPageNumber: 171585 },
] as const;

type VerificationSample = {
  sampleNumber: number;
  verificationMethod: string;
  sourceDocumentId: string;
  officialRowReference: string;
  sourceXmlLine: number;
  brand: string;
  officialModelType: string;
  commercialPeriod: [number | null, number | null];
  fuelType: string | null;
  newVehicleOfficialValue: number;
  rawOfficialCells: string[];
  normalizedRowId: string;
  suggestedCalculationFixture: {
    firstRegistrationDate: string;
    taxableEventDate: string;
    mileageKm: number;
    note: string;
  };
};

async function main(): Promise<void> {
  const [catalog, samples] = await Promise.all([
    readJsonLines<CatalogOfficialVehicleValue>(CATALOG_PATH),
    readSamples(),
  ]);
  assert(samples.length === 10, `Se esperaban 10 muestras y se encontraron ${samples.length}.`);
  assert(VERIFIED_PDF_PAGE_MAP.length === samples.length, "El mapa PDF debe cubrir las diez muestras.");

  const catalogById = new Map<string, CatalogOfficialVehicleValue>();
  for (const row of catalog) {
    assert(!catalogById.has(row.id), `Identificador duplicado en el JSONL: ${row.id}.`);
    catalogById.set(row.id, row);
  }

  const calculations = samples
    .sort((left, right) => left.sampleNumber - right.sampleNumber)
    .map((sample, index) => verifySample(sample, index, catalog, catalogById));

  verifyHistoricalCurrentRateSeparation(calculations);

  const report = {
    schemaVersion: 1,
    verificationDate: "2026-08-05",
    catalogVersionId: CATALOG_VERSION_ID,
    sourceDocumentId: SOURCE_ID,
    sourceCatalogRelativePath: "data/fiscal/generated/official-vehicle-values-2026.jsonl",
    scenarioDisclosure: {
      fictitious: true,
      co2FromAnnexI: false,
      statement: "Las fechas de expediente, el kilometraje, el territorio y el CO2 son entradas ficticias de verificación. El CO2 no figura en el Anexo I y no se ha inferido de la tabla.",
      sharedAssumptions: {
        registrationTaxSubjectConfirmed: true,
        currentAutonomousCommunity: "madrid",
        historicalTaxTerritory: "peninsula-balearics-common",
        noOtherIndirectTaxesConfirmed: true,
        noReductionsClaimed: true,
        previouslyRegisteredAbroad: true,
      },
    },
    historicalCurrentRateSeparationCheck: {
      sampleNumber: 4,
      brand: "VOLKSWAGEN",
      firstRegistrationDate: "2021-08-15",
      scenarioCo2GKm: 130,
      historicalEpigraph: 1,
      historicalIedmtRateForResidualTax: 0,
      currentEpigraph: 2,
      currentIedmtRateForLiquidation: 0.0475,
      passed: true,
      statement: "La fecha histórica cae en los umbrales temporales de 2021: 130 g/km tributaba al 0 %. En Madrid en 2026 corresponde el epígrafe 2 y el 4,75 %. Los tipos no se mezclan.",
    },
    totalVerifiedCalculations: calculations.length,
    calculations,
  };

  mkdirSync(GENERATED_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Verificación fiscal completada: ${calculations.length} cálculos exactos.`);
  console.log(`Informe: ${OUTPUT_PATH}`);
}

function verifySample(
  sample: VerificationSample,
  index: number,
  catalog: readonly CatalogOfficialVehicleValue[],
  catalogById: ReadonlyMap<string, CatalogOfficialVehicleValue>,
) {
  assert(sample.sampleNumber === index + 1, `Numeración inesperada en la muestra ${sample.sampleNumber}.`);
  const officialRow = catalogById.get(sample.normalizedRowId);
  assert(officialRow, `No existe normalizedRowId ${sample.normalizedRowId} en el JSONL.`);
  verifySampleAgainstCatalogRow(sample, officialRow);

  const page = VERIFIED_PDF_PAGE_MAP[index];
  assert(page.sampleNumber === sample.sampleNumber, `Mapa PDF desordenado para muestra ${sample.sampleNumber}.`);
  assert(
    page.boePrintedPageNumber - page.documentPageNumber === 171_579,
    `La doble numeración PDF/BOE no es coherente en la muestra ${sample.sampleNumber}.`,
  );

  const identity: VehicleCatalogIdentity = {
    brand: sample.brand,
    model: sample.officialModelType,
    version: null,
    fuelType: sample.fuelType,
    engineCapacityCc: officialNumber(sample.rawOfficialCells[3]),
    powerKw: officialNumber(sample.rawOfficialCells[6]),
  };
  const match = matchOfficialVehicle({
    catalog: catalog as readonly FiscalOfficialVehicleValue[],
    vehicle: identity,
    firstRegistrationDate: sample.suggestedCalculationFixture.firstRegistrationDate,
    confirmedOfficialVehicleId: sample.normalizedRowId,
  });
  assert(match.status === "exact-confirmed", `La muestra ${sample.sampleNumber} no produjo match exacto: ${match.status}.`);
  assert(match.selected?.id === sample.normalizedRowId, `La muestra ${sample.sampleNumber} seleccionó otra fila.`);
  assert(match.discrepancies.length === 0, `La muestra ${sample.sampleNumber} presenta discrepancias de matcher.`);

  const co2GKm = SCENARIO_CO2_G_KM[index];
  const singleNonCombustionEngine = sample.fuelType === "Elc";
  const fixture = sample.suggestedCalculationFixture;
  const input: Model576CalculationInput = {
    registrationTaxRoute: "model-576",
    registrationTaxSubjectConfirmed: true,
    accrualDate: fixture.taxableEventDate,
    referenceDate: fixture.taxableEventDate,
    firstRegistrationDate: fixture.firstRegistrationDate,
    firstService: null,
    mileageKm: fixture.mileageKm,
    currentAutonomousCommunity: "madrid",
    vehicle: {
      category: "M1",
      co2GKm,
      co2Verified: true,
      singleNonCombustionEngine,
      kind: "standard",
    },
    previouslyRegisteredAbroad: true,
    professionalUseHistory: null,
    valuation: {
      method: "official-table",
      match,
      catalogVersion: CATALOG_VERSION_ID,
    },
    historicalTaxes: {
      mode: "automatic",
      territory: "peninsula-balearics-common",
      otherIndirectTaxesConfirmedNone: true,
    },
    reductions: {
      largeFamily: {
        claimed: false,
        priorRecognitionStatus: "not-requested",
      },
      motorhome: {
        claimed: false,
        eligibilityConfirmed: false,
      },
    },
    linearDeduction: null,
    complementary: {
      isComplementary: false,
      previousReturnsAmount: 0,
    },
  };

  const depreciation = calculateOfficialDepreciation({
    firstServiceDate: fixture.firstRegistrationDate,
    accrualDate: fixture.taxableEventDate,
    officialNewValue: officialRow.newVehicleOfficialValue,
    professionalUseHistory: null,
  });
  assert(depreciation.status === "complete", `Depreciación bloqueada en muestra ${sample.sampleNumber}.`);

  const calculation = calculateModel576(input);
  assert(
    calculation.status === "complete-official-table",
    `Cálculo ${sample.sampleNumber} no completo (${calculation.status}): ${calculation.blockers.map((item) => item.id).join(", ")}`,
  );
  assert(calculation.vehicleStatus === "used", `La muestra ${sample.sampleNumber} no fue clasificada como usada.`);
  assert(calculation.blockers.length === 0, `La muestra ${sample.sampleNumber} conserva bloqueadores.`);
  assert(calculation.depreciationPercentage === depreciation.percentage, `Porcentaje de depreciación divergente en muestra ${sample.sampleNumber}.`);
  assert(
    calculation.marketValueAfterDepreciation === depreciation.marketValueAfterDepreciation,
    `Valor de mercado divergente en muestra ${sample.sampleNumber}.`,
  );

  const historicalIedmtStep = findExplanation(calculation.explanation, "historical-iedmt-rate");
  const historicalVatStep = findExplanation(calculation.explanation, "historical-vat-rate");
  const minorationStep = findExplanation(calculation.explanation, "residual-indirect-tax-minoration");
  const historicalEpigraph = numberFromRecord(historicalIedmtStep.output, "historicalEpigraph");
  const denominator = numberFromRecord(minorationStep.output, "denominator");

  return {
    sampleNumber: sample.sampleNumber,
    officialRow: {
      normalizedRowId: officialRow.id,
      catalogVersionId: officialRow.catalogVersionId,
      sourceDocumentId: officialRow.sourceDocumentId,
      sourceOrder: officialRow.sourceOrder,
      sourceAnnex: officialRow.sourceAnnex,
      officialPdfUrl: PDF_URL,
      officialRowReference: officialRow.officialRowReference,
      sourceXmlLine: officialRow.sourceXmlLine,
      sourceChecksum: officialRow.sourceChecksum,
      brand: officialRow.brand,
      officialModelType: officialRow.officialModelType,
      commercialStartYear: officialRow.commercialStartYear,
      commercialEndYear: officialRow.commercialEndYear,
      fuelType: officialRow.fuelType,
      engineCapacityCc: officialRow.engineCapacityCc,
      powerKw: officialRow.powerKw,
      newVehicleOfficialValue: officialRow.newVehicleOfficialValue,
      rawOfficialCells: officialRow.rawOfficialCells,
      sampleVerificationMethod: sample.verificationMethod,
      verifiedPdfLocation: {
        mappingVerified: true,
        documentPageNumber: page.documentPageNumber,
        boePrintedPageNumber: page.boePrintedPageNumber,
        numberingNote: "Página del documento PDF contada desde 1 / página impresa en el pie del BOE.",
      },
    },
    exactMatch: {
      status: match.status,
      selectedNormalizedRowId: match.selected?.id ?? null,
      discrepancies: match.discrepancies,
      sourceIds: match.sourceIds,
      explanation: match.explanation,
    },
    fictitiousScenarioInputs: {
      explicitlyFictitious: true,
      suggestedFixtureUsedUnchanged: true,
      firstRegistrationDate: fixture.firstRegistrationDate,
      accrualDate: fixture.taxableEventDate,
      referenceDate: fixture.taxableEventDate,
      mileageKm: fixture.mileageKm,
      co2GKm,
      co2VerifiedForScenario: true,
      co2FromAnnexI: false,
      co2Disclosure: "Valor ficticio exclusivo de la prueba; no consta en el Anexo I.",
      singleNonCombustionEngine,
      category: "M1",
      vehicleKind: "standard",
      currentAutonomousCommunity: "madrid",
      registrationTaxSubjectConfirmed: true,
      historicalTaxTerritory: "peninsula-balearics-common",
      noOtherIndirectTaxesConfirmed: true,
      noReductionsClaimed: true,
      noProfessionalUseAdjustment: true,
      previouslyRegisteredAbroad: true,
      originalFixtureNote: fixture.note,
    },
    depreciation: {
      status: depreciation.status,
      completedYears: depreciation.completedYears,
      completedMonthsAfterAnniversary: depreciation.completedMonthsAfterAnniversary,
      nextAnniversary: depreciation.nextAnniversary,
      percentage: depreciation.percentage,
      percentageExact: depreciation.percentageExact,
      officialNewValue: depreciation.officialNewValue,
      valueBeforeProfessionalUseReduction: depreciation.marketValueBeforeProfessionalUseReduction,
      professionalUseFactor: depreciation.professionalUseFactor,
      marketValueAfterDepreciation: depreciation.marketValueAfterDepreciation,
      marketValueExact: depreciation.marketValueExact,
      sourceIds: depreciation.sourceIds,
    },
    historicalRatesForResidualTax: {
      historicalEpigraph,
      historicalVatRate: calculation.historicalVatRateForResidualTax,
      historicalIedmtRate: calculation.historicalIedmtRateForResidualTax,
      otherIndirectTaxRateTotal: calculation.otherIndirectTaxRateTotal,
      historicalVatSourceIds: historicalVatStep.sourceIds,
      historicalIedmtSourceIds: historicalIedmtStep.sourceIds,
      sourceIds: [...new Set([...historicalVatStep.sourceIds, ...historicalIedmtStep.sourceIds])],
    },
    residualTaxMinorationAndBase: {
      formula: minorationStep.formula,
      marketValueBeforeMinoration: calculation.marketValueAfterDepreciation,
      denominator,
      residualTaxAmountRemoved: calculation.residualTaxAmountRemoved,
      box01TaxableBase: calculation.box01TaxableBase,
      box01TaxableBaseExact: calculation.exactValues.box01TaxableBase,
      reductionKind: calculation.reductionKind,
      box02ReducedTaxableBase: calculation.box02ReducedTaxableBase,
      sourceIds: minorationStep.sourceIds,
    },
    currentLiquidation: {
      epigraph: calculation.epigraph,
      currentIedmtRate: calculation.currentIedmtRateForLiquidation,
      box04TaxQuota: calculation.box04TaxQuota,
      box04TaxQuotaExact: calculation.exactValues.box04TaxQuotaBeforeRounding,
      box05LinearDeduction: calculation.box05LinearDeduction,
      box06AmountAfterDeduction: calculation.box06AmountAfterDeduction,
      box07PreviousReturnsToDeduct: calculation.box07PreviousReturnsToDeduct,
      box08FinalResult: calculation.box08FinalResult,
      box08FinalResultExact: calculation.exactValues.box08FinalResultBeforeRounding,
    },
    result: {
      status: calculation.status,
      vehicleStatus: calculation.vehicleStatus,
      valuationMethod: calculation.valuationMethod,
      catalogVersion: calculation.catalogVersion,
      sourceIds: calculation.sourceIds,
      warnings: calculation.warnings,
      blockers: calculation.blockers,
      boxGuidance: calculation.boxGuidance,
    },
  };
}

function verifyHistoricalCurrentRateSeparation(
  calculations: ReturnType<typeof verifySample>[],
): void {
  const volkswagen = calculations.find((item) => item.sampleNumber === 4);
  assert(volkswagen, "Falta la muestra Volkswagen para verificar la separación de tipos.");
  assert(
    volkswagen.fictitiousScenarioInputs.firstRegistrationDate === "2021-08-15",
    "La muestra Volkswagen debe usar la fecha histórica 2021-08-15.",
  );
  assert(volkswagen.fictitiousScenarioInputs.co2GKm === 130, "La muestra Volkswagen debe usar 130 g/km.");
  assert(volkswagen.historicalRatesForResidualTax.historicalEpigraph === 1, "Volkswagen debe resolver epígrafe histórico 1.");
  assert(volkswagen.historicalRatesForResidualTax.historicalIedmtRate === 0, "Volkswagen debe usar IEDMT histórico 0 %.");
  assert(volkswagen.currentLiquidation.epigraph === 2, "Volkswagen debe resolver epígrafe actual 2.");
  assert(volkswagen.currentLiquidation.currentIedmtRate === 0.0475, "Volkswagen debe liquidar al tipo actual 4,75 %.");
}

async function readSamples(): Promise<VerificationSample[]> {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(SAMPLES_PATH, "utf8")) as VerificationSample[];
}

function verifySampleAgainstCatalogRow(
  sample: VerificationSample,
  row: CatalogOfficialVehicleValue,
): void {
  assert(row.id === sample.normalizedRowId, `ID divergente en muestra ${sample.sampleNumber}.`);
  assert(row.sourceDocumentId === sample.sourceDocumentId, `Documento divergente en muestra ${sample.sampleNumber}.`);
  assert(row.officialRowReference === sample.officialRowReference, `Referencia divergente en muestra ${sample.sampleNumber}.`);
  assert(row.sourceXmlLine === sample.sourceXmlLine, `Línea XML divergente en muestra ${sample.sampleNumber}.`);
  assert(row.brand === sample.brand, `Marca divergente en muestra ${sample.sampleNumber}.`);
  assert(row.officialModelType === sample.officialModelType, `Modelo-tipo divergente en muestra ${sample.sampleNumber}.`);
  assert(row.fuelType === sample.fuelType, `Combustible divergente en muestra ${sample.sampleNumber}.`);
  assert(row.newVehicleOfficialValue === sample.newVehicleOfficialValue, `Valor oficial divergente en muestra ${sample.sampleNumber}.`);
  assert(row.commercialStartYear === sample.commercialPeriod[0], `Inicio comercial divergente en muestra ${sample.sampleNumber}.`);
  assert(row.commercialEndYear === sample.commercialPeriod[1], `Fin comercial divergente en muestra ${sample.sampleNumber}.`);
  assert(JSON.stringify(row.rawOfficialCells) === JSON.stringify(sample.rawOfficialCells), `Celdas oficiales divergentes en muestra ${sample.sampleNumber}.`);
  assert(row.engineCapacityCc === officialNumber(sample.rawOfficialCells[3]), `Cilindrada divergente en muestra ${sample.sampleNumber}.`);
  assert(row.powerKw === officialNumber(sample.rawOfficialCells[6]), `Potencia divergente en muestra ${sample.sampleNumber}.`);
}

function officialNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value.replaceAll(".", "").replace(",", "."));
  assert(Number.isFinite(parsed), `Número oficial inválido: ${value}.`);
  return parsed;
}

function findExplanation(
  steps: readonly FiscalExplanationStep[],
  id: string,
): FiscalExplanationStep {
  const step = steps.find((candidate) => candidate.id === id);
  assert(step, `No se encontró el paso explicativo ${id}.`);
  return step;
}

function numberFromRecord(
  record: Record<string, string | number | boolean | null> | undefined,
  key: string,
): number {
  const value = record?.[key];
  assert(typeof value === "number", `El campo ${key} no es numérico.`);
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
