/**
 * Server-only catalog reader.
 *
 * This module imports Node filesystem APIs and is used exclusively by a Route
 * Handler. Keep it outside every client dependency graph: the complete fiscal
 * catalog must never be serialized into the browser bundle.
 */
import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  FiscalCatalogSearchResponse,
  FiscalCatalogVehicle,
} from '@/lib/fiscal/catalog-api';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type UnknownRecord = Record<string, unknown>;

const CATALOG_CANDIDATES = [
  'official-vehicle-values-2026.jsonl',
  'official-vehicle-values-2026.json',
  'vehicle-values-2026.json',
  'catalog-2026.json',
];

let cachedCatalog: Promise<LoadedCatalog | null> | null = null;

interface LoadedCatalog {
  rows: SearchableCatalogRow[];
  byId: Map<string, SearchableCatalogRow>;
  catalogVersion: string;
  sourceChecksum: string | null;
}

interface SearchableCatalogRow {
  id: string;
  searchText: string;
  rawLine?: string;
  vehicle?: FiscalCatalogVehicle;
}

export async function searchFiscalCatalog(input: {
  query: string;
  page: number;
  pageSize: number;
}): Promise<FiscalCatalogSearchResponse> {
  const query = input.query.trim();
  const page = Math.max(1, Math.trunc(input.page));
  const pageSize = Math.min(25, Math.max(5, Math.trunc(input.pageSize)));

  if (query.length < 2) {
    return {
      status: 'invalid-query',
      query,
      page,
      pageSize,
      total: 0,
      totalPages: 0,
      catalogVersion: null,
      sourceChecksum: null,
      results: [],
      message: 'Escribe al menos dos caracteres de marca, modelo o versión.',
    };
  }

  const databaseResult = await searchSupabaseCatalog({ query, page, pageSize });
  if (databaseResult) return databaseResult;

  if (isProductionDeployment()) {
    return {
      status: 'catalog-unavailable',
      query,
      page,
      pageSize,
      total: 0,
      totalPages: 0,
      catalogVersion: null,
      sourceChecksum: null,
      results: [],
      message: 'El catálogo fiscal de PostgreSQL/RPC no está disponible. Producción no utiliza el fallback local.',
    };
  }

  const catalog = await loadCatalog();
  if (!catalog) {
    return {
      status: 'catalog-unavailable',
      query,
      page,
      pageSize,
      total: 0,
      totalPages: 0,
      catalogVersion: null,
      sourceChecksum: null,
      results: [],
      message: 'El catálogo oficial no está disponible en el servidor. No se utilizará una lista parcial ni un valor aproximado.',
    };
  }

  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matches = catalog.rows
    .filter((row) => terms.every((term) => row.searchText.includes(term)));

  const total = matches.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    status: 'ready',
    query,
    page: safePage,
    pageSize,
    total,
    totalPages,
    catalogVersion: catalog.catalogVersion,
    sourceChecksum: catalog.sourceChecksum,
    results: matches.slice(offset, offset + pageSize).map(materializeCatalogRow),
  };
}

export async function getFiscalCatalogVehicleById(id: string): Promise<{
  vehicle: FiscalCatalogVehicle;
  catalogVersion: string;
  sourceChecksum: string | null;
} | null> {
  const databaseVehicle = await getSupabaseCatalogVehicleById(id);
  if (databaseVehicle) return databaseVehicle;
  if (isProductionDeployment()) return null;
  const catalog = await loadCatalog();
  if (!catalog) return null;
  const indexed = catalog.byId.get(id);
  const vehicle = indexed ? materializeCatalogRow(indexed) : null;
  return vehicle ? {
    vehicle,
    catalogVersion: catalog.catalogVersion,
    sourceChecksum: catalog.sourceChecksum,
  } : null;
}

async function searchSupabaseCatalog(input: {
  query: string;
  page: number;
  pageSize: number;
}): Promise<FiscalCatalogSearchResponse | null> {
  if (!hasSupabaseServerCredentials()) return null;
  try {
    const supabase = createSupabaseAdminClient();
    const offset = (input.page - 1) * input.pageSize;
    if (offset > 10_000) return null;
    const { data, error } = await supabase.rpc('search_fiscal_vehicle_values', {
      p_query: input.query,
      p_brand: null,
      p_model: null,
      p_limit: input.pageSize,
      p_offset: offset,
    });
    if (error) return null;
    const rows = ((data ?? []) as unknown[])
      .map((value) => normalizeCatalogRow(asRecord(value)))
      .filter((value): value is FiscalCatalogVehicle => value !== null);
    const firstRecord = asRecord((data as unknown[] | null)?.[0]);
    const total = numberValue(firstRecord?.total_count) ?? 0;
    return {
      status: 'ready',
      query: input.query,
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize),
      catalogVersion: stringValue(firstRecord?.catalog_version_id) ?? 'Catálogo fiscal activo',
      sourceChecksum: rows[0]?.sourceChecksum ?? null,
      results: rows,
    };
  } catch {
    return null;
  }
}

