# Informe final: reembolsos y disputas anteriores al pago

## 1. Resumen ejecutivo

El webhook conserva cada reversión verificada antes de responder 200 y la activación consulta/aplica esas filas bajo lock antes de crear una licencia. Refund total y disputa `open/lost` ya no pueden producir acceso; refund parcial conserva la política vigente; `won` puede activar una sola vez con evidencia fiscal previa.

## 2. Causa del fallo

Refund/dispute podía llegar cuando la compra aún no tenía PaymentIntent ni importe pagado. El RPC lo rechazaba, el evento acababa ignorado con HTTP 200 y el checkout posterior no tenía una reversión durable que consultar.

## 3. Archivos modificados

Webhook, repositorio de pagos, recuperación de Checkout, retry administrativo, estado de cuenta, dominio/exports/fixtures, `package.json`, auditoría, cuatro documentos operativos y las suites pgTAP anteriores que comprobaban grants ya sustituidos.

## 4. Archivos nuevos

- `src/domain/access/payment-ordering.ts` y su test.
- `scripts/e2e/payment-ordering.ts`.
- `scripts/payments/reconcile.ts`.
- `supabase/tests/payment_reversal_ordering.sql`.
- Este informe.

## 5. Migración creada

`supabase/migrations/202608060011_payment_reversal_ordering.sql`. Es aditiva y consecutiva; 001–010 permanecen sin cambios.

## 6. Modelo de reversión pendiente

`pending_payment_reversals` guarda Event ID único, hash, tipo, PaymentIntent, Charge, Session, Invoice, Customer auxiliar, compra/usuario, refund acumulado o estado de disputa, estado de procesamiento, base de match y fechas. Tiene RLS, grants solo de backend e índices fuertes.

## 7. Flujo de reembolso anterior al pago

Se recupera la Charge desde Stripe, se persiste la reversión y solo entonces se responde 200. Si la compra aún es pending o desconocida, no se crea/revoca licencia. El checkout posterior aplica el acumulado antes de decidir acceso.

## 8. Flujo de disputa anterior al pago

Se conserva Charge, PaymentIntent, Customer y estado real. `open/lost` bloquea; `warning` mantiene política; `won` posterior reutiliza únicamente la validación fiscal ya persistida y no duplica licencia.

## 9. Flujo de activación posterior

El RPC 011 bloquea usuario/compra, revalida Session, PaymentIntent, Charge, Customer, Price, importe, moneda, país, IVA e invoice; bloquea reversiones, ordena por fecha/ID, resuelve el estado final y solo después invoca la activación existente cuando procede.

## 10. Reglas de licencia

Refund total: cero licencia y Gratis. Refund parcial: una licencia según política actual, estado parcial e incidencia. Disputa `open/lost`: cero licencia. `won`: una licencia si no hay otro bloqueo. Dos triggers diferidos rechazan licencia `active/scheduled` incompatible al commit.

## 11. Idempotencia

Event ID único, colisión de identidad rechazada, filas bloqueadas, refund acumulativo monotónico y licencias ligadas a una compra. Los reintentos no duplican reversión, incidencia ni acceso.

## 12. Concurrencia

Advisory locks por usuario/compra y `FOR UPDATE` sobre compra/reversiones serializan pago, refund y disputa. Las restricciones existentes de Session/PaymentIntent/licencia se mantienen y se añaden guardas de compatibilidad.

## 13. Incidencias

Se añaden `payment_reversal_ambiguous`, `payment_fully_refunded_before_activation` y `payment_dispute_before_activation`. El refund total anterior queda resuelto automáticamente; parcial y disputa conservan seguimiento administrativo.

## 14. Script de reconciliación

`npm run payments:reconcile -- --dry-run` consulta pendientes, incompatibilidades, aplicadas e incidencias; con `sk_test_` contrasta hasta 25 PaymentIntents. No muta y bloquea producción sin `--allow-production`; `--apply` se rechaza.

## 15. RLS

Cliente sin SELECT/INSERT/UPDATE/DELETE sobre reversiones y sin EXECUTE sobre RPC críticos. `service_role` conserva únicamente las operaciones necesarias; los entry points 010/009 inseguros para este flujo quedan revocados al backend.

## 16. pgTAP

Suite nueva de 45 aserciones para tabla/índices/grants/RLS, persistencia/duplicado/colisión, refund total/parcial, disputa open→won, activación única, incidencia y guardas. Total preparado: 285. No ejecutado por ausencia de Supabase CLI, Docker y `psql`.

## 17. E2E

11 comprobaciones HTTP, reglas fiscales finales y 5 fixtures de orden. Refund, disputa y checkout usan cuerpos con firma de prueba generada/verificada por el SDK oficial; la verificación productiva `constructEvent` permanece intacta.

## 18. Resultado exacto de comandos

| Comando | Resultado |
| --- | --- |
| `npm install` | Exit 0; dependencias al día. |
| `npm run env:validate` | Exit 0; desarrollo con advertencias por variables ausentes. |
| `npm run legal:validate` | Exit 0; incompleto con 8 datos/revisión pendientes. |
| `npm run auth:doctor` | Exit 0; estático OK, live pendiente. |
| `npm run stripe:doctor` | Exit 0; catálogo estático OK, remoto pendiente. |
| `npm run typecheck` | Exit 0. |
| `npm run lint` | Exit 0, cero warnings. |
| `npm test` | Exit 0; 164 pruebas Node y middleware válido. |
| `npm run test:stripe` | Exit 0; 76/76. |
| `npm run test:payment-ordering` | Exit 0; 22/22. |
| `npm run payments:reconcile -- --dry-run` | Exit 0; `PENDING`, cero mutaciones, faltan credenciales staging. |
| `npm run fiscal:validate` | Exit 0; 70.931 filas, 0 rechazadas, hashes válidos. |
| `npm run fiscal:test` | Exit 0; 51/51 y 10 muestras exactas. |
| `npm run test:e2e` | Exit 0; 11 HTTP + reglas + 5/5 ordering. |
| `npm run build` | Exit 0; 63 páginas, compilación correcta. |
| `npm audit --audit-level=high` | Exit 0; 0 vulnerabilidades. |
| `git diff --check` | Exit 0; solo avisos informativos LF/CRLF. |

Los validadores staging/producción fallaron de forma esperada y segura: entorno staging con 22 errores de configuración, legal production bloqueado y E2E staging sin `STAGING_BASE_URL`.

## 19. Pruebas no ejecutadas

`supabase start`, `supabase db reset`, `supabase test db`, `stripe listen` y pagos remotos: herramientas/credenciales no disponibles. No se declaran aprobadas.

## 20. Pasos para staging

Configurar las 22 exigencias, aplicar 001–011 en Supabase staging, ejecutar las 285 aserciones, Stripe Test doctor/listen y entregar refund/disputa antes de checkout; verificar estados, una sola licencia, alertas y dry-run con datos reales sintéticos.

## 21. Riesgos restantes

La migración 011 tiene revisión estática y contratos compilados, pero necesita ejecución real PostgreSQL. Firma y objetos Stripe se probaron con fixtures locales; falta la entrega remota y carreras serverless reales en staging.

## 22. Hash y tamaño del ZIP

Se consignan después de crear el artefacto, en el mensaje de entrega exterior; incluir el hash del propio ZIP dentro del ZIP cambiaría el hash.

## 23. Ausencia de commit, push y despliegue

Confirmado: rama `main`, HEAD `e6b22bd90e23f1cb1b907d12c11a92e2b577989e`. No hubo commit, push, pull request, despliegue, producción ni Stripe Live.
