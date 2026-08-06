# Lanzamiento legal, público y SEO de MatriculaPro

Este inventario acompaña la preparación para staging. No constituye una revisión jurídica y no autoriza un despliegue de producción.

## Configuración legal obligatoria

La fuente única es `src/config/legal.ts`. El propietario debe introducir valores reales en el gestor de secretos:

```text
LEGAL_OWNER_FULL_NAME
LEGAL_OWNER_NIF
LEGAL_TRADE_NAME=IvanImports
LEGAL_OWNER_ADDRESS
LEGAL_CONTACT_EMAIL
LEGAL_PRIVACY_EMAIL
NEXT_PUBLIC_SUPPORT_EMAIL
LEGAL_REVIEW_COMPLETED=false
```

`LEGAL_REVIEW_COMPLETED` solo debe pasar a `true` después de que un profesional revise el aviso legal, privacidad, cookies, términos, contratación, desistimiento y su aplicación en checkout. El validador rechaza marcadores obvios y el dato ficticio `12345678A`.

La integración está activa en `package.json`:

```json
{
  "scripts": {
    "env:validate": "sucrase-node scripts/launch/validate-environment.ts",
    "legal:validate": "sucrase-node scripts/launch/validate-legal-config.ts",
    "launch:no-tracking": "sucrase-node scripts/launch/validate-no-tracking.ts"
  }
}
```

El pipeline de producción debe ejecutar `npm run legal:validate -- --production` o declarar `VERCEL_ENV=production`, `MATRICULAPRO_DEPLOY_TARGET=production`, `DEPLOYMENT_ENV=production` o `APP_ENV=production`. `NODE_ENV` por sí solo no selecciona un destino, para que una compilación local optimizada pueda seguir verificándose sin publicar. Con una señal de producción, cualquier dato ausente o revisión incompleta termina con código 1.

## Páginas legales

- `/legal/aviso-legal`
- `/legal/privacidad`
- `/legal/cookies`
- `/legal/terminos`
- `/legal/condiciones-contratacion`
- `/legal/aviso-fiscal-tecnico`
- `/legal/desistimiento`

En desarrollo muestran marcadores explícitos. La configuración de producción debe impedir que esos marcadores lleguen a publicarse.

## Inventario de cookies

`src/config/cookies.ts` declara únicamente:

- cookie fragmentada de sesión de Supabase, propia y necesaria;
- `mpro-recovery-state` y `mpro-recovery-authorized`, propias, HttpOnly y efímeras durante la recuperación;
- `__stripe_mid` y `__stripe_sid`, necesarias durante Stripe Checkout.

No se han añadido analítica, píxeles, publicidad, grabaciones o scripts opcionales. Mientras el inventario solo contenga cookies necesarias, no debe mostrarse un banner de aceptación engañoso.

## Páginas editoriales públicas

- Comprobar documentación de un coche importado.
- Calcular el Modelo 576.
- Tablas de Hacienda 2026.
- Minoración del impuesto de matriculación.
- Diferencias entre Modelos 05, 06 y 576.
- Campo K.
- Certificado de Conformidad europeo.
- Matricular un coche procedente de Alemania.
- Regla de seis meses y 6.000 km.
- Impuesto de matriculación y CO₂.

Cada guía resuelve una intención distinta, enlaza fuentes oficiales dentro de sus secciones, indica la fecha de revisión, declara límites, ofrece contenido relacionado y termina en el comprobador gratuito.

## SEO técnico

- Metadata base, canonical, Open Graph y Twitter Card en el layout raíz.
- Tarjeta social propia en `public/og.png`.
- `SoftwareApplication`, `WebSite`, `Brand` y `FAQPage` en la landing.
- `Person` solo se genera cuando nombre y domicilio reales están configurados.
- `BreadcrumbList` en legales y guías; `Article` en guías.
- `robots.txt`, `sitemap.xml` y `manifest.webmanifest` mediante Metadata Routes de Next.js.
- Iconos PNG generados por Next para favicon y Apple touch icon.
- Páginas 404 y error con mensajes que no afirman presentación o validación.

Las rutas privadas y de autenticación deben mantener `noindex, nofollow` también mediante metadata en sus layouts. `robots.txt` las bloquea, pero esa regla no sustituye el `noindex` de cada superficie privada.

## Comprobaciones manuales antes de staging

1. Sustituir todos los marcadores legales con datos reales.
2. Mantener `LEGAL_REVIEW_COMPLETED=false` hasta recibir aprobación profesional.
3. Configurar `NEXT_PUBLIC_SITE_URL` con el host exacto de staging.
4. Revisar canonical y Open Graph con el HTML generado.
5. Abrir `/robots.txt`, `/sitemap.xml` y `/manifest.webmanifest`.
6. Verificar que `/app/**`, registro, login, recuperación, callbacks y checkout emiten `noindex`.
7. Recorrer a teclado landing, pricing, FAQ, tablas, legales y guías a 320, 390, tablet y escritorio.
8. Ejecutar el validador anti-tracking.
9. Comprobar que ningún CTA de pago confía en tier, precio o fecha enviados por el cliente.
10. Confirmar que `/app/planes` existe antes de publicar los CTA de planes.

## Mantenimiento editorial

Las páginas fiscales se revisan al cambiar tablas, tipos, formularios o instrucciones. Actualiza simultáneamente contenido, fuente, fecha ISO para datos estructurados, sitemap y pruebas. No conserves una fecha reciente si no se ha contrastado de nuevo el contenido.
