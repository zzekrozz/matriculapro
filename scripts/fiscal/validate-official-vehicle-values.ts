import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertRepoRoot,
  CATALOG_GZIP_PATH,
  CATALOG_PATH,
  CATALOG_VERSION_ID,
  decodeXml,
  type DuplicateGroup,
  DUPLICATES_PATH,
  GENERIC_BANDS_GZIP_PATH,
  GENERIC_BANDS_PATH,
  MANIFEST_PATH,
  normalizeForSearch,
  type OfficialGenericValueBand,
  type OfficialVehicleValue,
  percentile,
  readJsonLines,
  REJECTS_PATH,
  REPORT_PATH,
  SAMPLES_PATH,
  sha256,
  sha256File,
  SOURCE_MANIFEST_PATH,
  type SourceManifest,
  XML_PATH,
} from "./catalog-utils.ts";

const VALIDATION_REPORT_PATH = resolve(
  process.cwd(),
  "data/fiscal/generated/validation-report-2026.json",
);

function fail(errors: string[], condition: boolean, message: string): void {
  if (!condition) errors.push(message);
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  assertRepoRoot();
  const errors: string[] = [];
  const warnings: string[] = [];
  const source = JSON.parse(
    readFileSync(SOURCE_MANIFEST_PATH, "utf8"),
  ) as SourceManifest;
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    catalogVersionId: string;
    sourceXmlSha256: string;
    normalizedSha256: string;
    counts: Record<string, number>;
  };
  const importReport = JSON.parse(readFileSync(REPORT_PATH, "utf8")) as {
    verificationSamples: Array<Record<string, unknown>>;
  };
  const rows = await readJsonLines<OfficialVehicleValue>(CATALOG_PATH);
  const genericBands = await readJsonLines<OfficialGenericValueBand>(GENERIC_BANDS_PATH);
  const duplicates = JSON.parse(
    readFileSync(DUPLICATES_PATH, "utf8"),
  ) as DuplicateGroup[];
  const samples = JSON.parse(readFileSync(SAMPLES_PATH, "utf8")) as Array<{
    normalizedRowId: string;
    rawOfficialCells: string[];
    sourceXmlLine: number;
  }>;
  const rejects = readFileSync(REJECTS_PATH, "utf8").trim();

  fail(errors, source.sourceDocumentId === "BOE-A-2025-26357", "source-id-mismatch");
  fail(errors, sha256File(XML_PATH) === source.files.xml.sha256, "source-xml-hash-mismatch");
  fail(errors, manifest.sourceXmlSha256 === source.files.xml.sha256, "manifest-source-hash-mismatch");
  fail(errors, manifest.catalogVersionId === CATALOG_VERSION_ID, "catalog-version-mismatch");
  fail(errors, rejects === "", "rejected-rows-file-is-not-empty");
  fail(errors, rows.length >= 70_000, "implausibly-low-identified-row-count");
  fail(errors, genericBands.length === 45, "generic-band-count-must-be-45");
  fail(
    errors,
    rows.length + genericBands.length === manifest.counts.importedRows,
    "imported-row-count-mismatch",
  );

  const ids = new Set<string>();
  const references = new Set<string>();
  const naturalGroups = new Map<string, number>();
  const brands = new Set<string>();
  const models = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) errors.push(`duplicate-id:${row.id}`);
    ids.add(row.id);
    if (references.has(row.officialRowReference)) {
      errors.push(`duplicate-reference:${row.officialRowReference}`);
    }
    references.add(row.officialRowReference);
    naturalGroups.set(
      row.naturalRowHash,
      (naturalGroups.get(row.naturalRowHash) ?? 0) + 1,
    );
    brands.add(row.brand);
    models.add(`${row.brand}\u0000${row.model}`);
    fail(errors, row.catalogVersionId === CATALOG_VERSION_ID, `wrong-version:${row.id}`);
    fail(errors, Boolean(row.brand.trim()), `empty-brand:${row.id}`);
    fail(errors, Boolean(row.model.trim()), `empty-model:${row.id}`);
    fail(errors, row.version === null, `invented-version:${row.id}`);
    fail(
      errors,
      Number.isFinite(row.newVehicleOfficialValue) && row.newVehicleOfficialValue > 0,
      `non-positive-value:${row.id}`,
    );
    fail(errors, /^[a-f0-9]{64}$/u.test(row.sourceChecksum), `bad-source-hash:${row.id}`);
    fail(errors, row.rawOfficialCells.length === 10, `bad-official-cell-count:${row.id}`);
    fail(
      errors,
      row.normalizedSearchText === normalizeForSearch(row.normalizedSearchText),
      `non-normalized-search:${row.id}`,
    );
    if (
      row.commercialStartYear !== null &&
      row.commercialEndYear !== null &&
      row.commercialStartYear > row.commercialEndYear
    ) {
      errors.push(`incoherent-period:${row.id}`);
    }
  }

  for (const band of genericBands) {
    if (ids.has(band.id)) errors.push(`duplicate-id:${band.id}`);
    ids.add(band.id);
    if (references.has(band.officialRowReference)) {
      errors.push(`duplicate-reference:${band.officialRowReference}`);
    }
    references.add(band.officialRowReference);
    fail(errors, band.rawOfficialCells.length === 2, `bad-band-cell-count:${band.id}`);
    fail(
      errors,
      Number.isFinite(band.newVehicleOfficialValue) && band.newVehicleOfficialValue > 0,
      `non-positive-band-value:${band.id}`,
    );
  }

  const computedDuplicateGroups = [...naturalGroups.values()].filter(
    (count) => count > 1,
  ).length;
  fail(errors, duplicates.length === computedDuplicateGroups, "duplicate-report-mismatch");
  fail(errors, samples.length === 10, "verification-sample-count-must-be-10");
  fail(
    errors,
    importReport.verificationSamples.length === 10,
    "import-report-sample-count-must-be-10",
  );
  const officialXmlLines = readFileSync(XML_PATH, "utf8").split(/\r?\n/gu);
  for (const sample of samples) {
    const row = rows.find((candidate) => candidate.id === sample.normalizedRowId);
    fail(errors, Boolean(row), `sample-not-found:${sample.normalizedRowId}`);
    if (row) {
      fail(
        errors,
        JSON.stringify(row.rawOfficialCells) === JSON.stringify(sample.rawOfficialCells),
        `sample-cell-mismatch:${sample.normalizedRowId}`,
      );
    }
    const sourceRowFragment: string[] = [];
    for (
      let lineIndex = sample.sourceXmlLine - 1;
      lineIndex < officialXmlLines.length && sourceRowFragment.length < 30;
      lineIndex += 1
    ) {
      sourceRowFragment.push(officialXmlLines[lineIndex]);
      if (officialXmlLines[lineIndex].includes("</tr>")) break;
    }
    const officialCells = [
      ...sourceRowFragment.join("\n").matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gu),
    ].map((cell) => decodeXml(cell[1]));
    fail(
      errors,
      JSON.stringify(officialCells) === JSON.stringify(sample.rawOfficialCells),
      `sample-does-not-match-official-xml:${sample.normalizedRowId}`,
    );
  }

  const computedNormalizedHash = sha256(
    `${readFileSync(CATALOG_PATH, "utf8")}${readFileSync(GENERIC_BANDS_PATH, "utf8")}`,
  );
  fail(
    errors,
    computedNormalizedHash === manifest.normalizedSha256,
    "normalized-catalog-hash-mismatch",
  );
  fail(errors, brands.size === manifest.counts.brands, "brand-count-mismatch");
  fail(errors, models.size === manifest.counts.models, "model-count-mismatch");

  const benchmarkQueries = [
    "audi a3",
    "bmw 320 d",
    "mercedes clase c",
    "volkswagen golf",
    "toyota hybrid",
    "renault e tech",
    "porsche 911",
    "peugeot 3008",
    "tesla model 3",
    "abarth 500 elc",
  ];
  const searchMeasurements: Array<{
    query: string;
    elapsedMs: number;
    resultCount: number;
  }> = [];
  for (const query of benchmarkQueries) {
    const normalized = normalizeForSearch(query);
    const tokens = normalized.split(" ").filter(Boolean);
    const searchStartedAt = performance.now();
    const resultCount = rows.reduce(
      (count, row) =>
        count + (tokens.every((token) => row.normalizedSearchText.includes(token)) ? 1 : 0),
      0,
    );
    searchMeasurements.push({
      query,
      elapsedMs: Number((performance.now() - searchStartedAt).toFixed(3)),
      resultCount,
    });
  }
  const searchTimes = searchMeasurements.map((measurement) => measurement.elapsedMs);
  const averageSearchMs = Number(
    (searchTimes.reduce((sum, value) => sum + value, 0) / searchTimes.length).toFixed(3),
  );
  if (averageSearchMs >= 500) warnings.push("local-in-memory-search-average-exceeds-500ms");

  const elapsedMs = Number((performance.now() - startedAt).toFixed(3));
  const validationReport = {
    status: errors.length === 0 ? "valid" : "invalid",
    catalogVersionId: CATALOG_VERSION_ID,
    counts: {
      importedRows: rows.length + genericBands.length,
      identifiedModelRows: rows.length,
      genericValueBandRows: genericBands.length,
      rejectedRows: rejects ? rejects.split(/\r?\n/gu).length : 0,
      duplicateGroups: duplicates.length,
      duplicateRows: duplicates.reduce((sum, group) => sum + group.ids.length, 0),
      brands: brands.size,
      models: models.size,
      uniqueIds: ids.size,
      uniqueOfficialReferences: references.size,
      verificationSamples: samples.length,
    },
    hashes: {
      sourceXmlSha256: source.files.xml.sha256,
      normalizedSha256: computedNormalizedHash,
    },
    bytes: {
      catalogJsonl: statSync(CATALOG_PATH).size,
      catalogGzip: statSync(CATALOG_GZIP_PATH).size,
      genericBandsJsonl: statSync(GENERIC_BANDS_PATH).size,
      genericBandsGzip: statSync(GENERIC_BANDS_GZIP_PATH).size,
    },
    localInMemorySearchBenchmark: {
      note: "Mide el filtro del recurso ya cargado; producción usa índices/RPC de PostgreSQL. No incluye red ni cold start.",
      measurements: searchMeasurements,
      averageMs: averageSearchMs,
      p95Ms: percentile(searchTimes, 0.95),
      maxMs: Math.max(...searchTimes),
    },
    validationElapsedMs: elapsedMs,
    warnings,
    errors,
  };
  writeFileSync(
    VALIDATION_REPORT_PATH,
    `${JSON.stringify(validationReport, null, 2)}\n`,
  );
  console.log(JSON.stringify(validationReport, null, 2));
  if (errors.length > 0) process.exitCode = 1;
}

await main();