async function getSupabaseCatalogVehicleById(id: string): Promise<{
  vehicle: FiscalCatalogVehicle;
  catalogVersion: string;
  sourceChecksum: string | null;
} | null> {
  if (!hasSupabaseServerCredentials()) return null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('get_fiscal_vehicle_value', { p_id: id });
    if (error) return null;
    const rawRow = (data as unknown[] | null)?.[0];
    const row = normalizeCatalogRow(asRecord(rawRow));
    if (!row) return null;
    const record = asRecord(rawRow);
    return {
      vehicle: row,
      catalogVersion: stringValue(record?.catalog_version_id) ?? 'Catálogo fiscal activo',
      sourceChecksum: row.sourceChecksum || null,
    };
  } catch {
    return null;
  }
}

function hasSupabaseServerCredentials(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production'
    || process.env.MATRICULAPRO_DEPLOY_TARGET === 'production';
}

async function loadCatalog(): Promise<LoadedCatalog | null> {
  if (!cachedCatalog) cachedCatalog = readCatalogFromDisk();
  return cachedCatalog;
}

async function readCatalogFromDisk(): Promise<LoadedCatalog | null> {
  const generatedDirectories = [
    join(process.cwd(), 'data', 'fiscal', 'generated'),
    join(process.cwd(), 'src', 'data', 'fiscal', 'generated'),
  ];
  for (const generatedDirectory of generatedDirectories) {
    for (const fileName of CATALOG_CANDIDATES) {
      try {
        const raw = await readFile(join(generatedDirectory, fileName), 'utf8');
        const manifest = await readManifest(generatedDirectory);
        if (fileName.endsWith('.jsonl')) {
          return buildJsonlCatalogIndex(raw, manifest);
        }
        const parsed = fileName.endsWith('.jsonl')
          ? raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as unknown)
          : JSON.parse(raw) as unknown;
        const envelope = asRecord(parsed);
        const candidates = Array.isArray(parsed)
          ? parsed
          : firstArray(envelope, ['rows', 'vehicles', 'values', 'data']);
        if (!candidates) continue;

        const vehicles = candidates
          .map((candidate) => normalizeCatalogRow(asRecord(candidate)))
          .filter((row): row is FiscalCatalogVehicle => row !== null);
        if (vehicles.length !== candidates.length || vehicles.length === 0) {
          throw new Error('El recurso contiene filas incompletas; se rechaza para evitar una carga parcial.');
        }
        if (new Set(vehicles.map((vehicle) => vehicle.id)).size !== vehicles.length) {
          throw new Error('El recurso contiene identificadores duplicados; se rechaza para evitar selecciones ambiguas.');
        }
        if (vehicles.some((vehicle) => !vehicle.sourceChecksum)) {
          throw new Error('El recurso contiene filas sin hash de fuente; se rechaza la carga.');
        }

        const rows = vehicles.map((vehicle) => ({
          id: vehicle.id,
          vehicle,
          searchText: vehicle.normalizedSearchText,
        }));

        return {
          rows,
          catalogVersion: stringValue(envelope?.catalogVersion)
            ?? stringValue(envelope?.version)
            ?? stringValue(manifest?.catalogVersion)
            ?? stringValue(manifest?.catalogVersionId)
            ?? stringValue(manifest?.version)
            ?? 'HAC/1501/2025 · ejercicio 2026',
          sourceChecksum: stringValue(envelope?.sourceChecksum)
            ?? stringValue(envelope?.sourceSha256)
            ?? stringValue(manifest?.sourceChecksum)
            ?? stringValue(manifest?.sourceSha256)
            ?? stringValue(manifest?.sourceXmlSha256)
            ?? vehicles[0]?.sourceChecksum
            ?? null,
          byId: new Map(rows.map((row) => [row.id, row])),
        };
      } catch (error) {
        if (isMissingFileError(error)) continue;
        throw new Error(`No se pudo validar el recurso fiscal ${fileName}.`, { cause: error });
      }
    }
  }
  return null;
}

