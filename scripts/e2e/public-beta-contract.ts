import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const serverAccess = read('src/server/access/current-access.ts');
const authProvider = read('src/providers/AuthProvider.tsx');
const middleware = read('src/middleware.ts');
const caseRepository = read('src/lib/registration/case-repository.ts');
const professionalRepository = read('src/lib/professional/local-workspace.ts');
const freeCheck = read('src/app/api/free-check/route.ts');
const checkout = read('src/app/api/payments/checkout/route.ts');

assert.match(serverAccess, /isPublicBetaEnabled\(\)/, 'El acceso servidor debe consultar el interruptor central.');
assert.match(serverAccess, /createPublicBetaAccessContext\(PUBLIC_BETA_LOCAL_USER_ID\)/, 'Las APIs abiertas deben usar la identidad técnica local sin consultar Auth.');
assert.doesNotMatch(authProvider, /signInAnonymously/, 'La beta no debe iniciar ninguna sesión anónima.');
assert.match(authProvider, /if \(disabled\)/, 'AuthProvider debe poder quedar completamente inactivo durante la beta.');
assert.match(middleware, /matches\(pathname, '\/api\/fiscal'\)/, 'Las APIs fiscales sin datos privados deben abrirse durante la beta.');
assert.match(middleware, /matches\(pathname, '\/api\/professional'\)/, 'La persistencia profesional de cuenta debe quedar cerrada durante la beta local.');
assert.match(middleware, /public_beta_local_only/, 'Los endpoints privados deben fallar cerrados aunque exista una cookie antigua.');
assert.match(middleware, /BETA_HIDDEN_AUTH_PATHS/, 'Las pantallas de acceso y recuperación deben quedar invisibles durante la beta.');
assert.match(freeCheck, /userId === PUBLIC_BETA_LOCAL_USER_ID/, 'La comprobación abierta no debe persistir como si perteneciera a una cuenta.');

assert.match(caseRepository, /if \(publicBeta\)/, 'El repositorio debe seleccionar explícitamente la persistencia beta.');
assert.match(caseRepository, /window\.localStorage/, 'Los expedientes beta deben permanecer en el navegador.');
assert.doesNotMatch(caseRepository, /\/api\/public-beta\/cases/, 'La beta sin login no debe enviar expedientes al backend.');
assert.match(professionalRepository, /window\.localStorage/, 'El espacio profesional beta debe permanecer en el navegador.');

assert.match(checkout, /isPublicBetaEnabled\(\)/, 'El checkout debe impedir cobros accidentales durante la beta.');
assert.doesNotMatch(checkout, /process\.env\.PUBLIC_BETA_MODE/, 'Las rutas no deben leer el entorno fuera de la fuente central.');

console.log('PUBLIC_BETA_CONTRACT=VALID');
