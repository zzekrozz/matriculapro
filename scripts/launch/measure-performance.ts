import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';

const port = 3199;
const origin = `http://127.0.0.1:${port}`;
const routes = ['/', '/registro', '/calcular-modelo-576', '/app/comprobar'];

async function main() {
  const buildId = join(process.cwd(), '.next', 'BUILD_ID');
  if (!existsSync(buildId)) throw new Error('Ejecuta npm run build antes de medir.');

  const nextBin = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  const startedAt = performance.now();
  const server = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MATRICULAPRO_DEPLOY_TARGET: 'development',
      NEXT_PUBLIC_SITE_URL: origin,
      APP_BASE_URL: origin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout?.on('data', (chunk) => { output += chunk.toString(); });
  server.stderr?.on('data', (chunk) => { output += chunk.toString(); });

  try {
    await waitForReady(server);
    const coldReadyMs = round(performance.now() - startedAt);
    const routeMeasurements: Record<string, unknown> = {};
    for (const route of routes) {
      const measurements = [];
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const requestStartedAt = performance.now();
        const response = await fetch(`${origin}${route}`, { redirect: 'manual' });
        const body = await response.arrayBuffer();
        measurements.push({
          status: response.status,
          elapsedMs: round(performance.now() - requestStartedAt),
          bytes: body.byteLength,
        });
      }
      routeMeasurements[route] = measurements;
    }

    const chunks = collectFiles(join(process.cwd(), '.next', 'static', 'chunks'))
      .filter((path) => path.endsWith('.js'));
    const rawBundleBytes = chunks.reduce((sum, path) => sum + statSync(path).size, 0);
    const gzipBundleBytes = chunks.reduce(
      (sum, path) => sum + gzipSync(readFileSync(path)).byteLength,
      0,
    );
    const seedPath = join(process.cwd(), 'supabase', 'seed', 'fiscal_catalog_2026.sql');

    console.log(JSON.stringify({
      status: 'measured',
      coldReadyMs,
      routeMeasurements,
      staticJavaScript: {
        files: chunks.length,
        rawBytes: rawBundleBytes,
        gzipBytes: gzipBundleBytes,
      },
      fiscalSeedBytes: existsSync(seedPath) ? statSync(seedPath).size : null,
      limitations: [
        'Las rutas autenticadas solo miden el gate 307 sin credenciales de staging.',
        'Dashboard, comprobador e informe Profesional deben medirse con cuentas sintéticas en staging.',
        'El buscador fiscal se mide por separado en npm run fiscal:validate.',
      ],
    }, null, 2));
  } finally {
    await stopServer(server);
  }

  async function waitForReady(child: ChildProcess) {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Next terminó antes de responder.\n${output.slice(-4_000)}`);
      try {
        const response = await fetch(origin, { redirect: 'manual' });
        if (response.status > 0) return;
      } catch {
        // Starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`Next no respondió en 60 segundos.\n${output.slice(-4_000)}`);
  }
}

function collectFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

async function stopServer(server: ChildProcess) {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([once(server, 'exit'), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill('SIGKILL');
}

function round(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

void main().catch((error: unknown) => {
  console.error(`PERFORMANCE_STATUS=FAILED — ${error instanceof Error ? error.message : 'error inesperado'}`);
  process.exitCode = 1;
});
