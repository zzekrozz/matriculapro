import { gzipSync } from "node:zlib";
import {
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative } from "node:path";
import {
  assertRepoRoot,
  buildLineStarts,
  CATALOG_GZIP_PATH,
  CATALOG_PATH,
  CATALOG_VERSION_ID,
  CATALOG_YEAR,
  decodeXml,
  DUPLICATES_PATH,
  EFFECTIVE_FROM,
  EFFECTIVE_TO,
  GENERIC_BANDS_GZIP_PATH,
  GENERIC_BANDS_PATH,
  GENERATED_DIR,
  lineNumberAt,
  MANIFEST_PATH,
  normalizeForSearch,
  type OfficialVehicleValue,
  type OfficialGenericValueBand,
  parseOfficialDecimal,
  parseOfficialInteger,
  parseOfficialPrice,
  parseOfficialYear,
  REJECTS_PATH,
  REPO_ROOT,
  REPORT_PATH,
  SAMPLES_PATH,
  sha256,
  sha256File,
  SOURCE_ANNEX,
  SOURCE_ID,
  SOURCE_MANIFEST_PATH,
  SOURCE_ORDER,
  stableVehicleId,
  type DuplicateGroup,
  type RejectedRow,
  type SourceManifest,
  XML_PATH,
} from "./catalog-utils.ts";

type RawParsedRow = {
  brand: string;
  cells: string[];
  sourceXmlLine: number;
  brandRowNumber: number;
};

type GenericCategory = Pick<
  OfficialGenericValueBand,
  "categoryCode" | "criterionName"
>;

const REQUIRED_SAMPLE_BRANDS = [
  "BMW",
  "MERCEDES",
  "AUDI",
  "VOLKSWAGEN",
  "PORSCHE",
  "PEUGEOT",
  "RENAULT",
  "TOYOTA",
] as const;

