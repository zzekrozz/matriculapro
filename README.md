# MatriculaPro · IvanImports

MatriculaPro es una aplicación web para preparar expedientes de matriculación de vehículos en España. Pertenece personalmente a su creador, que opera comercialmente como **IvanImports**. La identidad legal completa, NIF, domicilio, correo y dominio definitivos no se inventan: deben configurarse antes de producción y superar revisión profesional.

La aplicación organiza documentación, fiscalidad, ITV, DGT, costes y decisiones de expediente. No presenta trámites, no sustituye a AEAT, DGT, ITV, Aduanas ni a un profesional, y muestra bloqueos cuando faltan datos o el territorio no está soportado.

## Producto y acceso

La configuración actual incluye una beta pública reversible, activa por defecto salvo que se configure `PUBLIC_BETA_MODE=false`. El visitante entra sin login, registro ni sesión anónima; los expedientes y datos profesionales se guardan localmente en su navegador y puede utilizar las funciones Particular y Profesional sin comprar una licencia. Stripe, Auth, los planes, las licencias y sus reglas permanecen intactos para poder volver al modo comercial cambiando únicamente el interruptor. Consulta `docs/PUBLIC_BETA_MODE.md`.

Solo existen tres niveles de producto:

- **Gratis:** comprobación previa registrada en `/app/comprobar`, con introducción manual de datos, nivel de riesgo y siguientes pasos.
- **Particular:** expediente fiscal, documental, ITV, DGT, checklists y costes para uso no comercial.
- **Profesional:** todo lo anterior más clientes, finanzas, márgenes e informes, para un único usuario profesional.

Las licencias de pago son compras únicas de 1, 6 o 12 meses, sin renovación automática y con IVA incluido. El uso dentro del nivel contratado no se limita por número de comprobaciones. La ampliación promocional desde una licencia de un mes solo se ofrece durante los primeros 15 días, dentro del mismo nivel y conservando como inicio la fecha de la compra original; el servidor vuelve a calcular siempre la elegibilidad y el crédito. La renovación manual se abre durante los últimos 30 días, mantiene el nivel, cobra el periodo completo y lo programa sin solapar ni perder días.

## Stack

- Next.js 15, React 18 y TypeScript estricto.
- Supabase Auth, PostgreSQL y RLS mediante `@supabase/ssr` y `@supabase/supabase-js`.
- Stripe Checkout en modo de prueba, con pagos únicos y activación exclusiva por webhook.
- Zod, Tailwind CSS, Framer Motion y Lucide React.
- Catálogo fiscal oficial versionado y motor de cálculo determinista.

No hay carga de archivos, almacenamiento documental, OCR, IA, analítica, píxeles publicitarios ni cookies opcionales.

## Desarrollo local

Requisitos: Node.js compatible con Next.js 15 y npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. El acceso a la aplicación requiere una cuenta real de Supabase; no existe un atajo local que eleve permisos ni una sesión ficticia persistente.

La configuración de desarrollo puede conservar los campos legales vacíos. Producción queda bloqueada hasta completarlos y establecer `LEGAL_REVIEW_COMPLETED=true` tras una revisión profesional real.

## Variables de entorno

Usa `.env.example` como inventario canónico. Los grupos principales son:

- entorno y origen público: `MATRICULAPRO_DEPLOY_TARGET`, `NEXT_PUBLIC_SITE_URL`, `APP_BASE_URL`;
- apertura temporal: `PUBLIC_BETA_MODE=true` para beta o `false` para recuperar el flujo comercial;
- Supabase: URL, clave pública y `SUPABASE_SERVICE_ROLE_KEY` solo en servidor;
- titular y contacto legal: variables `LEGAL_*`;
- seis precios Stripe de prueba y, si se habilita la ampliación, dos cupones de crédito;
- secreto administrativo y al menos un canal de alerta para incidencias de pago en staging/producción;
- rate limiting distribuido, obligatorio en producción;
- Resend para correo transaccional.

Nunca uses claves `sk_live_`, precios live ni un webhook live durante staging. No expongas la clave de servicio, secretos Stripe, Redis o Resend al navegador.

## Rutas principales

```text
/                                  Presentación pública y precios
/registro                          Alta de cuenta gratuita
/entrar                            Inicio de sesión
/recuperar-contrasena              Solicitud de recuperación
/restablecer-contrasena            Nueva contraseña
/app/comprobar                     Comprobación previa gratuita
/app/planes                        Selector de licencia y ampliación
/app/cuenta                        Perfil, licencia, seguridad y privacidad
/app/expedientes                   Expedientes Particular/Profesional
/app/expedientes/[id]/*            Documentos, impuestos, ITV, DGT y fechas
/app/profesional/*                 Clientes, finanzas e informes
/legal/*                           Avisos, privacidad, cookies y contratación
```

Las rutas privadas, autenticación, checkout y área de cuenta llevan `noindex`. `robots.ts`, `sitemap.ts`, manifest, metadatos sociales, canonical y datos estructurados cubren la superficie pública.

## Supabase

La guía reproducible está en `docs/SUPABASE_SETUP.md`.

