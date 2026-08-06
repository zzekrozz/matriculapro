import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertRepoRoot,
  CATALOG_PATH,
  CATALOG_VERSION_ID,
  csvCell,
  EFFECTIVE_FROM,
  EFFECTIVE_TO,
  GENERIC_BANDS_PATH,
  MANIFEST_PATH,
  type OfficialGenericValueBand,
  type OfficialVehicleValue,
  readJsonLines,
  SEED_SQL_PATH,
  SOURCE_ID,
  SOURCE_ORDER,
} from "./catalog-utils.ts";

const IMPORT_REPORT_PATH = resolve(
  process.cwd(),
  "data/fiscal/generated/database-import-report-2026.json",
);

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  assertRepoRoot();
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    normalizedSha256: string;
    sourcePdfSha256: string;
    sourceXmlSha256: string;
    counts: Record<string, number>;
    bytes: Record<string, number>;
  };
  const rows = await readJsonLines<OfficialVehicleValue>(CATALOG_PATH);
  const bands = await readJsonLines<OfficialGenericValueBand>(GENERIC_BANDS_PATH);
  if (rows.length + bands.length !== manifest.counts.importedRows) {
    throw new Error("El catálogo ha cambiado desde la validación; no se genera el seed.");
  }

  const vehicleHeader = [
    "id",
    "catalog_version_id",
    "catalog_year",
    "source_document_id",
    "source_annex",
    "brand",
    "model",
    "version",
    "official_model_type",
    "commercial_start_year",
    "commercial_end_year",
    "fuel_type",
    "engine_capacity_cc",
    "cylinders",
    "power_kw",
    "fiscal_power",
    "power_cv",
    "co2_g_km",
    "new_vehicle_official_value",
    "official_row_reference",
    "source_xml_line",
    "normalized_search_text",
    "source_checksum",
    "natural_row_hash",
    "raw_official_cells",
  ];
  const bandHeader = [
    "id",
    "catalog_version_id",
    "catalog_year",
    "source_document_id",
    "source_annex",
    "category_code",
    "category_title",
    "criterion_name",
    "criterion_label",
    "new_vehicle_official_value",
    "official_row_reference",
    "source_xml_line",
    "source_checksum",
    "natural_row_hash",
    "raw_official_cells",
  ];

  const sql: string[] = [
    "-- Generated exclusively from the official BOE-A-2025-26357 XML.",
    "-- Run after migration 202608050005_fiscal_catalog.sql using psql with ON_ERROR_STOP.",
    "\\set ON_ERROR_STOP on",
    "begin;",
    "set local statement_timeout = 0;",
    "create temporary table fiscal_vehicle_values_import (like public.fiscal_vehicle_values including defaults) on commit drop;",
    `copy fiscal_vehicle_values_import (${vehicleHeader.join(", ")}) from stdin with (format csv, header true, encoding 'UTF8');`,
    csvRow(vehicleHeader),
  ];
  for (const row of rows) {
    sql.push(
      csvRow([
        row.id,
        row.catalogVersionId,
        row.catalogYear,
        row.sourceDocumentId,
        row.sourceAnnex,
        row.brand,
        row.model,
        row.version,
        row.officialModelType,
        row.commercialStartYear,
        row.commercialEndYear,
        row.fuelType,
        row.engineCapacityCc,
        row.cylinders,
        row.powerKw,
        row.fiscalPower,
        row.powerCv,
        row.co2Gkm,
        row.newVehicleOfficialValue,
        row.officialRowReference,
        row.sourceXmlLine,
        row.normalizedSearchText,
        row.sourceChecksum,
        row.naturalRowHash,
        row.rawOfficialCells,
      ]),
    );
  }
  sql.push(
    "\\.",
    "create temporary table fiscal_generic_value_bands_import (like public.fiscal_generic_vehicle_value_bands including defaults) on commit drop;",
    `copy fiscal_generic_value_bands_import (${bandHeader.join(", ")}) from stdin with (format csv, header true, encoding 'UTF8');`,
    csvRow(bandHeader),
  );
  for (const band of bands) {
    sql.push(
      csvRow([
        band.id,
        band.catalogVersionId,
        band.catalogYear,
        band.sourceDocumentId,
        band.sourceAnnex,
        band.categoryCode,
        band.categoryTitle,
        band.criterionName,
        band.criterionLabel,
        band.newVehicleOfficialValue,
        band.officialRowReference,
        band.sourceXmlLine,
        band.sourceChecksum,
        band.naturalRowHash,
        band.rawOfficialCells,
      ]),
    );
  }
  sql.push(
    "\\.",
    `do $guard$ begin if exists (select 1 from public.fiscal_catalog_versions where id = '${CATALOG_VERSION_ID}' and (source_xml_sha256 <> '${manifest.sourceXmlSha256}' or normalized_sha256 <> '${manifest.normalizedSha256}')) then raise exception 'Catalog version is immutable and exists with a different source or normalized hash; use a new version id'; end if; end $guard$;`,
    "update public.fiscal_catalog_versions set is_active = false where catalog_year = 2026 and id <> 'hac-1501-2025-annex-i-2026';",
    `insert into public.fiscal_catalog_versions (id, catalog_year, source_document_id, source_order, source_pdf_url, source_xml_url, source_pdf_sha256, source_xml_sha256, normalized_sha256, effective_from, effective_to, is_active, identified_model_rows, generic_value_band_rows, rejected_rows, duplicate_groups, brand_count, model_count, metadata) values ('${CATALOG_VERSION_ID}', 2026, '${SOURCE_ID}', '${SOURCE_ORDER.replaceAll("'", "''")}', 'https://www.boe.es/boe/dias/2025/12/23/pdfs/BOE-A-2025-26357.pdf', 'https://www.boe.es/diario_boe/xml.php?id=BOE-A-2025-26357', '${manifest.sourcePdfSha256}', '${manifest.sourceXmlSha256}', '${manifest.normalizedSha256}', '${EFFECTIVE_FROM}', '${EFFECTIVE_TO}', true, ${rows.length}, ${bands.length}, 0, ${manifest.counts.duplicateGroups}, ${manifest.counts.brands}, ${manifest.counts.models}, '{"source":"official-boe-xml","annex":"I"}'::jsonb) on conflict (id) do update set normalized_sha256 = excluded.normalized_sha256, is_active = excluded.is_active, identified_model_rows = excluded.identified_model_rows, generic_value_band_rows = excluded.generic_value_band_rows, rejected_rows = excluded.rejected_rows, duplicate_groups = excluded.duplicate_groups, brand_count = excluded.brand_count, model_count = excluded.model_count, metadata = excluded.metadata;`,
    `delete from public.fiscal_vehicle_values target where target.catalog_version_id = '${CATALOG_VERSION_ID}' and not exists (select 1 from fiscal_vehicle_values_import source where source.id = target.id);`,
    "insert into public.fiscal_vehicle_values select * from fiscal_vehicle_values_import where true on conflict (id) do update set catalog_version_id = excluded.catalog_version_id, catalog_year = excluded.catalog_year, source_document_id = excluded.source_document_id, source_annex = excluded.source_annex, brand = excluded.brand, model = excluded.model, version = excluded.version, official_model_type = excluded.official_model_type, commercial_start_year = excluded.commercial_start_year, commercial_end_year = excluded.commercial_end_year, fuel_type = excluded.fuel_type, engine_capacity_cc = excluded.engine_capacity_cc, cylinders = excluded.cylinders, power_kw = excluded.power_kw, fiscal_power = excluded.fiscal_power, power_cv = excluded.power_cv, co2_g_km = excluded.co2_g_km, new_vehicle_official_value = excluded.new_vehicle_official_value, official_row_reference = excluded.official_row_reference, source_xml_line = excluded.source_xml_line, normalized_search_text = excluded.normalized_search_text, source_checksum = excluded.source_checksum, natural_row_hash = excluded.natural_row_hash, raw_official_cells = excluded.raw_official_cells;",
    `delete from public.fiscal_generic_vehicle_value_bands target where target.catalog_version_id = '${CATALOG_VERSION_ID}' and not exists (select 1 from fiscal_generic_value_bands_import source where source.id = target.id);`,
    "insert into public.fiscal_generic_vehicle_value_bands select * from fiscal_generic_value_bands_import where true on conflict (id) do update set catalog_version_id = excluded.catalog_version_id, catalog_year = excluded.catalog_year, source_document_id = excluded.source_document_id, source_annex = excluded.source_annex, category_code = excluded.category_code, category_title = excluded.category_title, criterion_name = excluded.criterion_name, criterion_label = excluded.criterion_label, new_vehicle_official_value = excluded.new_vehicle_official_value, official_row_reference = excluded.official_row_reference, source_xml_line = excluded.source_xml_line, source_checksum = excluded.source_checksum, natural_row_hash = excluded.natural_row_hash, raw_official_cells = excluded.raw_official_cells;",
    `do $verify$ begin if (select count(*) from public.fiscal_vehicle_values where catalog_version_id = '${CATALOG_VERSION_ID}') <> ${rows.length} then raise exception 'Vehicle row count does not match validated manifest'; end if; if (select count(*) from public.fiscal_generic_vehicle_value_bands where catalog_version_id = '${CATALOG_VERSION_ID}') <> ${bands.length} then raise exception 'Generic band count does not match validated manifest'; end if; end $verify$;`,
    "commit;",
    "",
  );

  mkdirSync(dirname(SEED_SQL_PATH), { recursive: true });
  writeFileSync(SEED_SQL_PATH, sql.join("\n"));
  const elapsedMs = Number((performance.now() - startedAt).toFixed(3));
  const report = {
    status: "database-seed-generated-not-applied",
    note: "No se ha escrito en ninguna base de datos. El SQL es transaccional, idempotente y verifica conteos antes de confirmar.",
    catalogVersionId: CATALOG_VERSION_ID,
    identifiedModelRows: rows.length,
    genericValueBandRows: bands.length,
    totalRows: rows.length + bands.length,
    normalizedSha256: manifest.normalizedSha256,
    seedSqlPath: "supabase/seed/fiscal_catalog_2026.sql",
    seedSqlBytes: statSync(SEED_SQL_PATH).size,
    generationElapsedMs: elapsedMs,
  };
  writeFileSync(IMPORT_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

await main();