async function readManifest(generatedDirectory: string): Promise<UnknownRecord | null> {
  try {
    return asRecord(JSON.parse(await readFile(join(generatedDirectory, 'catalog-manifest-2026.json'), 'utf8')) as unknown);
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

function buildJsonlCatalogIndex(raw: string, manifest: UnknownRecord | null): LoadedCatalog {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const counts = asRecord(manifest?.counts);
  const expectedRows = numberValue(counts?.identifiedModelRows);
  if (expectedRows !== null && lines.length !== expectedRows) {
    throw new Error(`El catálogo contiene ${lines.length} filas y el manifiesto declara ${expectedRows}.`);
  }

  const expectedSourceChecksum = stringValue(manifest?.sourceXmlSha256);
  const rows: SearchableCatalogRow[] = [];
  const byId = new Map<string, SearchableCatalogRow>();
  for (const rawLine of lines) {
    const id = extractJsonString(rawLine, 'id');
    const searchText = extractJsonString(rawLine, 'normalizedSearchText');
    const sourceChecksum = extractJsonString(rawLine, 'sourceChecksum');
    if (
      !id
      || !searchText
      || !sourceChecksum
      || !rawLine.includes('"brand":')
      || !rawLine.includes('"model":')
      || !rawLine.includes('"newVehicleOfficialValue":')
    ) {
      throw new Error('El recurso contiene una fila sin columnas esenciales; se rechaza la carga completa.');
    }
    if (expectedSourceChecksum && sourceChecksum !== expectedSourceChecksum) {
      throw new Error('Una fila no coincide con el hash de la fuente oficial declarado en el manifiesto.');
    }
    if (byId.has(id)) throw new Error(`Identificador fiscal duplicado: ${id}.`);
    const indexed = { id, searchText, rawLine };
    rows.push(indexed);
    byId.set(id, indexed);
  }

  return {
    rows,
    byId,
    catalogVersion: stringValue(manifest?.catalogVersionId)
      ?? 'HAC/1501/2025 · ejercicio 2026',
    sourceChecksum: expectedSourceChecksum,
  };
}

function materializeCatalogRow(indexed: SearchableCatalogRow): FiscalCatalogVehicle {
  if (indexed.vehicle) return indexed.vehicle;
  if (!indexed.rawLine) throw new Error(`La fila ${indexed.id} no contiene datos materializables.`);
  const vehicle = normalizeCatalogRow(asRecord(JSON.parse(indexed.rawLine) as unknown));
  if (!vehicle) throw new Error(`La fila ${indexed.id} no supera la validación de columnas esenciales.`);
  return vehicle;
}

function extractJsonString(rawLine: string, key: string): string | null {
  const marker = `"${key}":"`;
  const start = rawLine.indexOf(marker);
  if (start < 0) return null;
  let end = start + marker.length;
  while (end < rawLine.length) {
    if (rawLine[end] === '"' && rawLine[end - 1] !== '\\') return rawLine.slice(start + marker.length, end);
    end += 1;
  }
  return null;
}

function normalizeCatalogRow(row: UnknownRecord | null): FiscalCatalogVehicle | null {
  if (!row) return null;
  const id = stringValue(row.id);
  const brand = stringValue(row.brand) ?? stringValue(row.make);
  const model = stringValue(row.model);
  const officialValue = numberValue(row.newVehicleOfficialValue)
    ?? numberValue(row.new_vehicle_official_value)
    ?? numberValue(row.officialValue)
    ?? numberValue(row.price);
  if (!id || !brand || !model || officialValue === null || officialValue <= 0) return null;

  return {
    id,
    catalogYear: numberValue(row.catalogYear) ?? 2026,
    sourceOrder: stringValue(row.sourceOrder) ?? 'Orden HAC/1501/2025, de 17 de diciembre',
    sourceAnnex: stringValue(row.sourceAnnex) ?? 'Anexo I',
    brand,
    model,
    version: stringValue(row.version),
    commercialStartYear: numberValue(row.commercialStartYear) ?? numberValue(row.commercial_start_year),
    commercialEndYear: numberValue(row.commercialEndYear) ?? numberValue(row.commercial_end_year),
    fuelType: stringValue(row.fuelType) ?? stringValue(row.fuel_type) ?? stringValue(row.fuel),
    engineCapacityCc: numberValue(row.engineCapacityCc) ?? numberValue(row.engine_capacity_cc) ?? numberValue(row.engineCc),
    cylinders: numberValue(row.cylinders),
    powerKw: numberValue(row.powerKw) ?? numberValue(row.power_kw),
    fiscalPower: numberValue(row.fiscalPower) ?? numberValue(row.fiscal_power),
    co2Gkm: numberValue(row.co2Gkm) ?? numberValue(row.co2GKm) ?? numberValue(row.co2_g_km),
    newVehicleOfficialValue: officialValue,
    officialRowReference: stringValue(row.officialRowReference) ?? stringValue(row.official_row_reference) ?? stringValue(row.rowReference) ?? id,
    normalizedSearchText: stringValue(row.normalizedSearchText) ?? normalizeSearchText([
      brand,
      model,
      stringValue(row.version),
      stringValue(row.fuelType) ?? stringValue(row.fuel),
      numberValue(row.commercialStartYear) ?? numberValue(row.commercial_start_year),
      numberValue(row.commercialEndYear) ?? numberValue(row.commercial_end_year),
      numberValue(row.engineCapacityCc) ?? numberValue(row.engine_capacity_cc) ?? numberValue(row.engineCc),
      numberValue(row.powerKw) ?? numberValue(row.power_kw),
    ].filter((value) => value !== null).join(' ')),
    sourceChecksum: stringValue(row.sourceChecksum) ?? stringValue(row.source_checksum) ?? '',
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function firstArray(record: UnknownRecord | null, keys: string[]): unknown[] | null {
  if (!record) return null;
  for (const key of keys) if (Array.isArray(record[key])) return record[key] as unknown[];
  return null;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : null;
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}
