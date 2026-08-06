# Operación de incidencias de pago

Una incidencia significa que Stripe confirma movimiento de dinero pero MatriculaPro no puede conceder o mantener acceso con seguridad. El usuario ve: “Hemos recibido el pago, pero la activación necesita revisión. No vuelvas a pagar.”

## Canales y secretos

Configura `PAYMENT_INCIDENT_ADMIN_SECRET` con 32+ caracteres. En staging/producción configura al menos `PAYMENT_INCIDENT_ALERT_WEBHOOK_URL` o `PAYMENT_INCIDENT_ALERT_EMAIL`. Siempre se emite además un log JSON sin secretos ni payload Stripe completo.

## Consulta protegida

```bash
curl -H "Authorization: Bearer $PAYMENT_INCIDENT_ADMIN_SECRET" \
  https://staging.example/api/admin/payment-incidents
```

El endpoint nunca usa sesión de usuario y debe quedar detrás de HTTPS, secreto del gestor y restricciones del proveedor. `payment_incidents` y su auditoría no tienen privilegios de cliente.

## Acciones

```bash
curl -X POST https://staging.example/api/admin/payment-incidents \
  -H "Authorization: Bearer $PAYMENT_INCIDENT_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"incidentId":"UUID","action":"retry","reason":"Datos contrastados en Stripe"}'
```

Acciones: `retry` recupera directamente la Checkout Session en Stripe, repite todas las validaciones y ejecuta una activación con evento administrativo idempotente; `resolve` cierra con motivo; `refunded` registra que el reembolso se comprobó en Stripe; `ignore` exige un motivo. Nunca se debe marcar `refunded` antes de comprobar el objeto en Stripe.

Procedimiento: comprobar Event, Session, PaymentIntent, Customer, Price, importe, moneda, país, `automatic_tax.status=complete`, comportamiento inclusivo, base, IVA, total e Invoice pagada; corregir solo datos autorizados; reintentar una vez; si no procede conceder acceso, reembolsar desde Stripe Test y esperar su webhook; cerrar con evidencia y motivo. No editar manualmente `user_licenses` ni importes.

Incidencias finales:

- `tax_mismatch`: cálculo automático incompleto, impuesto cero, modo no inclusivo o redondeo distinto; conserva valores esperados y recibidos.
- `invoice_mismatch`: falta factura pagada o su país/moneda/base/IVA/total no coincide.
- `upgrade_refund_restore_failure`: falta una relación explícita u otra invariancia impide restaurar de forma segura.
- `upgrade_original_purchase_refunded`: se devolvió el pago original ya acreditado; contiene neto total pagado, precio del plan ampliado y déficit para resolución administrativa.
- `payment_reversal_ambiguous`: PaymentIntent, Charge, Checkout Session, Invoice o compra interna apuntan a resultados incompatibles. No activar ni emparejar por Customer; contrastar los objetos directamente en Stripe.
- `payment_fully_refunded_before_activation`: el pago verificado llegó después de un refund total ya conservado. No existió licencia pagada y el resultado económico se aplicó automáticamente.
- `payment_dispute_before_activation`: una disputa `open/lost` impidió crear licencia. `won` solo puede recuperar el acceso mediante el RPC transaccional y evidencia fiscal previamente verificada.

## Conciliación de solo lectura

Ejecuta `npm run payments:reconcile -- --dry-run`. Sin credenciales devuelve `PENDING`; con Supabase staging lista reversiones `pending_match/matched/requires_review` y compras incompatibles, sin modificar filas. Consultar producción requiere además `--allow-production`. La herramienta rechaza `--apply`: las mutaciones solo pasan por los RPC transaccionales del webhook.
