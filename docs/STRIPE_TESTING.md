# Stripe Test: checkout, webhooks y casos de cierre

Usa exclusivamente `sk_test_…`, Prices, Tax Rate y Coupons de test. Los seis Prices siguen siendo pago único EUR, IVA incluido y 7.900/17.900/27.900 o 12.900/29.900/44.900 céntimos. Checkout aplica a su única línea `STRIPE_TAX_RATE_ES_IVA_21`, recoge dirección fiscal y Tax ID y crea factura de pago único; la activación exige país final `ES`. Un NIF-IVA no aplica exención automática.

Antes de probar, ejecuta `npm run stripe:doctor`. Con credenciales test valida la tasa activa, inclusiva, 21 %, española y no-live, y contrasta los seis Prices con Stripe. `tax_behavior=inclusive` en el Price no sustituye la aplicación de la Tax Rate manual. No se habilita `automatic_tax` en esta sesión.

## Endpoint

```bash
stripe login
stripe listen \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,charge.refunded,refund.updated,charge.dispute.created,charge.dispute.updated,charge.dispute.closed \
  --forward-to localhost:3000/api/stripe/webhook
```

Copia el `whsec_…` mostrado a `STRIPE_WEBHOOK_SECRET` y reinicia Next. Configura los mismos ocho eventos en el Dashboard de staging. `charge.refunded` y `refund.updated` recuperan la Charge actual para usar el acumulado; el nombre del evento no decide si es total.

## Secuencia reproducible

1. Registrar y confirmar una cuenta sintética.
2. Comprar en tarjeta `4242 4242 4242 4242`, fecha futura, CVC cualquiera y dirección española.
3. Confirmar una fila `billing_customers`, compra pagada y licencia activa. En `purchases`, contrastar Tax Rate, 21 %, `inclusive`, base, IVA, total, Invoice ID y número.
4. Repetir checkout con la misma cuenta: debe reutilizar `cus_…`.
5. Probar ampliación dentro de 15 días y renovación en los últimos 30 días.
6. En Dashboard, reembolsar 1 €, luego hasta 50 %, luego completar. Confirmar que solo el total revoca. Si se reembolsa únicamente la ampliación, debe restaurarse la licencia original solo hasta su vencimiento original.
7. Usar fixtures/CLI de disputa para `warning/open/won/lost` y confirmar suspensión/restauración/revocación.
8. Cambiar deliberadamente país, Price, importe, Customer, Tax Rate, porcentaje, redondeo o factura en un objeto de test controlado: debe aparecer una incidencia y nunca acceso.
9. Reenviar el mismo Event desde Dashboard: no debe duplicar periodos, cantidades ni eventos terminales.

Si no hay Stripe CLI, exporta un Event real de test, conserva exactamente el cuerpo JSON y genera la firma con `stripe.webhooks.generateTestHeaderString` solo en el script de pruebas. El handler productivo sigue usando `constructEvent`; no existe bypass de firma.

## Eventos Stripe fuera de orden

La migración 011 registra `charge.refunded`, `refund.updated` y disputas en `pending_payment_reversals` antes de responder 200. Para probar el caso crítico, pausa temporalmente el reenvío del evento Checkout, entrega primero el refund o la disputa y después reenvía `checkout.session.completed` desde Stripe Test. El resultado esperado es:

- refund total: compra `fully_refunded`, cero licencias de pago y mensaje específico en cuenta;
- refund parcial: licencia según la política actual, compra `partially_refunded` e incidencia;
- disputa `open/lost`: compra disputada y cero licencias; un `won` posterior puede activar únicamente con la evidencia fiscal verificada ya guardada;
- IDs fuertes contradictorios: `requires_review`, incidencia y cero activación;
- Customer coincidente por sí solo: nunca empareja.

Reenvía cada evento dos veces y confirma una sola fila por `stripe_event_id`. Simula también un fallo de Supabase: el endpoint debe devolver 500 para que Stripe reintente; no se permite un 200 si la reversión no quedó durable.
