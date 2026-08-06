import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

export const SOURCE_ID = "BOE-A-2025-26357";
export const SOURCE_ORDER = "Orden HAC/1501/2025, de 17 de diciembre";
export const SOURCE_ANNEX = "Anexo I";
export const CATALOG_YEAR = 2026;
export const EFFECTIVE_FROM = "2026-01-01";
export const EFFECTIVE_TO = "2026-12-31";
export const CATALOG_VERSION_ID = "hac-1501-2025-annex-i-2026";
export const PDF_URL =
  "https://www.boe.es/boe/dias/2025/12/23/pdfs/BOE-A-2025-26357.pdf";
export const XML_URL =
  "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2025-26357";

export const REPO_ROOT = process.cwd();
export const SOURCE_DIR = resolve(
  REPO_ROOT,
  "data/fiscal/sources/BOE-A-2025-26357",
);
export const GENERATED_DIR = resolve(REPO_ROOT, "data/fiscal/generated");
export const PDF_PATH = resolve(SOURCE_DIR, `${SOURCE_ID}.pdf`);
export const XML_PATH = resolve(SOURCE_DIR, `${SOURCE_ID}.xml`);
export const SOURCE_MANIFEST_PATH = resolve(SOURCE_DIR, "source-manifest.json");
export const CATALOG_PATH = resolve(
  GENERATED_DIR,
  "official-vehicle-values-2026.jsonl",
);
export const CATALOG_GZIP_PATH = `${CATALOG_PATH}.gz`;
export const GENERIC_BANDS_PATH = resolve(
  GENERATED_DIR,
  "official-generic-value-bands-2026.jsonl",
);
export const GENERIC_BANDS_GZIP_PATH = `${GENERIC_BANDS_PATH}.gz`;
export const MANIFEST_PATH = resolve(
  GENERATED_DIR,
  "catalog-manifest-2026.json",
);
export const REPORT_PATH = resolve(
  GENERATED_DIR,
  "import-report-2026.json",
);
export const SAMPLES_PATH = resolve(
  GENERATED_DIR,
  "verification-samples-2026.json",
);
export const REJECTS_PATH = resolve(
  GENERATED_DIR,
  "rejected-rows-2026.jsonl",
);
export const DUPLICATES_PATH = resolve(
  GENERATED_DIR,
  "duplicate-rows-2026.json",
);
export const SEED_SQL_PATH = resolve(
  REPO_ROOT,
  "supabase/seed/fiscal_catalog_2026.sql",
);

export type NullableNumber = number | null;

export type OfficialVehicleValue = {
  id: string;
  catalogVersionId: string;
  catalogYear: number;
  sourceOrder: string;
  sourceAnnex: string;
  sourceDocumentId: string;
  brand: string;
  /** Literal official "Modelo-Tipo" cell. It is not heuristically split. */
  model: string;
  /** Null because the BOE publishes one combined "Modelo-Tipo" column. */
  version: null;
  officialModelType: string;
  commercialStartYear: number | null;
  commercialEndYear: number | null;
  fuelType: string | null;
  engineCapacityCc: number | null;
  cylinders: number | null;
  powerKw: number | null;
  fiscalPower: number | null;
  powerCv: number | null;
  /** Not present in Annex I. It remains null and is never inferred. */
  co2Gkm: null;
  newVehicleOfficialValue: number;
  officialRowReference: string;
  sourceXmlLine: number;
  normalizedSearchText: string;
  sourceChecksum: string;
  naturalRowHash: string;
  rawOfficialCells: readonly string[];
};

export type OfficialGenericValueBand = {
  id: string;
  catalogVersionId: string;
  catalogYear: number;
  sourceOrder: string;
  sourceAnnex: string;
  sourceDocumentId: string;
  categoryCode:
    | "electric-mopeds-motorcycles"
    | "combustion-mopeds-motorcycles"
    | "quads"
    | "buggies";
  categoryTitle: string;
  criterionName: "power-kw" | "engine-capacity-cc";
  criterionLabel: string;
  newVehicleOfficialValue: number;
  officialRowReference: string;
  sourceXmlLine: number;
  sourceChecksum: string;
  naturalRowHash: string;
  rawOfficialCells: readonly [string, string];
};

