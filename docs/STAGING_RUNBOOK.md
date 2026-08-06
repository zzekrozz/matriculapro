# Runbook reproducible de staging

Este procedimiento no usa producción, claves live ni correos de clientes.

## 1. Supabase y variables

1. Crear un proyecto separado de staging en la región elegida; activar email/contraseña, confirmación y PKCE.
2. Configurar Site URL y redirect allowlist exacta para `https://<staging>/auth/callback`.
3. Copiar URL, anon/publishable y `service_role` al gestor de secretos. Completar `.env.example`, incluido `PAYMENT_INCIDENT_ADMIN_SECRET` y un canal de alerta.
4. Instalar Docker, Supabase CLI, Node LTS, `psql` y opcionalmente Stripe CLI.

## 2. Base local y migraciones

```bash
npm install
supabase start
supabase db reset
supabase test db
supabase status
```

La secuencia debe aplicar `001`–`010`; `010_final_vat_refund_renewal.sql` es aditiva y no modifica migraciones aplicadas. Después importar el catálogo:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/fiscal_catalog_2026.sql
npm run supabase:verify
npm run fiscal:verify-database
```

Esperado: 70.886 vehículos, 45 bandas, 70.931 filas fiscales y todos los pgTAP, incluidos `staging_payment_lifecycle.sql` (44 aserciones) y `final_vat_refund_renewal.sql` (51 aserciones).

## 3. Staging remoto

```bash
supabase login
supabase link --project-ref <STAGING_REF>
supabase migration list
supabase db push --dry-run
supabase db push
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/fiscal_catalog_2026.sql
```

No enlazar el proyecto live. Guardar salida, fecha, operador, backup y plan de rollback. Verificar Auth y SMTP con `docs/RESEND_SUPABASE_SMTP_SETUP.md`; enviar solo a buzones sintéticos controlados.

## 4. Stripe test

Crear seis Products/Prices, una Tax Rate manual española inclusiva del 21 % y dos Coupons opcionales según `docs/STRIPE_ES_VAT_SETUP.md`. Configurar `STRIPE_TAX_RATE_ES_IVA_21`, los ocho eventos del webhook, dirección de facturación, invoices test y `whsec_…`. Ejecutar `npm run stripe:doctor`, compra nueva, reutilización de Customer, ampliación, renovación anticipada, renovación vencida, reembolso parcial/total y disputa.

## 5. Validación de aplicación

```bash
npm run env:validate -- --staging
npm run legal:validate
npm run auth:doctor
npm run stripe:doctor
npm run typecheck
npm run lint
npm test
npm run fiscal:validate
npm run fiscal:test
npm run build
npm audit --audit-level=high
npm run test:e2e
npm run test:payment-ordering
npm run payments:reconcile -- --dry-run
git diff --check
```

Para E2E autenticado/Stripe configura únicamente cuentas sintéticas y ejecuta el checklist de `docs/STRIPE_TESTING.md`. Confirmar registro, confirmación, login, refresh durante redirect, recuperación y logout; Particular y Profesional activos/vencidos; histórico de lectura; renovación; refund; incidente y retry.

Después de aplicar 011, ejecutar `supabase test db` y confirmar las 45 aserciones de `payment_reversal_ordering.sql`. En Stripe Test entregar manualmente refund total, refund parcial y disputa antes del evento Checkout. Guardar el Event ID, el estado de `pending_payment_reversals`, la compra y el recuento de licencias. Un error temporal al persistir debe producir retry/500, nunca aceptación silenciosa.

## 6. RLS y operación

Comprobar con dos usuarios que no se ven compras, Customers, casos ni históricos ajenos. El cliente no puede mutar importes/licencias/incidencias. Verificar logs estructurados, alerta elegida y endpoint administrativo. Confirmar que país distinto de ES deja compra sin licencia y con incidencia.

## 7. Promoción futura a producción

No promover por equivalencia. Repetir todo con proyecto separado, revisión legal terminada, backup probado, dominio/SMTP verificados, alertas operadas y aprobación explícita. Rotar todos los secretos de staging. Este repositorio no ejecuta despliegue.
