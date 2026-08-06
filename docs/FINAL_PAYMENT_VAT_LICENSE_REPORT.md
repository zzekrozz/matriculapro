# Informe final: pagos, IVA y licencias

Fecha de cierre local: 6 de agosto de 2026. Alcance limitado a IVA español en Stripe, reembolso de ampliación y renovación civil en Europe/Madrid.

## 1. Resumen ejecutivo

La implementación fiscal vigente usa Stripe Tax automático con Prices inclusivos, factura pagada y validación previa a la activación. La restauración transaccional de ampliaciones y la regla civil de 30 días en `Europe/Madrid` permanecen sin cambios.

## 2. Archivos modificados

Configuración: `.env.example`, `package.json`, `package-lock.json`. Dominio/UI/backend: tipos y pruebas de acceso, `renewal.ts`, `payment-events.ts`, `PlanSelector.tsx`, checkout, webhook, repositorio y retry administrativo. Operación: auditoría, cinco documentos requeridos y suite pgTAP previa.

## 3. Archivos nuevos

La integración vigente usa `stripe-tax.ts`, `stripe-checkout-receipt.ts`, `stripe-doctor.ts`, el contrato E2E de Stripe Tax, la migración 012 y la guía `STRIPE_ES_VAT_SETUP.md`. Los validadores de Tax Rate manual se retiraron.

## 4. Migraciones

La migración fiscal inicial 010 permanece histórica e inalterada. La migración aditiva vigente es `202608060012_stripe_automatic_tax.sql`: añade estado automático, conserva registros históricos y sustituye la superficie operativa manual por un RPC de Stripe Tax.

## 5. Configuración de IVA Stripe

Checkout usa `automatic_tax.enabled=true`, no envía `line_items[].tax_rates`, recoge dirección de facturación, reutiliza Customer y crea Invoice en modo `payment`.

## 6. Stripe Tax verificado

El doctor exige `sk_test_`, Stripe Tax activo, dos Products con códigos SaaS oficiales y seis Prices one-time EUR inclusivos por los importes exactos. La comprobación remota permanece `PENDING` mientras falten claves u objetos Stripe Test.

## 7. Desglose de los seis precios

| Plan | Base | IVA | Total |
| --- | ---: | ---: | ---: |
| Particular 1 mes | 65,29 € | 13,71 € | 79,00 € |
| Particular 6 meses | 147,93 € | 31,07 € | 179,00 € |
| Particular 12 meses | 230,58 € | 48,42 € | 279,00 € |
| Profesional 1 mes | 106,61 € | 22,39 € | 129,00 € |
| Profesional 6 meses | 247,11 € | 51,89 € | 299,00 € |
| Profesional 12 meses | 371,07 € | 77,93 € | 449,00 € |

## 8. Factura de prueba

El código crea Invoice y exige ID, número, estado `paid`, ES, EUR, cálculo automático completo, impuesto inclusivo y desglose idéntico. No se descargó una factura remota: falta Stripe Test configurado. La revisión manual de IvanImports/datos legales sigue bloqueada hasta recibir datos reales revisados.

## 9. Validaciones del webhook

Session `paid`, modo payment, Price, cantidad, PaymentIntent, Customer, compra pending, ES, EUR, total, `automatic_tax.status=complete`, Price inclusive, base, IVA mayor que cero, total e Invoice completa. Recupera Session, líneas e Invoice directamente desde Stripe; metadata no es autoridad.

## 10. Restricción a España

Checkout solo acepta `countryCode=ES`. País final ausente o distinto no activa, crea `country_mismatch` y la cuenta muestra “Hemos recibido el pago… No vuelvas a pagar”. No se implementó fiscalidad internacional.

## 11. Incidencias fiscales

Se añadieron `tax_mismatch` e `invoice_mismatch`. Guardan razón y valores recibidos para comparar tasa, redondeo e Invoice. El evento queda ignorado para activación, pero el movimiento de dinero no desaparece y entra en revisión.

## 12. Regla de reembolso de ampliación

Un parcial conserva la ampliación. Solo el acumulado total de la compra de ampliación marca su licencia como reembolsada y evalúa la licencia original. No se reinicia ni prolonga ninguna fecha.

## 13. Restauración de licencia original

`upgrade_relationships` conserva compras, licencias, crédito e intervalo original. Si la compra original no está totalmente devuelta y `original_expires_at > now()`, se reactiva la misma fila hasta ese vencimiento. Si expiró o fue reembolsada, se registra el motivo y no se restaura.

## 14. Casos de reembolso probados

Parcial, dos acumulados hasta total, original vigente, original vencida, original devuelta tras upgrade, duplicado, exceso y moneda; Particular 79→179 y cotizaciones 79→279, Profesional 129→299/449. La suite pgTAP transaccional está preparada pero no fue ejecutable localmente.

## 15. Regla de treinta días naturales

La apertura es inclusiva exactamente 30 fechas civiles antes de la hora local de vencimiento; un milisegundo anterior queda fuera y la ventana termina al vencer. Después se usa renovación post-vencimiento. Una licencia `scheduled` no abre otra ventana.

