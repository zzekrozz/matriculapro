import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, relative } from "node:path";
import {
  assertRepoRoot,
  CATALOG_YEAR,
  EFFECTIVE_FROM,
  EFFECTIVE_TO,
  fileDescriptor,
  PDF_PATH,
  PDF_URL,
  REPO_ROOT,
  SOURCE_DIR,
  SOURCE_ID,
  SOURCE_MANIFEST_PATH,
  SOURCE_ORDER,
  type SourceManifest,
  XML_PATH,
  XML_URL,
} from "./catalog-utils.ts";

const force = process.argv.includes("--force");

async function download(url: string, destination: string): Promise<void> {
  const temporary = `${destination}.download`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/pdf, application/xml, text/xml;q=0.9, */*;q=0.1",
      "User-Agent": "MatriculaPro official BOE fiscal catalog importer/1.0",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Descarga oficial fallida (${response.status}) para ${url}`);
  }
  writeFileSync(temporary, Buffer.from(await response.arrayBuffer()));
  renameSync(temporary, destination);
}

function verifyOfficialFiles(): void {
  const pdf = readFileSync(PDF_PATH);
  if (pdf.length < 10_000_000 || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("El PDF descargado no parece la disposición oficial completa.");
  }
  if (!pdf.subarray(Math.max(0, pdf.length - 4096)).toString("latin1").includes("%%EOF")) {
    throw new Error("El PDF oficial está truncado: no termina con %%EOF.");
  }

  const xml = readFileSync(XML_PATH, "utf8");
  if (
    xml.length < 20_000_000 ||
    !xml.includes(`<identificador>${SOURCE_ID}</identificador>`) ||
    !xml.includes("ANEXO I") ||
    !xml.includes("ANEXO II") ||
    !xml.trimEnd().endsWith("</documento>")
  ) {
    throw new Error("El XML no es la disposición oficial completa esperada.");
  }
}

async function main(): Promise<void> {
  assertRepoRoot();
  mkdirSync(SOURCE_DIR, { recursive: true });
  const existing = [PDF_PATH, XML_PATH].every((path) => {
    try {
      return readFileSync(path).length > 0;
    } catch {
      return false;
    }
  });

  if (force || !existing) {
    await download(PDF_URL, PDF_PATH);
    await download(XML_URL, XML_PATH);
  }
  verifyOfficialFiles();

  const previousDownloadedAt = (() => {
    try {
      const previous = JSON.parse(
        readFileSync(SOURCE_MANIFEST_PATH, "utf8"),
      ) as SourceManifest;
      return previous.downloadedAt;
    } catch {
      return new Date().toISOString();
    }
  })();

  const manifest: SourceManifest = {
    schemaVersion: 1,
    sourceDocumentId: SOURCE_ID,
    sourceOrder: SOURCE_ORDER,
    catalogYear: CATALOG_YEAR,
    effectiveFrom: EFFECTIVE_FROM,
    effectiveTo: EFFECTIVE_TO,
    officialUrls: { pdf: PDF_URL, xml: XML_URL },
    downloadedAt: force ? new Date().toISOString() : previousDownloadedAt,
    files: {
      pdf: {
        relativePath: relative(REPO_ROOT, PDF_PATH).replaceAll("\\", "/"),
        ...fileDescriptor(PDF_PATH),
      },
      xml: {
        relativePath: relative(REPO_ROOT, XML_PATH).replaceAll("\\", "/"),
        ...fileDescriptor(XML_PATH),
      },
    },
  };
  writeFileSync(SOURCE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        status: existing && !force ? "verified-existing" : "downloaded",
        source: SOURCE_ID,
        pdf: { file: basename(PDF_PATH), ...manifest.files.pdf },
        xml: { file: basename(XML_PATH), ...manifest.files.xml },
        manifest: relative(REPO_ROOT, SOURCE_MANIFEST_PATH).replaceAll("\\", "/"),
      },
      null,
      2,
    ),
  );
}

await main();