function parseRow(
  raw: RawParsedRow,
  sourceChecksum: string,
): { row?: OfficialVehicleValue; rejection?: RejectedRow } {
  const reasons: string[] = [];
  if (raw.cells.length !== 10) reasons.push(`expected-10-columns-got-${raw.cells.length}`);
  if (!raw.brand) reasons.push("empty-brand");

  const [modelType = "", start = "", end = "", cc = "", cylinders = "", fuel = "", kw = "", fiscalPower = "", cv = "", price = ""] = raw.cells;
  if (!modelType) reasons.push("empty-model-type");

  const commercialStartYear = parseOfficialYear(start);
  const commercialEndYear = parseOfficialYear(end);
  const engineCapacityCc = parseOfficialInteger(cc);
  const cylinderCount = parseOfficialInteger(cylinders);
  const powerKw = parseOfficialDecimal(kw);
  const parsedFiscalPower = parseOfficialDecimal(fiscalPower);
  const powerCv = parseOfficialDecimal(cv);
  const officialValue = parseOfficialPrice(price);

  const parsedNumbers: Array<[string, number | null]> = [
    ["commercial-start-year", commercialStartYear],
    ["commercial-end-year", commercialEndYear],
    ["engine-capacity", engineCapacityCc],
    ["cylinders", cylinderCount],
    ["power-kw", powerKw],
    ["fiscal-power", parsedFiscalPower],
    ["power-cv", powerCv],
    ["official-value", officialValue],
  ];
  for (const [field, value] of parsedNumbers) {
    if (value !== null && !Number.isFinite(value)) reasons.push(`invalid-${field}`);
    if (value !== null && Number.isFinite(value) && value < 0) reasons.push(`negative-${field}`);
  }
  if (commercialStartYear !== null && Number.isFinite(commercialStartYear) && (commercialStartYear < 1900 || commercialStartYear > CATALOG_YEAR)) {
    reasons.push("commercial-start-year-out-of-range");
  }
  if (commercialEndYear !== null && Number.isFinite(commercialEndYear) && (commercialEndYear < 1900 || commercialEndYear > CATALOG_YEAR)) {
    reasons.push("commercial-end-year-out-of-range");
  }
  if (
    commercialStartYear !== null &&
    commercialEndYear !== null &&
    Number.isFinite(commercialStartYear) &&
    Number.isFinite(commercialEndYear) &&
    commercialStartYear > commercialEndYear
  ) {
    reasons.push("incoherent-commercial-period");
  }
  if (officialValue === null || !Number.isFinite(officialValue) || officialValue <= 0) {
    reasons.push("official-value-must-be-positive");
  }

  if (reasons.length > 0) {
    return {
      rejection: {
        brand: raw.brand || null,
        sourceXmlLine: raw.sourceXmlLine,
        cells: raw.cells,
        reasons: [...new Set(reasons)].sort(),
      },
    };
  }

  const literalFields = [
    raw.brand,
    modelType,
    start,
    end,
    cc,
    cylinders,
    fuel,
    kw,
    fiscalPower,
    cv,
    price,
  ];
  const naturalRowHash = sha256(JSON.stringify(literalFields));
  const officialRowReference = `${SOURCE_ID}:ANEXO-I:${normalizeForSearch(raw.brand).replaceAll(" ", "-").toUpperCase()}:${String(raw.brandRowNumber).padStart(5, "0")}:L${raw.sourceXmlLine}`;
  const searchParts = [
    raw.brand,
    modelType,
    start,
    end,
    fuel,
    cc,
    kw,
    cv,
  ].filter(Boolean);

  return {
    row: {
      id: stableVehicleId(sourceChecksum, naturalRowHash, raw.sourceXmlLine),
      catalogVersionId: CATALOG_VERSION_ID,
      catalogYear: CATALOG_YEAR,
      sourceOrder: SOURCE_ORDER,
      sourceAnnex: SOURCE_ANNEX,
      sourceDocumentId: SOURCE_ID,
      brand: raw.brand,
      model: modelType,
      version: null,
      officialModelType: modelType,
      commercialStartYear: commercialStartYear as number | null,
      commercialEndYear: commercialEndYear as number | null,
      fuelType: fuel || null,
      engineCapacityCc: engineCapacityCc as number | null,
      cylinders: cylinderCount as number | null,
      powerKw: powerKw as number | null,
      fiscalPower: parsedFiscalPower as number | null,
      powerCv: powerCv as number | null,
      co2Gkm: null,
      newVehicleOfficialValue: officialValue as number,
      officialRowReference,
      sourceXmlLine: raw.sourceXmlLine,
      normalizedSearchText: normalizeForSearch(searchParts.join(" ")),
      sourceChecksum,
      naturalRowHash,
      rawOfficialCells: raw.cells,
    },
  };
}

function resolveGenericCategory(title: string): GenericCategory | null {
  const normalized = normalizeForSearch(title);
  if (normalized.includes("ciclomotores y motocicletas electricos")) {
    return { categoryCode: "electric-mopeds-motorcycles", criterionName: "power-kw" };
  }
  if (normalized.includes("ciclomotores y motocicletas de motor de combustion")) {
    return {
      categoryCode: "combustion-mopeds-motorcycles",
      criterionName: "engine-capacity-cc",
    };
  }
  if (normalized.includes("quads usados")) {
    return { categoryCode: "quads", criterionName: "engine-capacity-cc" };
  }
  if (normalized.includes("buggys usados")) {
    return { categoryCode: "buggies", criterionName: "engine-capacity-cc" };
  }
  return null;
}

function chooseSamples(rows: OfficialVehicleValue[]): OfficialVehicleValue[] {
  const selected: OfficialVehicleValue[] = [];
  const used = new Set<string>();
  const choose = (predicate: (row: OfficialVehicleValue) => boolean): void => {
    const row = rows.find((candidate) => !used.has(candidate.id) && predicate(candidate));
    if (!row) throw new Error("No se pudo construir una de las diez muestras obligatorias.");
    used.add(row.id);
    selected.push(row);
  };

  for (const brand of REQUIRED_SAMPLE_BRANDS) {
    choose(
      (row) =>
        row.brand === brand &&
        row.commercialStartYear !== null &&
        row.commercialStartYear >= 2008,
    );
  }
  choose(
    (row) =>
      row.commercialStartYear !== null &&
      /^(PHEV|GyE|DyE|SyE)$/iu.test(row.fuelType ?? ""),
  );
  choose(
    (row) =>
      row.commercialStartYear !== null && /^(Elc|E)$/iu.test(row.fuelType ?? ""),
  );
  return selected;
}

