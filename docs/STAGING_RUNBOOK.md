# Runbook reproducible de staging

Este procedimiento no usa producción, claves live ni correos de clientes.

## 1. Preparación

Configura el proyecto Supabase de staging ya previsto, URLs/redirects, SMTP y todas las variables de `.env.example`. Instala Node LTS, Docker, Supabase CLI, `psql` y opcionalmente Stripe CLI.

```bash
npm install
supabase start
supabase db reset
supabase test db
```

La secuencia debe aplicar `001`–`012`. La migración `012_stripe_automatic_tax.sql` es aditiva: conserva evidencia histórica, retira del backend los RPC de tasa manual y habilita el único RPC operativo de Stripe Tax automático. No edites migraciones anteriores.

## 2. Stripe Test

Sigue `docs/STRIPE_ES_VAT_SETUP.md`:

1. Revisa Stripe Tax activo, sede y registro español en Test mode.
2. Crea exactamente dos Products: Particular `txcd_10103000` y Profesional `txcd_10103001`.
3. Crea seis Prices one-time EUR inclusivos por 79/179/279 y 129/299/449 €.
4. No configures `STRIPE_TAX_RATE_ES_IVA_21` ni una variable sustituta.
5. Configura el webhook Test y sus ocho eventos, factura, datos reales del emisor y `whsec_…`.

## 3. Validación local

```bash
npm run env:validate -- --staging
npm run stripe:doctor
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=high
git diff --check
```

Sin `sk_test_…` y los seis objetos Price, `stripe:doctor` puede aprobar solo el catálogo estático y debe indicar remoto `PENDING`. No lo registres como prueba Stripe aprobada.

## 4. Validación remota

1. Aplica las migraciones mediante `supabase db push --dry-run` y después `supabase db push` solo en staging.
2. Ejecuta `supabase test db`, incluida la cobertura de Stripe Tax y las regresiones de reembolso/disputa.
3. Compra los seis planes con cuentas sintéticas y dirección ES.
4. Comprueba Session/Invoice, `automatic_tax.status=complete`, EUR, Price/Customer, Invoice `paid`, `inclusive`, impuesto mayor que cero y suma exacta.
5. Prueba país distinto de ES, cálculo incompleto, impuesto cero, invoice ausente y cada discrepancia fiscal: no licencia, incidencia y mensaje de no repetir el pago.
6. Reenvía Events duplicados y entrega refunds/disputas antes y después de Checkout.
7. Ejecuta `npm run payments:reconcile -- --dry-run` y conserva Event IDs y evidencias.

## 5. Promoción futura

No promociones por equivalencia. Repite todo con objetos separados, revisión legal y fiscal, backup probado, dominio/SMTP/alertas verificados y autorización explícita. Este repositorio no ejecuta despliegues.
