# Configuración de IVA español en Stripe Test

Este procedimiento usa únicamente Stripe Test Mode. No copies claves ni objetos live y no inventes datos legales. La promoción a producción permanece bloqueada hasta completar y revisar identidad fiscal, datos comerciales y factura.

1. En Stripe Test, crea una Tax Rate manual visible como `IVA`, descripción `IVA España 21 %`, porcentaje `21`, inclusiva, país `ES` y activa. Créala una sola vez.
2. Copia su ID `txr_…` al secreto de servidor `STRIPE_TAX_RATE_ES_IVA_21`. Nunca uses `NEXT_PUBLIC_` ni lo aceptes del navegador.
3. Crea o revisa los seis Prices one-time en EUR: Particular 7.900/17.900/27.900 y Profesional 12.900/29.900/44.900 céntimos, todos con `tax_behavior=inclusive`.
4. Configura los Products con nombre y duración comprensibles. No inventes razón social, NIF ni domicilio.
5. Ejecuta `npm run env:validate -- --staging` y `npm run stripe:doctor`. El doctor debe validar la Tax Rate y los seis Prices sin imprimir secretos.
6. Completa en Stripe Test el nombre comercial IvanImports y los datos legales únicamente cuando existan y hayan sido revisados. Configura numeración y pie de factura conforme a esa revisión.
7. Crea el webhook test para Checkout completado/expirado, refunds y disputas según `docs/STRIPE_TESTING.md`; copia el `whsec_…` al gestor de secretos.
8. Realiza una compra española sintética. Checkout debe reutilizar `cus_…`, recoger dirección de facturación, aplicar la Tax Rate manual y crear una Invoice pagada.
9. Descarga la factura de prueba. Comprueba producto, duración, cliente, dirección española, EUR, nombre comercial configurado y estado pagado.
10. Contrasta base + IVA = total. Para 79 € deben ser 65,29 € + 13,71 €; para 299 €, 247,11 € + 51,89 €. Repite con los seis planes.
11. Prueba país ausente y país distinto de ES con objetos test controlados: no debe activarse acceso y debe aparecer `country_mismatch` con el mensaje “No vuelvas a pagar”.
12. Prueba Tax Rate 10 %, exclusiva, inactiva y live, Price no inclusivo, moneda no EUR, redondeo divergente y factura ausente: ninguna variante debe activar.
13. Reembolsa parcialmente una compra y confirma que se registra el acumulado, se mantiene la licencia y se crea revisión comercial.
14. Compra un mes, amplía dentro de 15 días y reembolsa totalmente solo la ampliación. Confirma que se restaura la misma licencia original hasta su fecha original; repite con original vencida y original reembolsada.
15. Para promover a Live Mode, crea objetos live separados, rota secretos, repite doctor/checklist/pgTAP/E2E, completa revisión legal y obtiene aprobación explícita. Nunca reutilices IDs test en live.

Comando CLI reproducible:

```bash
stripe listen \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,charge.refunded,refund.updated,charge.dispute.created,charge.dispute.updated,charge.dispute.closed \
  --forward-to localhost:3000/api/stripe/webhook
```
