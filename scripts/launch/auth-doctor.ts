import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const required = [
  'src/lib/supabase/browser.ts',
  'src/lib/supabase/server.ts',
  'src/lib/supabase/admin.ts',
  'src/lib/supabase/middleware.ts',
  'src/middleware.ts',
  'src/app/auth/callback/route.ts',
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/auth/recover/route.ts',
  'src/app/api/auth/reset-password/route.ts',
  'src/app/api/auth/resend-confirmation/route.ts',
  'src/lib/auth/recovery-flow.ts',
  'src/domain/auth/validation.ts',
  'src/app/restablecer-contrasena/page.tsx',
];
const errors: string[] = [];
for (const file of required) if (!existsSync(join(root, file))) errors.push(`Falta ${file}`);

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
if (!packageJson.dependencies?.['@supabase/ssr']) errors.push('Falta @supabase/ssr.');
if (!packageJson.dependencies?.['@supabase/supabase-js']) errors.push('Falta @supabase/supabase-js.');
for (const dependency of Object.keys(packageJson.dependencies ?? {})) {
  if (/auth-helpers/i.test(dependency)) errors.push(`Helper antiguo no permitido: ${dependency}`);
}

const operationalFiles = walk(join(root, 'src')).filter((path) => !path.includes(`${join('domain', 'registration', 'fiscal')}`));
const banned = [
  { pattern: /mpro-access-level/i, label: 'cookie de acceso editable' },
  { pattern: /access[_-]?level\s*[:=].*(visitor|explorer|founder|full)/i, label: 'nivel de acceso histórico' },
];
for (const file of operationalFiles) {
  const text = readFileSync(file, 'utf8');
  for (const rule of banned) if (rule.pattern.test(text)) errors.push(`${relative(root, file)} contiene ${rule.label}.`);
}

const resetFormPath = join(root, 'src/components/auth/ResetPasswordForm.tsx');
if (existsSync(resetFormPath)) {
  const resetForm = readFileSync(resetFormPath, 'utf8');
  if (/onAuthStateChange|supabase\.auth\.updateUser/.test(resetForm)) {
    errors.push('El formulario de recuperación confía directamente en una sesión de navegador.');
  }
  if (!/recoveryAuthorized/.test(resetForm) || !/\/api\/auth\/reset-password/.test(resetForm)) {
    errors.push('El formulario de recuperación no exige el marcador server-only.');
  }
}

const registrationPath = join(root, 'src/app/api/auth/register/route.ts');
if (existsSync(registrationPath)) {
  const registration = readFileSync(registrationPath, 'utf8');
  if (!/registration_authorizations/.test(registration) || !/registration_token/.test(registration)) {
    errors.push('El registro no usa una autorización efímera consumida por el trigger.');
  }
}

if (errors.length > 0) {
  console.error('AUTH DOCTOR: FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('AUTH DOCTOR: OK (separación SSR, rutas y ausencia de entitlement editable).');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('AUTH DOCTOR LIVE: PENDING (faltan variables públicas de Supabase; no se probó un login real).');
}

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx|js|jsx)$/.test(entry) ? [path] : [];
  });
}
