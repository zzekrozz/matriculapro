import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const serverAccess = read('src/server/access/current-access.ts');
const betaCases = read('src/app/api/public-beta/cases/route.ts');
const caseRepository = read('src/lib/registration/case-repository.ts');
const checkout = read('src/app/api/payments/checkout/route.ts');

assert.match(serverAccess, /isPublicBetaEnabled\(\)/, 'El acceso servidor debe consultar el interruptor central.');
assert.match(serverAccess, /createPublicBetaAccessContext\(authData\.user\.id\)/, 'La beta debe seguir exigiendo una sesión autenticada.');

assert.match(betaCases, /if \(!isPublicBetaEnabled\(\)\)/, 'La ruta privilegiada debe quedar cerrada fuera de beta.');
assert.match(betaCases, /getCurrentServerAccess\(\)/, 'La persistencia beta debe autenticar al usuario en el servidor.');
assert.match(betaCases, /user_id: access\.userId/g, 'El servidor debe imponer el propietario en cada escritura.');
assert.match(betaCases, /\.eq\('user_id', access\.userId\)/g, 'Las lecturas y actualizaciones deben quedar aisladas por usuario.');
assert.match(betaCases, /rateLimitedResponse/, 'La beta debe conservar limitación antiabuso.');

assert.match(caseRepository, /if \(publicBeta\)/, 'El repositorio debe seleccionar explícitamente la persistencia beta.');
assert.match(caseRepository, /\/api\/public-beta\/cases/, 'El navegador no debe intentar saltarse RLS directamente durante la beta.');

assert.match(checkout, /isPublicBetaEnabled\(\)/, 'El checkout debe impedir cobros accidentales durante la beta.');
assert.doesNotMatch(checkout, /process\.env\.PUBLIC_BETA_MODE/, 'Las rutas no deben leer el entorno fuera de la fuente central.');

console.log('PUBLIC_BETA_CONTRACT=VALID');