## 16. Biblioteca de fechas utilizada

Luxon 3.7.2 y tipos 3.7.3. La constante canónica es `LICENSE_BUSINESS_TIME_ZONE = "Europe/Madrid"`. Cliente y servidor importan las mismas funciones.

## 17. Casos DST probados

Marzo produce 719 horas físicas y octubre 721, manteniendo la misma hora comercial. También se probaron enero/marzo/octubre, bisiesto, 29 de febrero, medianoche, 23:59:59, borde ±1 ms, vencida y programada.

## 18. RLS

El autenticado solo consulta compras/licencias/relaciones propias. No puede insertar ni editar fiscalidad, restaurar licencias, alterar relaciones o resolver incidencias. Los RPC finales son backend-only y los anteriores se revocaron de `service_role` como superficie pública de aplicación.

## 19. pgTAP

Hay 286 aserciones pgTAP declaradas en el conjunto actual; 52 pertenecen al cierre fiscal y 45 al orden de reversión. Cubren estado automático, grants, IVA/Invoice, retry, refund/restauración, vencimiento, incidencias y DST. Estado local SQL: no ejecutadas por `supabase=NOT_FOUND`, `docker=NOT_FOUND`, `psql=NOT_FOUND`.

## 20. E2E

`npm run test:e2e` pasó: 11 comprobaciones HTTP y fixtures integrados de IVA 79/299, invoice, ES y DST marzo/octubre. El E2E de staging quedó bloqueado correctamente por falta de `STAGING_BASE_URL`; no se declara pago remoto probado.

## 21. Resultado exacto de cada comando

| Comando | Resultado |
| --- | --- |
| `npm install` | Exit 0; `up to date`, 0 cambios pendientes de instalación. |
| `npm run env:validate` | Exit 0; `DEVELOPMENT_WITH_WARNINGS`, variables reales ausentes. |
| `npm run legal:validate` | Exit 0 desarrollo; `INCOMPLETE`, faltan datos/revisión legal. |
| `npm run auth:doctor` | Exit 0; estático OK, login remoto PENDING. |
| `npm run stripe:doctor` | Exit 0; 6 planes estáticos OK, remoto PENDING. |
| `npm run typecheck` | Exit 0. |
| `npm run lint` | Exit 0, cero warnings. |
| `npm test` | Exit 0; 142 pruebas Node + middleware válido. |
| `npm run fiscal:validate` | Exit 0; 70.931 filas, 70.886 vehículos, 45 bandas, 0 rechazadas. |
| `npm run fiscal:test` | Exit 0; 51 pruebas + 10 muestras exactas. |
| `npm run build` | Exit 0; compiló y generó 63 páginas estáticas. |
| `npm audit --audit-level=high` | Primer intento sandbox sin red; reintento autorizado Exit 0, `found 0 vulnerabilities`. |
| `npm run test:e2e` | Exit 0; 11 HTTP + reglas finales válidas. |
| `npm run test:access` / `test:stripe` | Exit 0; 54/54. |
| `git diff --check` | Exit 0; solo avisos informativos LF→CRLF. |

## 22. Resultado Stripe Test

`stripe=NOT_FOUND`; faltan `sk_test_`, `whsec_` y Prices reales. No ejecutado y no declarado aprobado. Los checks estáticos y de dominio pasan; la guía contiene el comando CLI exacto.

## 23. Resultado Supabase

`supabase=NOT_FOUND`, `docker=NOT_FOUND`, `psql=NOT_FOUND`; `supabase:verify` informa PENDING por variables ausentes. No se aplicó la migración ni se ejecutó pgTAP contra PostgreSQL.

## 24. Variables nuevas

`STRIPE_TAX_RATE_ES_IVA_21` fue eliminada y no existe variable manual equivalente.

## 25. Pasos manuales pendientes

Activar/revisar Stripe Tax Test, crear dos Products con tax codes SaaS y seis Prices inclusivos, completar datos comerciales reales, ejecutar doctor remoto, aplicar 001–012 en Supabase staging, correr pgTAP, crear webhook Test, comprar con dirección española, descargar factura, probar país incorrecto y reembolsos, y ejecutar E2E staging con cuenta sintética.

## 26. Riesgos restantes

No se ha demostrado la representación visual de una Invoice real ni la sintaxis/ejecución de la migración en PostgreSQL. Datos legales incompletos bloquean producción. Las carreras están protegidas y modeladas, pero deben someterse a concurrencia real en staging.

## 27. Hash y tamaño del ZIP final

Se calculan después de cerrar el archivo; por definición no pueden incrustarse dentro del propio ZIP sin cambiar su hash. Se entregan junto al enlace descargable y en un archivo `.sha256` externo.

## 28. Ausencia de commit, push y despliegue

Confirmado: no se ejecutó commit, push, pull request ni despliegue. Rama `main`; HEAD permanece en `e6b22bd90e23f1cb1b907d12c11a92e2b577989e`.
