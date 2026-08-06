import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';

const port = 3197;
const origin = `http://127.0.0.1:${port}`;
const nextBin = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

type Check = {
  path: string;
  status: number;
  contains?: string;
  location?: string;
};

const checks: Check[] = [
  { path: '/', status: 200, contains: 'Comprobar un vehículo gratis' },
  { path: '/', status: 200, contains: 'Contratación online disponible inicialmente' },
  { path: '/registro', status: 200, contains: 'Crea tu cuenta gratuita' },
  { path: '/entrar', status: 200, contains: 'Entrar en MatriculaPro' },
  { path: '/legal/privacidad', status: 200, contains: 'Privacidad' },
  { path: '/robots.txt', status: 200, contains: 'Disallow: /app/' },
  { path: '/sitemap.xml', status: 200, contains: '/calcular-modelo-576' },
  { path: '/app/comprobar', status: 307, location: '/entrar?next=%2Fapp%2Fcomprobar' },
  { path: '/api/free-check', status: 401, contains: 'Debes iniciar sesión' },
  { path: '/api/fiscal/model-576', status: 401, contains: 'Debes iniciar sesión' },
  { path: '/api/admin/payment-incidents', status: 401 },
];

async function main() {
  const server = spawn(process.execPath, [nextBin, 'dev', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MATRICULAPRO_DEPLOY_TARGET: 'development',
      NEXT_PUBLIC_SITE_URL: origin,
      APP_BASE_URL: origin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOutput = '';
  server.stdout?.on('data', (chunk) => { serverOutput += chunk.toString(); });
  server.stderr?.on('data', (chunk) => { serverOutput += chunk.toString(); });

  try {
    await waitForServer(server);
    for (const check of checks) await runCheck(check);
    console.log(`E2E_SMOKE_STATUS=VALID (${checks.length} comprobaciones HTTP)`);
  } finally {
    await stopServer(server);
  }

  async function waitForServer(child: ChildProcess) {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`Next terminó antes de estar disponible.\n${serverOutput.slice(-4_000)}`);
      }
      try {
        const response = await fetch(origin, { redirect: 'manual' });
        if (response.status > 0) return;
      } catch {
        // The server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    throw new Error(`Next no respondió en 60 segundos.\n${serverOutput.slice(-4_000)}`);
  }
}

async function runCheck(check: Check) {
  const response = await fetch(`${origin}${check.path}`, { redirect: 'manual' });
  if (response.status !== check.status) {
    throw new Error(`${check.path}: esperado HTTP ${check.status}, recibido ${response.status}`);
  }
  if (check.contains) {
    const body = await response.text();
    if (!body.includes(check.contains)) {
      throw new Error(`${check.path}: falta el texto esperado: ${check.contains}`);
    }
  }
  if (check.location) {
    const location = response.headers.get('location');
    if (!location) throw new Error(`${check.path}: falta Location`);
    const normalized = new URL(location, origin);
    if (`${normalized.pathname}${normalized.search}` !== check.location) {
      throw new Error(`${check.path}: redirect inesperado: ${normalized.pathname}${normalized.search}`);
    }
  }
  console.log(`E2E ${check.path}: HTTP ${response.status} OK`);
}

async function stopServer(server: ChildProcess) {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    once(server, 'exit'),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
}

void main().catch((error: unknown) => {
  console.error(`E2E_SMOKE_STATUS=FAILED — ${error instanceof Error ? error.message : 'error inesperado'}`);
  process.exitCode = 1;
});