export type RejectedRow = {
  brand: string | null;
  sourceXmlLine: number;
  cells: string[];
  reasons: string[];
};

export type DuplicateGroup = {
  naturalRowHash: string;
  ids: string[];
  officialRowReferences: string[];
};

export type SourceManifest = {
  schemaVersion: 1;
  sourceDocumentId: string;
  sourceOrder: string;
  catalogYear: number;
  effectiveFrom: string;
  effectiveTo: string;
  officialUrls: { pdf: string; xml: string };
  downloadedAt: string;
  files: {
    pdf: { relativePath: string; bytes: number; sha256: string };
    xml: { relativePath: string; bytes: number; sha256: string };
  };
};

export function assertRepoRoot(): void {
  if (!existsSync(resolve(REPO_ROOT, "package.json"))) {
    throw new Error(
      "Ejecuta el script desde la raíz del repositorio MatriculaPro.",
    );
  }
}

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256File(path: string): string {
  const content = readFileSync(path);
  return sha256(content);
}

export function fileDescriptor(path: string): { bytes: number; sha256: string } {
  return { bytes: statSync(path).size, sha256: sha256File(path) };
}

export function stableVehicleId(
  sourceChecksum: string,
  naturalRowHash: string,
  sourceXmlLine: number,
): string {
  return `boe-2026-${sha256(
    `${sourceChecksum}:${naturalRowHash}:${sourceXmlLine}`,
  ).slice(0, 32)}`;
}

export function decodeXml(value: string): string {
  return value
    .replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<[^>]+>/gu, "")
    .replace(/&#x([0-9a-f]+);/giu, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#([0-9]+);/gu, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&nbsp;/giu, "\u00a0")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&apos;/giu, "'")
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .normalize("NFC");
}

export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-ES")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function parseOfficialInteger(value: string): number | null {
  const clean = value.trim();
  if (!clean || clean === "-" || clean === "—") return null;
  if (!/^\d{1,3}(?:\.\d{3})*$|^\d+$/u.test(clean)) return Number.NaN;
  return Number.parseInt(clean.replace(/\./gu, ""), 10);
}

export function parseOfficialDecimal(value: string): number | null {
  const clean = value.trim();
  if (!clean || clean === "-" || clean === "—") return null;
  if (!/^\d+(?:[.,]\d+)?$/u.test(clean)) return Number.NaN;
  return Number.parseFloat(clean.replace(",", "."));
}

export function parseOfficialPrice(value: string): number | null {
  const parsed = parseOfficialInteger(value);
  return parsed;
}

export function parseOfficialYear(value: string): number | null {
  const clean = value.trim();
  if (!clean || clean === "-" || clean === "—") return null;
  if (!/^\d{4}$/u.test(clean)) return Number.NaN;
  return Number.parseInt(clean, 10);
}

export function buildLineStarts(text: string): Uint32Array {
  let newlineCount = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) newlineCount += 1;
  }
  const starts = new Uint32Array(newlineCount + 1);
  let cursor = 1;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) {
      starts[cursor] = index + 1;
      cursor += 1;
    }
  }
  return starts;
}

export function lineNumberAt(starts: Uint32Array, offset: number): number {
  let lower = 0;
  let upper = starts.length;
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (starts[middle] <= offset) lower = middle + 1;
    else upper = middle;
  }
  return lower;
}

export async function readJsonLines<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  const input = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim()) rows.push(JSON.parse(line) as T);
  }
  return rows;
}

export function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * quantile))];
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${stringValue.replace(/"/gu, '""')}"`;
}
