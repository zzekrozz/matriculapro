# Stripe Tax automático para IVA español (Test mode)

Este procedimiento usa solo Stripe Test. MatriculaPro no utiliza una Tax Rate manual ni una variable equivalente. Checkout envía `automatic_tax.enabled=true`; los Prices ya incluyen el impuesto y el total cobrado debe seguir siendo el precio público.

## 1. Activar y revisar Stripe Tax

1. Activa **Test mode** en Stripe Dashboard.
2. Abre **Revenue > Tax > Settings** y revisa la dirección fiscal de la sede.
3. En **Tax > Registrations**, añade o revisa el registro de España que corresponda al titular. No inventes datos fiscales.
4. En **Tax > Settings**, deja Stripe como proveedor fiscal y comprueba que Stripe Tax figura activo en Test mode.
5. No crees ni asignes Tax Rates manuales. Elimina `STRIPE_TAX_RATE_ES_IVA_21` del entorno si todavía existe.

## 2. Crear exactamente dos Products

En **Product catalog > Products**, crea o edita:

- `MatriculaPro Particular`: asigna el tax code oficial **Software as a service (SaaS) - personal use**, ID `txcd_10103000`.
- `MatriculaPro Profesional`: asigna el tax code oficial **Software as a service (SaaS) - business use**, ID `txcd_10103001`.

Ruta de edición: abre el Product, pulsa **Edit product**, busca **Product tax code**, selecciona el nombre anterior y guarda. Son códigos oficiales de Stripe para software alojado, entregado por Internet y no descargable. La distinción personal/business resulta especialmente relevante en Estados Unidos, pero permite clasificar correctamente los dos Products sin usar un código inventado.

## 3. Crear los seis Prices inclusivos

Crea tres Prices dentro de cada Product. En cada Price selecciona **One time**, moneda **EUR** y **Include tax in price / Inclusive** (`tax_behavior=inclusive`). No uses precios recurrentes.

| Product | Duración | Importe final | `unit_amount` | Variable |
| --- | --- | ---: | ---: | --- |
| Particular | 1 mes | 79 € | 7900 | `STRIPE_PRICE_PARTICULAR_1M` |
| Particular | 6 meses | 179 € | 17900 | `STRIPE_PRICE_PARTICULAR_6M` |
| Particular | 12 meses | 279 € | 27900 | `STRIPE_PRICE_PARTICULAR_12M` |
| Profesional | 1 mes | 129 € | 12900 | `STRIPE_PRICE_PROFESSIONAL_1M` |
| Profesional | 6 meses | 299 € | 29900 | `STRIPE_PRICE_PROFESSIONAL_6M` |
| Profesional | 12 meses | 449 € | 44900 | `STRIPE_PRICE_PROFESSIONAL_12M` |

El Price inclusivo hace que Stripe extraiga el IVA del importe mostrado: no lo suma encima. `npm run stripe:doctor` exige seis IDs Test distintos, exactamente dos Products, los importes anteriores, pago único, EUR, `inclusive`, los tax codes esperados y Stripe Tax activo.

## 4. Checkout, factura y webhook

1. En **Settings > Billing > Invoices**, configura únicamente los datos reales y revisados del emisor, numeración y pie de factura.
2. Crea un webhook de Test mode para `https://<staging>/api/stripe/webhook`.
3. Selecciona: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`, `refund.updated`, `charge.dispute.created`, `charge.dispute.updated` y `charge.dispute.closed`.
4. Guarda su secreto `whsec_…` como `STRIPE_WEBHOOK_SECRET` únicamente en servidor.
5. Checkout conserva `mode=payment`, Customer persistente, dirección de facturación obligatoria, Tax ID e `invoice_creation.enabled=true`.

## 5. Comprobación obligatoria

Ejecuta:

```bash
npm run env:validate -- --staging
npm run stripe:doctor
```

Realiza una compra Test con dirección española y confirma en Session e Invoice: `automatic_tax.status=complete`, país `ES`, EUR, Price esperado, Customer esperado, factura `paid`, Price `inclusive`, impuesto mayor que cero y `base + IVA = total`. Para 79 € se esperan 65,29 € + 13,71 €; para 299 €, 247,11 € + 51,89 €.

Prueba también dirección no española, cálculo automático incompleto, impuesto cero, Invoice ausente, Price no inclusivo y discrepancias de base/IVA/total. En todos esos casos debe existir incidencia, no debe crearse licencia y el usuario debe ver que no vuelva a pagar.

No marques Stripe remoto como aprobado hasta ejecutar estas comprobaciones con objetos y credenciales Test reales.