1. Crea un proyecto independiente de staging.
2. Configura Site URL, redirects, email con contraseña y SMTP.
3. Aplica en orden las migraciones `001` a `009`; son historia inmutable y no deben editarse si ya se aplicaron.
4. Importa `supabase/seed/fiscal_catalog_2026.sql` después de las migraciones.
5. Ejecuta pgTAP y los diagnósticos del repositorio.

```powershell
supabase db push --dry-run
supabase db push
supabase test db
npm run supabase:verify
npm run fiscal:verify-database
```

La aplicación actual no crea ni usa objetos de Storage. La migración `007` retira la escritura sin borrar archivos históricos; el inventario y la retirada manual segura están descritos en `docs/DOCUMENT_STORAGE_RETIREMENT.md`.

## Stripe de prueba

La configuración reproducible del Dashboard, precios, cupones, webhook y pruebas está en `docs/STRIPE_TEST_SETUP.md`.

El navegador envía únicamente el nivel, duración y aceptaciones contractuales. El servidor:

1. obtiene el precio permitido desde configuración;
2. comprueba sesión, nivel y posible ampliación;
3. enlaza las tres declaraciones contractuales con la compra reservada;
4. crea una Checkout Session de pago único que solicita dirección de facturación e identificador fiscal, y habilita la factura de Stripe en modo de prueba;
5. registra primero la recepción y después el resultado idempotente de cada evento;
6. activa o revoca la licencia únicamente al procesar el webhook válido.

Se rechazan precios desconocidos, modo live, moneda o importe incorrectos, eventos duplicados o desordenados y pagos no completados. Reembolsos y disputas se registran y ajustan el acceso mediante la misma capa de servidor.

Antes de staging, configura en Stripe test los seis Price IDs con IVA incluido y revisa la plantilla de factura, la numeración, los datos del emisor y Tax ID. Que Checkout genere una factura técnica no sustituye la revisión fiscal y legal del documento emitido.

## Catálogo fiscal 2026

La fuente base reproducible es la Orden HAC/1501/2025 (`BOE-A-2025-26357`). El repositorio contiene fuentes, hashes, catálogo normalizado, rechazos, muestras y seed SQL. El conjunto esperado suma **70.931** filas: 70.886 vehículos y 45 bandas genéricas.

```powershell
npm run fiscal:download
npm run fiscal:parse
npm run fiscal:validate
npm run fiscal:test
npm run fiscal:verify-database
```

En producción el cálculo fiscal exige el catálogo de PostgreSQL disponible; no debe cargar silenciosamente el catálogo completo en memoria cuando Supabase falla. Las reglas territoriales y sus límites están documentados en `docs/FISCAL_TERRITORIES.md`.

## Validación

```powershell
npm run launch:validate
npm run typecheck
npm test
npm run lint
npm run build
npm audit --audit-level=high
git diff --check
```

Comandos individuales de lanzamiento:

- `npm run env:validate`
- `npm run legal:validate`
- `npm run launch:no-tracking`
- `npm run auth:doctor`
- `npm run supabase:verify`
- `npm run fiscal:verify-database`

El `prebuild` ejecuta las validaciones de entorno, legal y ausencia de tracking. Una compilación de producción debe fallar si faltan datos legales esenciales, si la revisión legal no se ha confirmado o si falta el proveedor distribuido de rate limiting.

## Documentación operativa

- `MATRICULAPRO_LAUNCH_AUDIT.md`: auditoría de preparación para lanzamiento.
- `MATRICULAPRO_DOMAIN_AUDIT.md`: decisiones y límites del dominio de matriculación.
- `docs/SUPABASE_SETUP.md`: staging, Auth, migraciones, RLS y catálogo.
- `docs/RESEND_SUPABASE_SMTP_SETUP.md`: correo transaccional y SMTP.
- `docs/STRIPE_TEST_SETUP.md`: Checkout y webhooks exclusivamente en Stripe test.
- `docs/STRIPE_TESTING.md`: casos de pago, reembolso, disputa y repetición con Stripe CLI.
- `docs/STAGING_RUNBOOK.md`: puesta en marcha y promoción reproducible de staging.
- `docs/PAYMENT_INCIDENTS.md`: consulta, reintento, reembolso y cierre auditado de incidencias.
- `docs/LICENSE_LIFECYCLE.md`: ampliación, renovación, reembolso y disputas.
- `docs/ACCESS_MATRIX.md`: capacidades exactas por estado y nivel.
- `docs/LEGAL_AND_SEO_LAUNCH.md`: configuración legal, cookies y SEO.
- `docs/FISCAL_TERRITORIES.md`: trazabilidad territorial fiscal.
- `docs/DOCUMENT_STORAGE_RETIREMENT.md`: retirada segura del bucket documental histórico.

## Límites deliberados

MatriculaPro produce preparación y estimaciones trazables, no resoluciones vinculantes. Los casos forales, territorios especiales, periodos históricos sin fuente suficiente, homologaciones individuales, reformas complejas y categorías no cubiertas se bloquean o remiten a revisión. El usuario debe contrastar los datos con los documentos originales y con la administración competente antes de presentar cualquier trámite.
