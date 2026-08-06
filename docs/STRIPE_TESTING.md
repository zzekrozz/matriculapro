# Stripe Test: Checkout, Stripe Tax y webhooks

Usa exclusivamente `sk_test_…`, Products, Prices, Coupons y webhooks de Test mode. Los seis Prices son one-time, EUR, `tax_behavior=inclusive` y 7.900/17.900/27.900 o 12.900/29.900/44.900 céntimos. Checkout habilita Stripe Tax automático, recoge dirección fiscal, reutiliza Customer y crea una Invoice de pago único. No existe Tax Rate manual.

Antes de probar ejecuta `npm run stripe:doctor`. Sin credenciales solo valida el contrato estático y declara remoto `PENDING`; con credenciales comprueba Stripe Tax activo, los dos Products/tax codes y los seis Prices reales.

## Endpoint

```bash
stripe login
stripe listen \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,charge.refunded,refund.updated,charge.dispute.created,charge.dispute.updated,charge.dispute.closed \
  --forward-to localhost:3000/api/stripe/webhook
```

Copia el `whsec_…` a `STRIPE_WEBHOOK_SECRET` y reinicia Next. El handler siempre verifica la firma sobre el cuerpo sin modificar.

## Secuencia reproducible

1. Registra y confirma una cuenta sintética.
2. Compra con `4242 4242 4242 4242`, fecha futura, CVC cualquiera y dirección de facturación española.
3. Comprueba Customer persistente, Session `paid`, `automatic_tax.status=complete`, una Invoice `paid`, país ES, EUR, Price esperado e impuesto inclusivo mayor que cero.
4. En `purchases`, contrasta `automatic_tax_status`, `tax_behavior`, país, base, IVA, total, Invoice ID y número. Exige siempre `base + IVA = total` con los céntimos exactos de Stripe.
5. Repite el Event ID: debe existir una única licencia y un único efecto económico.
6. Prueba los seis importes finales: 79, 179, 279, 129, 299 y 449 €.
7. Prueba ampliación, renovación, reembolso parcial/total y disputa; el orden refund/disputa antes de Checkout tampoco puede crear acceso indebido.
8. Con fixtures Test controlados prueba país no ES, cálculo `failed` o `requires_location_inputs`, impuesto cero, Invoice ausente/no pagada, Customer/Price/moneda divergentes, Price `exclusive` y discrepancias de base, IVA o total.
9. Para cualquier pago no activable confirma incidencia `country_mismatch`, `tax_mismatch` o `invoice_mismatch` y el mensaje “No vuelvas a pagar”.

## Eventos fuera de orden

La migración 011 conserva primero refunds y disputas; la 012 mantiene ese ordenamiento al sustituir el RPC de activación por el de Stripe Tax automático. Resultados esperados:

- refund total previo: compra `fully_refunded`, ninguna licencia;
- refund parcial previo: política existente, importe acumulado e incidencia;
- disputa `open/lost` previa: ninguna licencia;
- `won` posterior: solo activa si ya existe evidencia automática completa y no hay otro bloqueo;
- IDs contradictorios: revisión manual, nunca coincidencia basada solo en Customer.

Una caída de persistencia debe producir error reintentable, no HTTP 200 silencioso. Las pruebas remotas solo se declaran aprobadas después de observar Events, Session, Invoice y base de datos reales en Test mode.