function main(): void {
  const startedAt = performance.now();
  assertRepoRoot();
  const sourceManifest = JSON.parse(
    readFileSync(SOURCE_MANIFEST_PATH, "utf8"),
  ) as SourceManifest;
  const xml = readFileSync(XML_PATH, "utf8");
  const sourceChecksum = sha256File(XML_PATH);
  if (sourceChecksum !== sourceManifest.files.xml.sha256) {
    throw new Error("El hash XML no coincide con el manifiesto de descarga.");
  }
  const annexStart = xml.indexOf('<p class="anexo_num">ANEXO I</p>');
  const annexEnd = xml.indexOf('<p class="anexo_num">ANEXO II</p>');
  if (annexStart < 0 || annexEnd <= annexStart) {
    throw new Error("No se encontraron los límites inequívocos del Anexo I.");
  }

  const lineStarts = buildLineStarts(xml);
  const annex = xml.slice(annexStart, annexEnd);
  const rows: OfficialVehicleValue[] = [];
  const genericBands: OfficialGenericValueBand[] = [];
  const rejects: RejectedRow[] = [];
  const brandCounts = new Map<string, number>();
  const tableBrands: string[] = [];
  let tableCount = 0;
  let rawRowCount = 0;

  for (const tableMatch of annex.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gu)) {
    tableCount += 1;
    const table = tableMatch[0];
    const brandMatch = table.match(/Marca:\s*([\s\S]*?)<\/th>/u);
    const brand = brandMatch ? decodeXml(brandMatch[1]) : "";
    const categoryTitle = (() => {
      if (brand) return "";
      const contextBeforeTable = annex.slice(0, tableMatch.index ?? 0);
      const sectionTitles = [
        ...contextBeforeTable.matchAll(
          /<p class="centro_negrita">([\s\S]*?)<\/p>/gu,
        ),
      ];
      return sectionTitles.length
        ? decodeXml(sectionTitles.at(-1)?.[1] ?? "")
        : "";
    })();
    const genericCategory = resolveGenericCategory(categoryTitle);
    if (brand) tableBrands.push(brand);
    for (const rowMatch of table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gu)) {
      const cells = [...rowMatch[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gu)].map(
        (cell) => decodeXml(cell[1]),
      );
      if (cells.length === 0) continue;
      rawRowCount += 1;
      const absoluteOffset =
        annexStart + (tableMatch.index ?? 0) + (rowMatch.index ?? 0);
      const sourceXmlLine = lineNumberAt(lineStarts, absoluteOffset);
      if (!brand && cells.length === 2 && genericCategory) {
        const officialValue = parseOfficialPrice(cells[1]);
        if (officialValue !== null && Number.isFinite(officialValue) && officialValue > 0) {
          const naturalRowHash = sha256(
            JSON.stringify([genericCategory.categoryCode, categoryTitle, ...cells]),
          );
          const genericOrdinal = genericBands.length + 1;
          genericBands.push({
            id: stableVehicleId(sourceChecksum, naturalRowHash, sourceXmlLine),
            catalogVersionId: CATALOG_VERSION_ID,
            catalogYear: CATALOG_YEAR,
            sourceOrder: SOURCE_ORDER,
            sourceAnnex: SOURCE_ANNEX,
            sourceDocumentId: SOURCE_ID,
            ...genericCategory,
            categoryTitle,
            criterionLabel: cells[0],
            newVehicleOfficialValue: officialValue,
            officialRowReference: `${SOURCE_ID}:ANEXO-I:BANDA-GENERICA:${String(genericOrdinal).padStart(3, "0")}:L${sourceXmlLine}`,
            sourceXmlLine,
            sourceChecksum,
            naturalRowHash,
            rawOfficialCells: [cells[0], cells[1]],
          });
          continue;
        }
      }
      const brandRowNumber = (brandCounts.get(brand) ?? 0) + 1;
      brandCounts.set(brand, brandRowNumber);
      const parsed = parseRow(
        { brand, cells, sourceXmlLine, brandRowNumber },
        sourceChecksum,
      );
      if (parsed.row) rows.push(parsed.row);
      if (parsed.rejection) rejects.push(parsed.rejection);
    }
  }

  const duplicateMap = new Map<string, OfficialVehicleValue[]>();
  for (const row of rows) {
    const group = duplicateMap.get(row.naturalRowHash) ?? [];
    group.push(row);
    duplicateMap.set(row.naturalRowHash, group);
  }
  const duplicateGroups: DuplicateGroup[] = [...duplicateMap.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([naturalRowHash, group]) => ({
      naturalRowHash,
      ids: group.map((row) => row.id),
      officialRowReferences: group.map((row) => row.officialRowReference),
    }));

  mkdirSync(GENERATED_DIR, { recursive: true });
  const jsonl = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const genericJsonl = `${genericBands
    .map((row) => JSON.stringify(row))
    .join("\n")}\n`;
  writeFileSync(CATALOG_PATH, jsonl);
  writeFileSync(CATALOG_GZIP_PATH, gzipSync(jsonl, { level: 9 }));
  writeFileSync(GENERIC_BANDS_PATH, genericJsonl);
  writeFileSync(
    GENERIC_BANDS_GZIP_PATH,
    gzipSync(genericJsonl, { level: 9 }),
  );
  writeFileSync(
    REJECTS_PATH,
    rejects.length ? `${rejects.map((row) => JSON.stringify(row)).join("\n")}\n` : "",
  );
  writeFileSync(DUPLICATES_PATH, `${JSON.stringify(duplicateGroups, null, 2)}\n`);

  const samples = chooseSamples(rows).map((row, sampleIndex) => ({
    sampleNumber: sampleIndex + 1,
    verificationMethod:
      "Coincidencia literal de las diez celdas de la fila con el XML oficial del BOE; referencia de línea incluida para cotejo PDF/XML.",
    sourceDocumentId: SOURCE_ID,
    officialRowReference: row.officialRowReference,
    sourceXmlLine: row.sourceXmlLine,
    sourcePdfPage: null,
    sourceLocatorNote:
      "El XML oficial no publica correspondencia de página PDF. No se infiere una página; el cotejo usa la línea XML exacta y el literal de las diez celdas.",
    brand: row.brand,
    officialModelType: row.officialModelType,
    commercialPeriod: [row.commercialStartYear, row.commercialEndYear],
    fuelType: row.fuelType,
    newVehicleOfficialValue: row.newVehicleOfficialValue,
    rawOfficialCells: row.rawOfficialCells,
    normalizedRowId: row.id,
    suggestedCalculationFixture: {
      firstRegistrationDate:
        row.brand === "VOLKSWAGEN"
          ? "2021-08-15"
          : row.commercialStartYear === 2026
          ? "2026-01-02"
          : `${row.commercialStartYear}-06-15`,
      taxableEventDate: "2026-08-05",
      mileageKm: 10_000,
      note:
        "Fechas ficticias para que el motor fiscal complete depreciación, minoración, epígrafe y cuota. CO₂ y territorio deben aportarse/acreditarse aparte; no proceden del Anexo I.",
    },
  }));
  writeFileSync(SAMPLES_PATH, `${JSON.stringify(samples, null, 2)}\n`);

  const uniqueBrands = new Set(rows.map((row) => row.brand));
  const uniqueModels = new Set(rows.map((row) => `${row.brand}\u0000${row.model}`));
  const normalizedSha256 = sha256(`${jsonl}${genericJsonl}`);
  const finishedAt = performance.now();
  const manifest = {
    schemaVersion: 1,
    catalogVersionId: CATALOG_VERSION_ID,
    catalogYear: CATALOG_YEAR,
    sourceDocumentId: SOURCE_ID,
    sourceOrder: SOURCE_ORDER,
    sourceAnnex: SOURCE_ANNEX,
    effectiveFrom: EFFECTIVE_FROM,
    effectiveTo: EFFECTIVE_TO,
    sourcePdfSha256: sourceManifest.files.pdf.sha256,
    sourceXmlSha256: sourceChecksum,
    normalizedSha256,
    counts: {
      annexTables: tableCount,
      sourceRows: rawRowCount,
      importedRows: rows.length + genericBands.length,
      identifiedModelRows: rows.length,
      genericValueBandRows: genericBands.length,
      rejectedRows: rejects.length,
      duplicateGroups: duplicateGroups.length,
      duplicateRows: duplicateGroups.reduce((sum, group) => sum + group.ids.length, 0),
      brands: uniqueBrands.size,
      models: uniqueModels.size,
    },
    bytes: {
      normalizedJsonl: statSync(CATALOG_PATH).size,
      normalizedGzip: statSync(CATALOG_GZIP_PATH).size,
      genericBandsJsonl: statSync(GENERIC_BANDS_PATH).size,
      genericBandsGzip: statSync(GENERIC_BANDS_GZIP_PATH).size,
      sourcePdf: sourceManifest.files.pdf.bytes,
      sourceXml: sourceManifest.files.xml.bytes,
    },
    extraction: {
      method: "Regex estructural acotada al XML oficial bien formado del BOE, entre los marcadores exactos ANEXO I y ANEXO II.",
      officialColumns: [
        "Modelo-Tipo",
        "Periodo comercial: Inicio",
        "Periodo comercial: Fin",
        "C.C.",
        "N.º de cilindros",
        "Tipo de motor",
        "P kW",
        "cvf",
        "cv",
        "2026 Valor euros",
      ],
      normalizedOnlyFields: [
        "id",
        "normalizedSearchText",
        "naturalRowHash",
        "officialRowReference",
      ],
      absentOfficialFields: ["CO₂ g/km", "versión separada de Modelo-Tipo"],
      modelMapping:
        "model conserva literalmente Modelo-Tipo; version es null. No se divide heurísticamente una columna que el BOE publica combinada.",
    },
    generatedFiles: {
      catalog: relative(REPO_ROOT, CATALOG_PATH).replaceAll("\\", "/"),
      compressedCatalog: relative(REPO_ROOT, CATALOG_GZIP_PATH).replaceAll("\\", "/"),
      genericValueBands: relative(REPO_ROOT, GENERIC_BANDS_PATH).replaceAll("\\", "/"),
      compressedGenericValueBands: relative(
        REPO_ROOT,
        GENERIC_BANDS_GZIP_PATH,
      ).replaceAll("\\", "/"),
      samples: relative(REPO_ROOT, SAMPLES_PATH).replaceAll("\\", "/"),
      rejects: relative(REPO_ROOT, REJECTS_PATH).replaceAll("\\", "/"),
      duplicates: relative(REPO_ROOT, DUPLICATES_PATH).replaceAll("\\", "/"),
    },
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    REPORT_PATH,
    `${JSON.stringify(
      {
        status: rejects.length === 0 ? "parsed" : "parsed-with-rejections",
        ...manifest,
        elapsedMs: Number((finishedAt - startedAt).toFixed(3)),
        verificationSamples: samples,
        rejectedReasonCounts: rejects.reduce<Record<string, number>>((counts, reject) => {
          for (const reason of reject.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
          return counts;
        }, {}),
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      {
        status: "parsed",
        elapsedMs: Number((finishedAt - startedAt).toFixed(3)),
        normalizedSha256,
        ...manifest.counts,
        ...manifest.bytes,
      },
      null,
      2,
    ),
  );
}

main();
