# Stripe Checkout de prueba para MatriculaPro

Estado: preparado para configurar y validar en staging. Este documento no autoriza cobros reales. El código rechaza claves y eventos live.

## 1. Cuenta y modo

1. Usa una cuenta Stripe controlada por el titular y activa **Test mode**.
2. No copies claves, Prices, Coupons ni webhooks del modo live.
3. Guarda `STRIPE_SECRET_KEY=sk_test_…` únicamente en el gestor de secretos del servidor.
4. Configura `APP_BASE_URL` y `NEXT_PUBLIC_SITE_URL` con el mismo origen HTTPS exacto de staging.

## 2. Products, tax codes y Prices

Crea dos Products: Particular con `txcd_10103000` y Profesional con `txcd_10103001`. Dentro de ellos crea seis Prices únicos, activos, en EUR, de pago único y con `tax_behavior=inclusive`:

| Nivel | Duración | Total visible | `unit_amount` |
| --- | --- | ---: | ---: |
| Particular | 1 mes | 79,00 € | 7900 |
| Particular | 6 meses | 179,00 € | 17900 |
| Particular | 12 meses | 279,00 € | 27900 |
| Profesional | 1 mes | 129,00 € | 12900 |
| Profesional | 6 meses | 299,00 € | 29900 |
| Profesional | 12 meses | 449,00 € | 44900 |

Guarda los seis `price_…` en las variables `STRIPE_PRICE_*` de `.env.example`. No reutilices un Price entre planes. El servidor comprueba nivel, duración, Price ID, importe y moneda contra su catálogo autoritativo.

El catálogo contractual español separa internamente base, IVA y total. Stripe Tax debe estar activo en Test mode, cada Product debe usar su tax code SaaS oficial y cada Price debe declarar `tax_behavior=inclusive`. Antes de lanzar, valida en una factura Test que Stripe muestra correctamente base, cuota, total, emisor, NIF, numeración y datos del cliente.

## 3. Ampliación de 15 días

La ampliación solo parte de una licencia de un mes, dentro del mismo nivel y hasta el instante exacto del día 15. Si se habilita en staging, crea dos Coupons test con `duration=once`, EUR y sin cupones combinables:

- Particular: `amount_off=7900`.
- Profesional: `amount_off=12900`.

Guarda sus identificadores en `STRIPE_COUPON_PARTICULAR_1M_CREDIT` y `STRIPE_COUPON_PROFESSIONAL_1M_CREDIT`. La base de datos reserva la elegibilidad y evita su reutilización; el navegador no decide crédito, fechas ni total.

## 4. Webhook

Crea un endpoint exclusivamente test:

```text
https://<host-exacto-de-staging>/api/stripe/webhook
```

Selecciona exactamente estos eventos:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.expired
charge.refunded
refund.updated
charge.dispute.created
charge.dispute.updated
charge.dispute.closed
```

Copia el secreto de firma test `whsec_…` a `STRIPE_WEBHOOK_SECRET`. No pongas el secreto en el cliente ni en logs. Solo un webhook con firma válida activa, amplía, renueva, reembolsa o gestiona una disputa; la página de éxito nunca concede acceso. La guía de casos acumulativos está en `docs/STRIPE_TESTING.md`.

## 5. Checkout y factura

El servidor crea sesiones `payment`, solicita dirección de facturación e identificador fiscal y habilita `invoice_creation` en modo test. Revisa manualmente:

1. descripción y duración del plan;
2. pago único y ausencia de renovación;
3. moneda EUR e importe exacto;
4. desglose fiscal y datos del emisor;
5. dirección, Tax ID y recibo/factura del cliente;
6. URLs de éxito y cancelación bajo el host de staging;
7. email contractual de MatriculaPro tras el evento válido.

## 6. Pruebas obligatorias en staging

1. Compra válida de cada nivel y duración.
2. Pago asíncrono completado.
3. Sesión expirada sin acceso.
4. Firma ausente o incorrecta: rechazo.
5. Evento live, Price desconocido, importe o moneda distintos: rechazo.
6. Repetición del mismo evento: no duplica licencia, evento ni email.
7. Evento de activación posterior a reembolso/disputa: no reactiva.
8. Ampliación en día 1, día 15 exacto y un segundo después.
9. Intento duplicado, cambio de nivel y licencia reembolsada.
10. Reembolso y disputa retiran el acceso pagado conservando la cuenta Gratis.

Ejecuta también:

```bash
npm run test:stripe
npm run test:e2e
npm run env:validate -- --staging
```

No marques Stripe como validado en staging hasta comprobar eventos reales de Test mode, firma, reintentos, factura y entrega de email con las credenciales del entorno.
