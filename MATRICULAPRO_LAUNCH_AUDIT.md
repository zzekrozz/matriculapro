# Auditoría de preparación para lanzamiento de MatriculaPro

**Fecha de cierre técnico:** 5 de agosto de 2026  
**Repositorio:** `zzekrozz/matriculapro`  
**Commit base sin modificar:** `e6b22bd90e23f1cb1b907d12c11a92e2b577989e`  
**Alcance:** cambios locales reales, pruebas, documentación y paquete reproducible; sin commit, push, PR ni despliegue.

Estados usados en este informe:

- **PASS:** ejecutado con resultado satisfactorio en este entorno.
- **PASS estático:** coherencia revisada sin un servicio externo real.
- **PENDING:** requiere credenciales, infraestructura o una decisión del propietario.
- **BLOCKED esperado:** una guardia impidió correctamente continuar con configuración incompleta.

## 1. Resumen ejecutivo.

MatriculaPro queda reconstruido como una plataforma con web pública, cuenta Gratis, licencia Particular y licencia Profesional. Se retiraron del producto operativo los accesos históricos, demos, permisos controlados desde el navegador, uploads, OCR e IA. El acceso pagado se decide en servidor y PostgreSQL; Stripe está limitado a Test mode; las licencias son pagos únicos de 1, 6 o 12 meses; y los vencimientos conservan los datos en modo lectura.

La validación local pasa: build de 63 páginas, 121 pruebas unitarias, 51 pruebas fiscales más 10 muestras exactas, 33 pruebas de acceso/Stripe, 9 comprobaciones E2E, typecheck, lint, auditoría npm con 0 vulnerabilidades y control anti-tracking. El catálogo 2026 contiene 70.931 filas válidas y 0 rechazadas.

El código está preparado para **configurar y probar staging**, pero staging no está conectado ni validado extremo a extremo: faltan credenciales técnicas, dominio, datos reales del titular y revisión jurídica. Producción permanece bloqueada deliberadamente. Las 145 aserciones pgTAP se revisaron estáticamente, pero no se ejecutaron porque no hay PostgreSQL, Docker ni Supabase CLI operativa en este entorno.

## 2. Estado inicial.

La base era una aplicación Next.js con App Router, React, TypeScript, Supabase y un dominio fiscal avanzado, pero coexistían superficies y mecanismos históricos incompatibles con el lanzamiento: Founder/Explorer/demo, rutas alternativas, una cookie de entitlement manipulable, componentes de elevación de acceso, helpers de Auth antiguos, esquemas SQL dispersos y Storage documental.

La autenticación no constituía un flujo SSR/PKCE completo y único; la autorización no estaba centralizada en una licencia autoritativa; no existía un modelo completo de compras, ampliaciones, vencimiento y reembolso; y el área Profesional no tenía aislamiento y operaciones de backend suficientes. La landing, SEO, legal, cookies, emails, rate limiting y guías de operación tampoco formaban un cierre reproducible.

El motor fiscal y el catálogo oficial se conservaron. Los pendientes reales estaban en series autonómicas históricas, territorios especiales, frontera de julio de 2021, estados de evidencia y textos que podían sugerir una verificación documental inexistente.

## 3. Referencias a KAIROS eliminadas.

La búsqueda final no encuentra referencias a KAIROS ni a la sociedad indicada en código, contenido, configuración o documentación operativa. MatriculaPro se presenta como propiedad personal de su creador, que opera comercialmente bajo la marca IvanImports, sin atribuir personalidad mercantil a la marca.

`KRONOS` solo permanece dentro de la fuente oficial BOE, el catálogo fiscal derivado y su seed como nombre real de un modelo de vehículo. No es una referencia empresarial y eliminarlo corrompería datos oficiales. Las menciones a Founder/Explorer que sobreviven están limitadas a migraciones históricas aditivas, pruebas negativas y esta auditoría; no conceden acceso.

## 4. Configuración legal creada.

`src/config/legal.ts` centraliza `LegalOwnerConfig`, la marca fija `IvanImports`, España, versiones legales `2026-08-v1`, fecha de revisión y marcadores explícitos de desarrollo. `npm run legal:validate` rechaza datos ausentes, marcadores, formatos de email inválidos, una marca distinta y una revisión no completada.

Las siete páginas legales consumen esa fuente. Mientras la revisión esté incompleta muestran aviso, emiten `noindex/nofollow/nocache` y quedan fuera del sitemap. El `prebuild`, el validador con señal de producción y `next.config.js` bloquean publicación incompleta. Una build optimizada local sigue permitida para QA si no se declara destino de producción.

## 5. Datos legales pendientes.

Faltan valores reales para:

1. `LEGAL_OWNER_FULL_NAME`.
2. `LEGAL_OWNER_NIF`.
3. `LEGAL_TRADE_NAME=IvanImports`.
4. `LEGAL_OWNER_ADDRESS`.
5. `LEGAL_CONTACT_EMAIL`.
6. `LEGAL_PRIVACY_EMAIL`.
7. `NEXT_PUBLIC_SUPPORT_EMAIL`.
8. Revisión profesional y `LEGAL_REVIEW_COMPLETED=true`.

También están pendientes el dominio público, remitente real, datos de facturación del titular, jurisdicción contractual revisada y decisiones definitivas sobre privacidad/encargados. No se introdujo ninguna identidad, NIF, dirección o email ficticio.

## 6. Problema de Supabase encontrado.

La aplicación mezclaba estrategias de sesión y autoridad: helpers antiguos, clientes duplicados, cookie de nivel controlable por cliente, metadata no autoritativa, esquema histórico Founder y operaciones que podían depender demasiado del navegador. La configuración local/remota, redirects, migraciones, seed y RLS no estaban documentados como una secuencia reproducible.

También existía Storage histórico aunque el MVP no admite archivos. En vez de borrar objetos a ciegas, se añadió una retirada aditiva: se revocan escrituras y se conservan lectura/recuperación privada hasta que el propietario inspeccione y retire el bucket de forma controlada.

## 7. Solución de autenticación.

Se unificó Auth sobre `@supabase/ssr` y `@supabase/supabase-js` con cuatro responsabilidades separadas: cliente de navegador, cliente SSR de servidor, cliente administrativo `service_role` solo servidor y middleware de renovación de sesión.

Se implementaron registro, confirmación PKCE, login, reenvío, recuperación y reset. El registro crea antes una autorización efímera cuyo token se guarda solo como SHA-256 y se consume una vez dentro del trigger que crea perfil Gratis y aceptaciones legales; un `signUp` directo sin autorización se revierte. La recuperación usa `mpro-recovery-state` HttpOnly durante 15 minutos y `mpro-recovery-authorized` HttpOnly durante 10 minutos; una sesión ordinaria no autoriza cambiar la contraseña.

Los destinos pasan por una allowlist interna: se rechazan URLs externas, protocol-relative, callbacks y bucles. La única Redirect URL entregada a Supabase es `/auth/callback`; confirmación y reset son destinos internos posteriores.

## 8. Flujos de auth probados.

**PASS local:** 6 pruebas de validación cubren normalización, consentimientos, política de contraseña, recuperación y redirects seguros. `auth:doctor` confirma separación SSR, archivos obligatorios, ausencia de helpers antiguos, registro autorizado y reset server-only.

**PASS navegador sin credenciales:** login, registro y recuperación renderizan sin errores de consola, sin desbordamiento y con redirects privados seguros en los anchos probados.

**PENDING real:** alta, entrega SMTP, confirmación válida/caducada/usada, login, renovación de token, cambio de email, reset y cierre global de sesiones con un proyecto Supabase de staging. `AUTH DOCTOR LIVE` lo informa expresamente porque faltan URL y anon key.

## 9. Migraciones nuevas.

| Orden | Migración | Responsabilidad principal |
| ---: | --- | --- |
| 1 | `202608050001_harden_auth_founder.sql` | Auth, perfiles y endurecimiento de historia Founder. |
| 2 | `202608050002_registration_case_core.sql` | Expedientes, vehículos, documentos manuales, cálculos y seguimiento. |
| 3 | `202608050003_registration_case_rls_storage.sql` | RLS, índices, RPC y Storage privado histórico. |
| 4 | `202608050004_official_source_versions_seed.sql` | Fuentes oficiales versionadas. |
| 5 | `202608050005_fiscal_catalog.sql` | Catálogo fiscal oficial, inmutable y consultable por RPC acotada. |
| 6 | `202608050006_access_licensing_payments.sql` | Gratis/Particular/Profesional, compras, licencias, ampliaciones, aceptaciones, Stripe y retirada de Founder como autoridad. |
| 7 | `202608050007_retire_document_storage.sql` | Bloqueo de INSERT/UPDATE/DELETE de uploads sin borrar objetos históricos. |
| 8 | `202608050008_transactional_email_outbox.sql` | Outbox transaccional, scheduler y RPC service-only. |

Las migraciones son aditivas y se aplican en ese orden. Las primeras migraciones históricas no deben editarse si ya fueron aplicadas; 006 y 007 neutralizan de forma segura lo retirado.

## 10. RLS.

Las tablas privadas activan RLS y usan `auth.uid()` para propiedad. El catálogo fiscal no es editable por `anon` ni `authenticated`. La autoridad de acceso procede de funciones y tablas de licencia, nunca de cookie o `user_metadata`.

Las tablas profesionales exponen lectura del propio historial, pero el navegador no recibe grants de escritura directa; las mutaciones pasan por APIs de servidor con `service_role`, autenticación, comprobación explícita del propietario, capacidad profesional y rate limit. Particular no puede usar operaciones comerciales y un profesional no puede leer clientes de otro.

Aceptaciones, compras, eventos de pago, licencia y outbox tienen restricciones, timestamps, claves idempotentes y permisos mínimos. La revisión estática no encontró P0/P1; la prueba efectiva de políticas requiere `supabase test db` en local o staging.

## 11. Modelo de licencias.

Solo existen `free`, `particular` y `professional`, con duraciones pagadas `one_month`, `six_months` y `twelve_months`. Son compras únicas en EUR, IVA incluido, sin renovación automática y sin contadores comerciales de vehículos o consultas.

Precios centralizados:

| Nivel | 1 mes | 6 meses | 12 meses |
| --- | ---: | ---: | ---: |
| Particular | 79 € | 179 € | 279 € |
| Profesional | 129 € | 299 € | 449 € |

Cada compra conserva base, IVA, total, moneda, país fiscal, tasa, fuente, fecha efectiva, estado y referencia de proveedor. El contexto de acceso selecciona el último ciclo pagado de forma determinista; un reembolso o revocación posterior invalida historiales activos antiguos.

## 12. Reglas de vencimiento.

Los vencimientos se calculan por meses naturales y conservan el instante absoluto. Están probados el 31 de enero, febrero bisiesto, 1/6/12 meses y zonas horarias. El intervalo activo es `[startsAt, expiresAt)`; en el instante exacto de vencimiento deja de ser activo.

La cuenta y el comprobador Gratis permanecen. Expedientes, cálculos e historial Profesional quedan visibles en lectura; no se puede crear, editar, recalcular, mutar clientes/finanzas ni exportar como si la licencia siguiera activa. Se muestra fecha de finalización y opción de renovar manualmente. Reembolso o revocación no conservan el modo lectura pagado asociado a esa compra.

## 13. Regla de ampliación.

Una licencia inicial de un mes puede ampliarse una sola vez a 6 o 12 meses, dentro del mismo nivel, hasta exactamente 15 días desde su inicio. El instante exacto del día 15 está incluido; un segundo después queda fuera.

Se descuenta el 100 % de la compra inicial, sin devolución ni saldo. La nueva duración conserva el inicio original y calcula el vencimiento desde él. El servidor y la base validan compra original, nivel, plazo, reembolso, Price, cupón, crédito, importe, moneda y reserva idempotente. Un webhook duplicado o fuera de orden no reutiliza el crédito ni reactiva una compra revertida.

## 14. Gratis.

Tras confirmar email se asigna Gratis sin tarjeta. `/app/comprobar` permite introducir datos manuales de procedencia, fechas, kilometraje, categoría, vendedor, soporte contractual, campo K, homologación, COC, documento técnico, combustible, CO₂, reformas, matrícula anterior y uso especial.

El motor determinista devuelve nuevo/usado a efectos de IVA, zona, ruta preliminar, riesgos, contradicciones, documentos que pedir y preguntas al vendedor. El nivel visible es `low`, `medium`, `high` o `blocked`, nunca una probabilidad. No incluye valor oficial completo, cálculo 576, expedientes completos, informes ni exportaciones.

## 15. Particular.

Incluye expedientes reales ilimitados durante la licencia, catálogo oficial 2026, cálculo del Modelo 576, depreciación, minoración, casillas, documentos manuales, rutas ITV/impuestos/DGT, checklists, costes, fechas, historial y un informe personal imprimible/guardable en PDF.

No incluye clientes, finanzas, márgenes, informes comerciales ni exportación profesional. Al vencer conserva expedientes y cálculos en lectura.

## 16. Profesional.

Incluye todo Particular más perfil comercial, logotipo por URL, clientes, asociación de expedientes, estados, filtros, costes desglosados, precio objetivo, margen absoluto/porcentual, notas, informe profesional imprimible y CSV. La impresión usa una hoja A4 específica que oculta shell y navegación y evita recortar la tabla.

Es una licencia individual; no se presentan equipos, roles multiusuario ni colaboración como disponibles. El historial profesional sigue accesible en lectura tras vencer, pero mutaciones, exportación y nuevas operaciones continúan bloqueadas.

## 17. Diferencias funcionales.

| Función | Gratis | Particular | Profesional |
| --- | :---: | :---: | :---: |
| Comprobación manual previa | Sí | Sí | Sí |
| Expedientes completos | No | Sí | Sí |
| Catálogo/Modelo 576/minoración | No | Sí | Sí |
| Ruta ITV, fiscal y DGT | Preliminar | Completa | Completa |
| Informe personal PDF | No | Sí | Sí |
| Clientes, márgenes e informe comercial | No | No | Sí |
| CSV profesional | No | No | Sí, con licencia activa |
| Datos previos tras vencer | Gratis | Lectura | Lectura, incluido historial profesional |

No existen demo abierta, Explorer, nivel Founder, desbloqueo por cookie, contador de vehículos, suscripción, upload, OCR, IA, analítica ni funciones “coming soon” presentadas como activas.

## 18. Stripe test mode.

Checkout acepta exclusivamente `sk_test_`, eventos `livemode=false` y seis Price IDs test distintos. El navegador solo solicita nivel/duración y entrega las tres declaraciones contractuales; el servidor decide precio, IVA, crédito, fechas y compra reservada.

La sesión es `payment`, recoge dirección de facturación y Tax ID y habilita `invoice_creation`. La UI previa muestra nivel, duración, base, tasa, IVA, total, moneda, país fiscal y crédito. La configuración reproducible está en `docs/STRIPE_TEST_SETUP.md`.

**PENDING:** validar en Stripe staging que la factura test aplica y muestra realmente el IVA, emisor, NIF, numeración y datos del cliente. `tax_behavior=inclusive` no sustituye por sí solo la revisión de Stripe Tax/Tax Rates ni la revisión fiscal del documento.

## 19. Webhooks.

Solo `/api/stripe/webhook` con firma válida cambia acceso. Se manejan:

- `checkout.session.completed`.
- `checkout.session.async_payment_succeeded`.
- `checkout.session.expired`.
- `charge.refunded`.
- `charge.dispute.created`.

Cada recepción registra ID, tipo, fecha y SHA-256 del payload; valida Test mode, sesión, PaymentIntent, Price, importe y moneda. El procesamiento es idempotente, rechaza eventos desconocidos o desordenados, persiste fallos/reintentos y no activa desde success URL, query string, cookie ni respuesta del navegador.

## 20. Landing.

`/` es pública y explica en el primer bloque qué resuelve MatriculaPro, el CTA Gratis y cómo funciona. Incluye problema, proceso, comprobador, resultado de ejemplo, Modelo 576, tablas, minoración, ruta ITV/fiscal/DGT, Particular/Profesional, precios, fuentes, privacidad, FAQ y CTA final.

Los CTA sin sesión llevan a `/registro?next=/app/comprobar`; una cuenta válida continúa a la herramienta. No hay testimonios, contadores, garantías ni demo inventados. La interfaz conserva identidad de software, animación moderada y diseño mobile-first.

## 21. SEO.

Se añadieron canonical, metadata, Open Graph, Twitter Cards, iconos, manifest, `robots.txt`, sitemap, JSON-LD (`SoftwareApplication`, `WebSite`, `Brand`, `FAQPage`, `Article`, `BreadcrumbList` y `Person` solo con titular real), SSR, 404 y página de error.

`/app/**`, Auth, registro, login, recuperación, callbacks, checkout y cuenta llevan `noindex/nofollow/nocache`. Robots bloquea superficies privadas y APIs. Las páginas legales incompletas quedan noindex y fuera del sitemap; las guías públicas sí aparecen. No se carga Google Fonts ni otro recurso de seguimiento.

## 22. Páginas públicas.

Además de landing, precios, registro/login/recuperación y páginas legales, se crearon diez guías diferenciadas:

1. `/comprobar-documentacion-coche-importado`.
2. `/calcular-modelo-576`.
3. `/tablas-hacienda-vehiculos-2026`.
4. `/minoracion-impuesto-matriculacion`.
5. `/modelo-05-06-576`.
6. `/campo-k-coche-importado`.
7. `/coc-vehiculo-importado`.
8. `/matricular-coche-alemania`.
9. `/coche-nuevo-seis-meses-6000-km`.
10. `/impuesto-matriculacion-co2`.

Cada una resuelve una intención, muestra límites, fuentes oficiales, fecha de revisión, enlaces relacionados, breadcrumbs y CTA al comprobador registrado.

## 23. Páginas legales.

Existen `/legal/aviso-legal`, `/legal/privacidad`, `/legal/cookies`, `/legal/terminos`, `/legal/condiciones-contratacion`, `/legal/aviso-fiscal-tecnico` y `/legal/desistimiento`.

Cubren identidad pendiente, tratamiento de datos y encargados, inventario real de cookies, niveles/duraciones/vencimiento, contratación, precio/IVA/factura, inicio inmediato y desistimiento sin renuncia automática. Todas muestran que MatriculaPro prepara cálculos y rutas, pero no presenta declaraciones ni inspecciona documentos. Continúan como borrador no indexable hasta revisión profesional.

## 24. Cookies reales.

El inventario público contiene únicamente cookies necesarias:

- sesión fragmentada `sb-<project-ref>-auth-token` de Supabase;
- `mpro-recovery-state`, propia, HttpOnly, 15 minutos;
- `mpro-recovery-authorized`, propia, HttpOnly, 10 minutos;
- `__stripe_mid`, solo al entrar en Stripe Checkout;
- `__stripe_sid`, solo durante Checkout.

No existen cookies analíticas/marketing, píxeles ni scripts opcionales, por lo que no se muestra un banner de consentimiento engañoso. `launch:no-tracking` falla si aparecen dominios o inicializadores prohibidos.

## 25. Emails.

Supabase Auth dispone de plantillas para confirmación/reenvío, recuperación y cambio de email. Resend API procesa siete eventos de producto: compra, activación, ampliación, vencimiento próximo, vencimiento, reembolso y solicitud de supresión.

Los emails muestran nivel, duración, fechas y, cuando corresponde, base, IVA, total, moneda, país fiscal, versión contractual centralizada y desistimiento. No incluyen datos del vehículo, resultados fiscales, NIF innecesarios ni afirmaciones de validación oficial.

La outbox no guarda destinatario, contenido, token u OTP; usa referencias internas, clave idempotente, estado, reintentos y hash del ID de Resend. El cron con bearer secreto usa `FOR UPDATE SKIP LOCKED`, backoff y `dead_letter` tras ocho intentos. Entrega SMTP/API real queda pendiente.

## 26. Rate limiting.

Registro, login, recuperación, reenvío, reset, comprobador, catálogo, cálculo 576, checkout y endpoints/exportaciones profesionales usan una abstracción común. Los límites relevantes van desde 3–12 intentos de Auth por ventana hasta 30 comprobaciones/h, 240 búsquedas/h, 120 cálculos/h y 10 checkouts/h; devuelven 429 y `Retry-After`.

Upstash Redis REST es el proveedor distribuido. Desarrollo/test puede usar memoria; un runtime de producción sin proveedor falla cerrado con 503. `env:validate -- --staging` y `--production` exigen URL y token. No existe mensaje ni contador comercial de “usos restantes”.

## 27. Cambios fiscales.

Se conservaron motor decimal, tabla oficial, depreciación, minoración y calculadora. Se completaron cronologías autonómicas versionadas para Andalucía, Asturias, Illes Balears, Cantabria, Cataluña, Murcia y Comunitat Valenciana, con norma, artículo, vigencia, revisión y fuente oficial.

La frontera normativa se fija en 11/07/2021 para los umbrales temporales 144/192/240; el 10/07 conserva 120/160/200 y ambos días emiten advertencia por la discrepancia del rótulo estadístico de AEAT. Las pruebas cubren todas las fechas frontera.

Los textos distinguen “introducido/confirmado por el usuario”, “tabla oficial”, “calculado”, “pendiente de comprobar” y “no comprobado”. Se eliminaron promesas de documento verificado, impuesto definitivo, presentación o garantía de matriculabilidad.

El catálogo de la Orden HAC/1501/2025 contiene 70.886 vehículos y 45 bandas, total 70.931, 0 rechazados, IDs/referencias únicas y hashes reproducibles.

## 28. Territorios soportados.

La automatización histórica cerrada cubre IVA común de Península/Baleares entre 1993 y 2026 e IEDMT de M1 ordinarios con CO₂ confirmado entre 2008 y 2026. Aplica tipos comunes y cronologías propias de Andalucía, Asturias, Illes Balears, Cantabria, Cataluña, Región de Murcia y Comunitat Valenciana.

El tipo actual 2026 está versionado para régimen común y muestra las diferencias publicadas de esas comunidades. La ruta ordinaria separa UE, EEE no UE, terceros países y evidencia específica de Irlanda del Norte. La cobertura exacta y sus fuentes están en `docs/FISCAL_TERRITORIES.md` y `MATRICULAPRO_DOMAIN_AUDIT.md`.

## 29. Territorios bloqueados.

Canarias queda bloqueada en reconstrucción histórica por faltar una serie conjunta completa de IGIC e IEDMT. Ceuta y Melilla quedan bloqueadas porque IEDMT 0 % no permite asumir IPSI histórico 0. Navarra necesita cronología foral y País Vasco series propias por Territorio Histórico.

También se bloquean periodos IEDMT anteriores a 2008 y categorías históricas no automatizadas como motocicletas, quad y vivienda. El modo avanzado permite aportar tipo y fuente, pero marca `special-review`; no presenta esa entrada como fuente verificada. ITP, IVTM, IGIC, IPSI, aranceles y costes externos no se inventan.

## 30. Pruebas añadidas.

- 71 pruebas de dominio de matriculación/fiscalidad general.
- 6 pruebas del comprobador Gratis.
- 33 pruebas de acceso, calendario, precios, eventos y ampliación.
- 6 pruebas de Auth y redirects.
- 5 pruebas de emails.
- 51 pruebas fiscales específicas y 10 cálculos exactos reproducibles.
- 9 comprobaciones HTTP E2E.
- 145 aserciones pgTAP definidas: acceso 102, Storage 7, fiscal 15 y email 21.
- Detectores estáticos de Auth histórico, entitlement manipulable y tracking no autorizado.

Los tests cubren fin de mes, bisiesto, zona horaria, reembolso/revocación, último ciclo pagado, manipulación cliente, evento duplicado/desordenado, día 15, RLS previsto, checkout legal, outbox y bloqueos territoriales.

## 31. Resultado exacto de comandos.

| Comando | Salida/estado final |
| --- | --- |
| `npm install` | PASS, código 0. |
| `npm run env:validate` | PASS, código 0; desarrollo con 19 avisos de variables ausentes. |
| `npm run env:validate -- --staging` | BLOCKED esperado, código 1 interno; 19 variables técnicas ausentes. |
| `npm run env:validate -- --production` | BLOCKED esperado, código 1 interno; 19 variables técnicas ausentes. |
| `npm run legal:validate` | PASS de desarrollo, código 0; 7 datos y revisión pendientes visibles. |
| `npm run legal:validate -- --production` | BLOCKED esperado, código 1 interno; 8 incidencias legales. |
| `npm run auth:doctor` | PASS estático; `AUTH DOCTOR LIVE: PENDING`. |
| `npm run typecheck` | PASS, código 0. |
| `npm run lint` | PASS, código 0 y 0 warnings ESLint. |
| `npm test` | PASS, 121/121: 71 + 6 + 33 + 6 + 5. |
| `npm run test:auth` | PASS, 6/6 y doctor estático. |
| `npm run test:access` | PASS, 33/33. |
| `npm run test:stripe` | PASS, 33/33. |
| `npm run test:email` | PASS, 5/5. |
| `npm run fiscal:validate` | PASS; 70.931 importadas, 70.886 vehículos, 45 bandas, 0 rechazadas. |
| `npm run fiscal:test` | PASS; 51/51 y 10 muestras exactas. |
| `npm run build` | PASS; compilación optimizada y 63 páginas generadas. |
| `npm audit --audit-level=high` | PASS; `found 0 vulnerabilities`. |
| `npm run launch:no-tracking` | PASS; 236 archivos examinados. |
| `npm run test:e2e` | PASS; 9/9 comprobaciones HTTP. |
| `npm run supabase:verify` | Código 0 con estado PENDING por falta de credenciales. |
| `npm run fiscal:verify-database` | Código 0 con estado PENDING por falta de credenciales. |
| `npm run performance:measure` | PASS; métricas registradas en el apartado 35. |
| `git diff --check` | PASS, código 0; sin errores de whitespace, solo avisos informativos LF→CRLF. |

Hashes fiscales: XML `e5e6a496913a7664b8c8d09af86da4a21b6c4d0d63ea725d834e4f5c7f812d26`; normalizado `06f05bd480da16fbc0b2e32027bab6fe661ab4ed0052a4842ae3fd2948e9a038`.

## 32. Resultado Supabase local o staging.

**PENDING, no se declara aprobado.** `supabase`, `docker` y `psql` no existen en PATH; no hay `supabase/.temp/project-ref` ni credenciales de staging. Se intentó obtener la CLI efímera con `npx supabase@latest --version`, pero no pudo inicializar su directorio de configuración por restricciones del entorno. Sin Docker tampoco podía arrancar PostgreSQL local.

Por tanto, `supabase start`, `supabase db reset`, `supabase db push` y `supabase test db` no llegaron a ejecutar una base real. No se tocó producción ni un proyecto remoto. `docs/SUPABASE_SETUP.md` deja los comandos exactos, el orden de migraciones, seed, redirects, cuentas sintéticas y verificación reproducible.

## 33. Resultado pgTAP.

**PASS estático / PENDING de ejecución.** Los cuatro archivos declaran y contienen exactamente:

| Suite | Plan | Aserciones encontradas |
| --- | ---: | ---: |
| Acceso/licencias/RLS | 102 | 102 |
| Retirada de Storage | 7 | 7 |
| Catálogo fiscal | 15 | 15 |
| Outbox de email | 21 | 21 |
| Ciclo de pagos de staging | 44 | 44 |
| **Total** | **189** | **189** |

Las 9 migraciones y 5 suites son UTF-8, tienen delimitadores dollar-quote equilibrados y orden de dependencias coherente. Falta ejecutarlas con PostgreSQL real. No se afirma que RLS/pgTAP haya pasado hasta correr `supabase test db`.

## 34. Resultado E2E.

`npm run test:e2e` pasó 11/11:

- 200: `/`, `/registro`, `/entrar`, `/legal/privacidad`, `/robots.txt`, `/sitemap.xml`.
- 307 esperado: `/app/comprobar` sin sesión.
- 401 esperado: `/api/free-check`, `/api/fiscal/model-576` y `/api/admin/payment-incidents` sin credenciales.
- Texto público de contratación online limitada a dirección fiscal española.

La revisión en navegador comprobó 320 px, 390 px, tablet y escritorio en landing, precios, registro y superficies públicas; no hubo overflow, errores de consola ni bucles. También se verificaron redirects de seguridad. Lectores de pantalla reales y recorridos completos autenticados quedan para staging.

## 35. Rendimiento.

Última medición tras build final:

- Arranque frío: **3.054,709 ms**.
- `/`: 29,328 / 18,029 / 15,858 ms; 121.731 bytes.
- `/registro`: 97,588 / 25,166 / 22,211 ms; 20.553 bytes.
- `/calcular-modelo-576`: 18,097 / 10,387 / 10,566 ms; 66.713 bytes.
- Gate `/app/comprobar`: 4,441 / 2,933 / 2,637 ms; 307 y 52 bytes.
- JavaScript estático: 114 archivos, 1.897.027 bytes raw, 593.243 gzip.
- Seed fiscal SQL: 43.078.556 bytes.
- Búsqueda local del catálogo ya cargado: media 26,759 ms, p95/máximo 32,287 ms.

Producción usa PostgreSQL/RPC; el JSONL de 72 MB no se envía al cliente ni se activa silenciosamente si falla Supabase. Dashboard e informes autenticados deben medirse con cuentas sintéticas en staging.

## 36. Seguridad.

Se aplican CSP-equivalentes y cabeceras de endurecimiento disponibles en Next: `nosniff`, `DENY`, Referrer Policy, Permissions Policy y COOP. Secretos `service_role`, Stripe, Redis, Resend y cron son server-only; no existen claves reales en el repositorio. Solo `.env.example` contiene marcadores.

Autorización y precios se recalculan en servidor/DB. Registro y recuperación usan tokens efímeros, HttpOnly, comparación temporal segura y respuestas neutras. Webhook usa firma y hash de payload. Outbox no persiste contenido ni destinatarios. RLS, grants mínimos, service role backend, rate limiting, noindex, anti-tracking y retirada de uploads reducen superficie.

No hay `input type=file`, `FormData` multipart, SDK OCR/IA, analítica, píxeles ni Google Fonts. Storage histórico queda bloqueado sin borrar datos. Riesgos residuales de infraestructura se enumeran en el apartado 42.

## 37. Variables de entorno.

`.env.example` contiene 33 variables:

- Entorno/origen: `MATRICULAPRO_DEPLOY_TARGET`, `NEXT_PUBLIC_SITE_URL`, `APP_BASE_URL`.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Legal: `LEGAL_OWNER_FULL_NAME`, `LEGAL_OWNER_NIF`, `LEGAL_TRADE_NAME`, `LEGAL_OWNER_ADDRESS`, `LEGAL_CONTACT_EMAIL`, `LEGAL_PRIVACY_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `LEGAL_REVIEW_COMPLETED`.
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, seis `STRIPE_PRICE_*` y dos `STRIPE_COUPON_*` opcionales.
- Incidencias de pago: `PAYMENT_INCIDENT_ADMIN_SECRET`, `PAYMENT_INCIDENT_ALERT_WEBHOOK_URL`, `PAYMENT_INCIDENT_ALERT_EMAIL`.
- Antiabuso: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Email: `RESEND_API_KEY`, `EMAIL_FROM`, `TRANSACTIONAL_EMAIL_CRON_SECRET`, `TRANSACTIONAL_EMAIL_BATCH_SIZE`.

Staging exige 19 variables técnicas en `env:validate`; producción añade los datos/revisión legales mediante `legal:validate`. Los cupones son opcionales hasta habilitar ampliaciones, y batch size tiene valor por defecto. `DATABASE_URL` es solo una variable efímera de shell para importar el seed, no configuración del cliente.

## 38. Pasos manuales de Supabase.

1. Crear proyecto separado de staging con email/contraseña, confirmación y sin usuario anónimo.
2. Copiar URL, anon/publishable y `service_role` al gestor de secretos correcto.
3. Configurar Site URL exacta y allowlist `/auth/callback` para local, staging y producción.
4. Configurar SMTP de Resend y plantillas Auth.
5. Instalar Docker y Supabase CLI; ejecutar `supabase start`, `supabase db reset`, `supabase status`, `supabase test db` en local.
6. Enlazar solo staging: `supabase login`, `supabase link`, `supabase migration list`, `supabase db push --dry-run`, `supabase db push`.
7. Importar `supabase/seed/fiscal_catalog_2026.sql` con `psql "$DATABASE_URL" -v ON_ERROR_STOP=1`.
8. Confirmar 70.886 vehículos, 45 bandas y 70.931 totales, índices y RPC.
9. Ejecutar las 189 aserciones pgTAP, aislamiento RLS, registro autorizado, Storage retirado, ciclo de pagos y outbox service-only.
10. Ejecutar `supabase:verify`, `fiscal:verify-database` y flujos Auth con cuentas sintéticas; eliminarlas después.
11. Documentar backup, rollback y resultado exacto antes de producción.

## 39. Pasos manuales de Resend.

1. Elegir dominio/subdominio real y crear cuenta del titular.
2. Publicar SPF/DKIM, introducir DMARC progresivamente y esperar `Verified`.
3. Crear una API key restringida al dominio; configurar `RESEND_API_KEY`, `EMAIL_FROM`, soporte, cron y batch.
4. Configurar Supabase Custom SMTP: `smtp.resend.com`, puerto 587 STARTTLS, usuario `resend`, password API key y remitente verificado.
5. Copiar plantillas Confirm signup, Reset password y Change email; el reenvío reutiliza Confirm signup.
6. Desactivar tracking de clics y aperturas en SMTP y API.
7. Aplicar migración 008 y programar GET/POST `/api/cron/transactional-email` con bearer secreto, nunca en query.
8. Probar Auth, compra, duplicados, ampliación, vencimientos, reembolso, supresión, SPF/DKIM/DMARC y entrega en varios proveedores.

## 40. Pasos manuales de Stripe.

1. Trabajar solo en Test mode y crear seis Prices EUR de pago único: 7900, 17900, 27900, 12900, 29900 y 44900 céntimos.
2. Marcar precios como IVA incluido y guardar seis IDs distintos en `STRIPE_PRICE_*`.
3. Configurar `sk_test_…`, `APP_BASE_URL` y el webhook `https://<staging>/api/stripe/webhook`.
4. Suscribir los ocho eventos documentados: Checkout completado/asíncrono/expirado, `charge.refunded`, `refund.updated` y disputa created/updated/closed; guardar `whsec_…`.
5. Para ampliación, crear Coupons test `duration=once`: 7900 céntimos Particular y 12900 Profesional.
6. Validar checkout, firma, reintentos, duplicados, importe/moneda/Price alterados, expiración, reembolso, disputa y orden de eventos.
7. Revisar factura test: base, IVA, total, emisor, NIF, numeración, Tax ID, dirección y email contractual.
8. Mantener claves y objetos live fuera del entorno hasta autorización expresa y nueva revisión.

## 41. Datos legales que debe introducir el propietario.

El propietario debe aportar, sin inventar:

- nombre y apellidos legales completos;
- NIF/NIE correcto;
- `IvanImports` como nombre comercial;
- domicilio legal/contractual completo;
- email general, privacidad y soporte reales;
- dominio y remitente verificados;
- datos del emisor de factura y canal de atención;
- decisión revisada sobre jurisdicción, desistimiento, conservación y encargados;
- aprobación profesional de las siete páginas legales y checkout;
- `LEGAL_REVIEW_COMPLETED=true` solo después de esa aprobación.

## 42. Riesgos pendientes.

1. **Bloqueante:** faltan las 19 variables técnicas de staging y los 8 puntos legales; no existe un staging conectado.
2. **Bloqueante para afirmar RLS/DB:** migraciones, seed, RPC y 145 pgTAP no se han ejecutado contra PostgreSQL real.
3. **Bloqueante para Auth/email:** no se han probado Supabase Auth, SMTP, Resend API, cron ni entrega con dominio real.
4. **Bloqueante para pagos:** Stripe sigue en Test mode sin Prices, Coupons, webhook ni facturas validados externamente.
5. La factura requiere confirmar Stripe Tax/Tax Rates, IVA, emisor, NIF y numeración; `invoice_creation` no basta.
6. Upstash debe configurarse y probarse bajo carga. El proxy debe sanear/sobrescribir `x-forwarded-for` de forma fiable.
7. La QA autenticada, teclado completo y lectores de pantalla reales debe repetirse con cuentas Gratis/Particular/Profesional/vencida.
8. El catálogo y tipos fiscales requieren revisión anual o ante cambio normativo; casos especiales siguen deliberadamente bloqueados.
9. Hardening P2 no bloqueante: ampliar pgTAP de aislamiento profesional y validaciones nulas en RPC internas service-only.
10. La retirada física del bucket histórico requiere inventario, backup y autorización separada; no se borró ningún objeto.

## 43. Confirmación de que no hubo commit, push ni despliegue.

Confirmado: no se ejecutó commit, push, pull request ni despliegue. La rama sigue siendo `main` y `HEAD` continúa en `e6b22bd90e23f1cb1b907d12c11a92e2b577989e` (`reposition matriculapro as guided tool`). Los cambios permanecen únicamente en el worktree local y en el ZIP de entrega. No se modificó el historial Git ni se conectó producción.

## 44. Auditoría previa de cierre técnico y seguridad de staging

Esta sección registra la auditoría realizada **antes de modificar** checkout, webhooks, middleware, acceso o SQL. Las nueve correcciones quedaron implementadas; su validación local está cerrada y la validación conectada se reserva al staging real descrito en la sección 45.

| Problema observado | Riesgo real | Archivos y superficies afectadas | Solución aplicada | Pruebas exigidas | Resultado final |
| --- | --- | --- | --- | --- | --- |
| `charge.refunded` trataba cualquier importe reembolsado como reembolso total. | Un reembolso parcial revocaba indebidamente toda la licencia y perdía el saldo reembolsable. | `src/server/payments/stripe-webhook.ts`, `src/server/payments/access-payment-repository.ts`, migración 006. | Modelo acumulativo con importe pagado/reembolsado/restante, estado parcial/total, orden temporal e inconsistencias registradas. | Parcial, acumulados, total, duplicado, evento antiguo, importe superior al pagado y ampliación. | **Corregido y cubierto por unitarias + pgTAP; pgTAP real pendiente de staging.** |
| Las disputas se procesaban como reembolso y solo se escuchaba `charge.dispute.created`. | Se confundían estados abiertos, ganados y perdidos; no existía restauración ni trazabilidad. | Webhook Stripe, SQL de pagos y configuración documental del endpoint. | Ciclo propio `warning/open/won/lost`, suspensión reversible, política de cierre e incidente auditable. | Created/updated/closed, won/lost, duplicados y eventos fuera de orden. | **Corregido y cubierto por unitarias + pgTAP; Stripe test real pendiente.** |
| Los redirects y respuestas API del middleware creaban un `NextResponse` nuevo sin copiar las cookies que Supabase acababa de refrescar. | Sesiones intermitentes, bucles de login y pérdida de renovación de token. | `src/middleware.ts`, `src/lib/supabase/middleware.ts`. | Helper central para clonar cookies completas y cabeceras privadas en redirect/JSON. | Usuario anónimo, autenticado, token refrescado, área protegida y API protegida. | **Corregido; helper validado con dos cookies, atributos, redirect, JSON y cabeceras seguras.** |
| La compra normal se bloqueaba mientras hubiera licencia activa; no existía renovación en los últimos 30 días ni periodo futuro. | El usuario no podía renovar a tiempo o podía provocar solapamientos mediante carreras. | Checkout, dominio de acceso, repositorio SQL, selector de planes y `user_licenses`. | Compra `renewal`, ventana exacta, mismo plan/precio completo, periodo `scheduled` y exclusión anti-solapamiento en BD. | Fuera/dentro del día 30, borde exacto, un segundo antes, expirada, duplicada y dos intentos concurrentes. | **Corregido; bordes y calendario pasan 46/46 pruebas de acceso; constraint pendiente de ejecutar en PostgreSQL real.** |
| Cada checkout usaba `customer_creation: always`; no había relación persistente usuario–Customer. | Duplicación de Customers, historial fiscal fragmentado y carreras en checkout. | `src/server/payments/create-checkout.ts`, tipos Stripe, base de datos. | `billing_customers` service-owned, idempotencia Stripe, actualización de email y reutilización segura. | Primer checkout, segundo, email cambiado y dos simultáneos. | **Corregido en servidor/SQL; verificación con Customer real pendiente de Stripe test.** |
| Checkout recogía dirección pero no validaba que país fiscal/facturación fuera España. | Cobro fiscalmente no soportado y posible acceso concedido a una jurisdicción no admitida. | Schema checkout, creación de sesión, snapshot webhook y SQL de activación. | Restricción `ES` donde Stripe lo permite y validación final server-side antes de activar. | País ausente, distinto de ES, cliente inesperado y camino válido ES. | **Corregido en validadores y activación; texto público/E2E verificados, Checkout real pendiente.** |
| `ModuleGate` tenía un valor permisivo por defecto y las capacidades mezclaban lectura histórica con operaciones de pago activas. | Una licencia vencida podía alcanzar simuladores, edición, exportación o herramientas profesionales. | `src/lib/access/*`, `AccessProvider`, `ModuleGate`, páginas y APIs protegidas. | Matriz explícita de nueve capacidades, sin defaults permisivos, con lectura histórica separada. | Matriz gratis/activa/scheduled/vencida/suspendida/reembolsada/revocada en UI y servidor. | **Corregido; `requiredCapability` es obligatorio y las pruebas de acceso pasan 46/46.** |
| Un pago verificado podía quedar `ignored` si la activación fallaba por precio, importe, país, solapamiento u otra incoherencia. | El cliente pagaba sin licencia y sin alerta operativa ni recuperación segura. | Webhook, RPC de activación, cuenta de usuario y operación administrativa. | `payment_incidents`, alerta estructurada, mensaje “No vuelvas a pagar”, consulta/reintento/resolución idempotentes. | Pago correcto sin activación, retry, refund/resolve, duplicado y concurrencia. | **Corregido; endpoint no autenticado devuelve 401 y el flujo conectado queda pendiente de staging.** |
| Las garantías de idempotencia eran parciales y no cubrían Customer, renovación futura, refund acumulativo o recuperación de incidentes. | Doble periodo, doble efecto contable o estados divergentes bajo reintentos. | Stripe idempotency keys, constraints/locks SQL, `payment_events` y nuevas tablas. | Claves estables, advisory locks por usuario/compra, constraints únicos/exclusión y handlers terminales. | Webhook repetido, dos checkouts, dos renovaciones y dos reintentos concurrentes. | **Corregido; se unificó el orden usuario→compra y la BD define exclusión/índices; carga real pendiente.** |

## 45. Informe final del cierre técnico y seguridad para staging

Esta sección sustituye las cifras de validación de fases anteriores cuando difieran. Fecha de cierre local: **2026-08-05**.

### 1. Resumen ejecutivo

Quedaron implementados los diez bloques solicitados: reembolso acumulativo parcial/total, disputas independientes, cookies SSR preservadas, renovación manual en los últimos 30 días, Customer Stripe persistente, contratación automática limitada a España, capacidades explícitas al vencer, incidencias de pago recuperables, garantías de concurrencia/idempotencia y documentación/pruebas reproducibles. El código local compila, pasa lint, build, 134 pruebas Node, 46 pruebas específicas de acceso/pagos, 11 comprobaciones E2E HTTP y auditoría npm sin vulnerabilidades. La ejecución conectada de Supabase, pgTAP y Stripe no se realizó porque no hay CLI, Docker, proyecto ni credenciales de staging disponibles.

### 2. Archivos modificados

Superficies modificadas en esta fase:

- configuración e inventario: `README.md`, `.env.example`, `package.json`, `package-lock.json` y este informe;
- acceso: `src/domain/access/types.ts`, `authorization.ts`, `payment-events.ts`, `index.ts`, `src/providers/AccessProvider.tsx`, `src/server/access/current-access.ts` y `src/components/access/ModuleGate.tsx`;
- consumidores de acceso: biblioteca, casos, checklists, ficha, recorrido, ruta, simulador, plantillas, expedientes y APIs fiscal/profesional;
- pagos/UI: `src/server/payments/create-checkout.ts`, `access-payment-repository.ts`, `stripe-webhook.ts`, `index.ts`, checkout API, `PlanSelector.tsx`, cuenta y precios de landing;
- middleware: `src/middleware.ts`;
- pruebas/documentación existentes: suites de acceso, `docs/STRIPE_TEST_SETUP.md` y `docs/STAGING_RUNBOOK.md`.

### 3. Archivos nuevos

- Dominio: `src/domain/access/refunds.ts`, `renewal.ts` y sus pruebas.
- SSR: `src/lib/supabase/response.ts`.
- Pagos: `src/server/payments/billing-customer.ts`, `incident-admin.ts`, `payment-incident-alert.ts`.
- Administración: `src/app/api/admin/payment-incidents/route.ts`.
- SQL/pruebas: migración `202608050009_staging_payment_lifecycle.sql` y `supabase/tests/staging_payment_lifecycle.sql`.
- E2E: `scripts/e2e/middleware-cookies.ts` y `scripts/e2e/staging-lifecycle.ts`.
- Operación: `docs/ACCESS_MATRIX.md`, `LICENSE_LIFECYCLE.md`, `PAYMENT_INCIDENTS.md`, `STRIPE_TESTING.md` y `STAGING_RUNBOOK.md`.

### 4. Migraciones

Se añadió únicamente `supabase/migrations/202608050009_staging_payment_lifecycle.sql`; no se editaron las migraciones 001–008. Añade estados `scheduled`/`suspended`, exclusión GiST de periodos pagados solapados, campos acumulativos de refund/disputa/Customer, `billing_customers`, `payment_incidents`, auditoría inmutable y RPC service-only de reserva, activación, refund, disputa y resolución. El vínculo `purchase_kind` se comprueba de nuevo mediante constraint trigger diferido al final de la transacción.

### 5. Error de reembolsos corregido

El webhook ya no revoca por `amount_refunded > 0`. Recupera el Charge de Stripe, usa `charge.amount_refunded` acumulado y solo considera total cuando alcanza el importe realmente pagado. Eventos antiguos o importes no crecientes son no-op idempotentes; exceso, moneda o compra incoherente abren incidencia.

### 6. Modelo de reembolsos

La compra persiste bruto/pagado/reembolsado/restante, `not_refunded | partially_refunded | fully_refunded`, marca temporal y orden de evento. Un parcial mantiene periodo y vencimiento, genera auditoría/incidencia y no devuelve tiempo proporcional. El total bloquea escrituras, conserva histórico empezado en lectura e invalida/revoca la ampliación consumida vinculada.

### 7. Tratamiento de disputas

`warning`, `open`, `won` y `lost` son independientes del refund. `open` suspende escrituras, `won` restaura `active`, `scheduled` o `expired` según el reloj, y `lost` revoca sin borrar datos. Se procesan created/updated/closed con orden temporal e incidencia para estados revisables.

### 8. Corrección de cookies SSR

`withSupabaseCookies`, `redirectWithSupabaseCookies` y `jsonWithSupabaseCookies` copian cada cookie completa —incluidos path, expiry, HttpOnly, Secure y SameSite—, solo cabeceras permitidas y caché privada/no-store. Middleware usa el helper en redirects de entrada autenticada, redirección protegida y 401 de API. La respuesta normal conserva directamente las cookies escritas por Supabase.

### 9. Renovación anticipada

La ventana es inclusiva desde exactamente `expiresAt - 30 días`. Mantiene nivel, admite 1/6/12 meses, no aplica crédito y programa el periodo al final exacto del actual. Tras vencimiento comienza en la activación. La autorización interpreta `scheduled` como activa lógicamente solo cuando `startsAt <= now`, sin cron diario.

### 10. Casos de fecha probados

Se probaron: borde exacto de 30 días, un segundo anterior, último día, 31 de enero, febrero, 29 de febrero, 1/6/12 meses, instante absoluto con offset Europe/Madrid/cambio horario, vencimiento exacto, inicio lógico exacto y renovación reembolsada antes de empezar. La ampliación conserva su frontera independiente de 15 días y fecha original.

### 11. Persistencia de clientes Stripe

`billing_customers` impone un Customer único por usuario y escritura exclusiva de servidor. Checkout busca/reutiliza, actualiza email, reemplaza Customer borrado y crea con clave idempotente estable. No acepta Customer del navegador ni usa `customer_creation: always`; el webhook compara Customer esperado antes de activar.

### 12. Restricción fiscal a España

Checkout exige `countryCode=ES`, recoge dirección de facturación y Tax ID, usa Prices EUR one-time con impuesto inclusivo y persiste base/IVA/total/país fiscal. El webhook requiere país final `ES`; ausente o distinto crea incidencia y no activa. La landing muestra: “Contratación online disponible inicialmente para clientes con dirección fiscal en España.” No se implementó fiscalidad internacional ni exención automática por NIF-IVA.

### 13. Matriz de acceso vencido

Las nueve capacidades son explícitas. Gratis conserva comprobador y superficies públicas/cuenta. Activo permite operaciones de su nivel. Vencido, suspendido, reembolsado o revocado ya empezado conserva únicamente histórico pagado en lectura. Se bloquean crear/editar/recalcular, simuladores avanzados, informes/exportaciones y herramientas profesionales. `ModuleGate.requiredCapability` es obligatorio; servidor y RLS siguen siendo la barrera real.

### 14. Incidencias de pago

`payment_incidents` registra de forma idempotente evento, compra, sesión, PaymentIntent, Customer, clase, detalle seguro y estado. Existe auditoría inmutable, consulta administrativa protegida, mensaje de cuenta “Hemos recibido el pago… No vuelvas a pagar” y alerta por log estructurado más webhook interno o email configurable.

### 15. Estrategia de reintento

El endpoint administrativo usa bearer de al menos 32 caracteres y comparación temporal segura. `retry` vuelve a recuperar la Checkout Session desde Stripe, valida firma lógica completa contra la compra, crea un evento administrativo único y reutiliza la transición atómica. También permite marcar reembolsado, resuelto o ignorado con motivo; un fallo vuelve a `open` y queda auditado.

### 16. Idempotencia

Se usan claves estables para Customer y Checkout, unicidad de evento Stripe y compra/idempotency key, compra pendiente única por usuario, renovación pendiente única por origen, refund acumulativo monotónico, orden temporal de disputas e incidentes únicos por evento/clase. Un evento repetido no duplica licencias ni efectos contables.

### 17. Concurrencia

La reserva bloquea por usuario y reutiliza un pending equivalente entre pestañas. Activación usa el mismo orden de locks **usuario → compra**, evitando inversión y deadlock. Reservar compra/ampliación con un periodo futuro ya pagado falla antes de cobrar. PostgreSQL excluye rangos `active/scheduled` solapados con intervalos `[startsAt, expiresAt)` y admite adyacencia exacta.

### 18. RLS

`billing_customers` permite al autenticado leer solo su fila y no escribir; `payment_incidents` y eventos no son visibles ni resolubles desde cliente. Los RPC críticos se revocan de `public/anon/authenticated` y se conceden a `service_role`; `get_my_payment_activation_status` solo devuelve la compra de `auth.uid()`. Las políticas existentes siguen aislando compras, licencias y expedientes.

### 19. pgTAP

Hay **189 aserciones declaradas** en cinco suites: acceso/licencias 102, Storage 7, catálogo fiscal 15, ciclo de pagos staging 44 y outbox 21. La suite nueva cubre grants/RLS, Customer ajeno, no escritura/no resolución cliente, periodo futuro, exclusión/adyacencia, segundo checkout incompatible, refund de 1 €, 50 %, parcial/total de la compra inicial y de la ampliación, total, antiguo, exceso, moneda/compra inválidas, disputa open/won/lost y resolución. No se ejecutaron: `supabase`, Docker y `psql` no están instalados.

### 20. E2E

`npm run test:e2e` pasó **11/11** contra Next local: landing/texto España, registro, login, privacidad, robots, sitemap, redirect protegido y 401 de APIs/administración. La revisión visual mediante el navegador de la aplicación confirmó la landing y el redirect `/app/cuenta → /entrar?next=…`; esta comprobación visual complementó, pero no sustituyó, las pruebas HTTP. `test:e2e:staging` quedó correctamente bloqueado por falta de `STAGING_BASE_URL`; no se probaron sesión, Customer ni pagos reales.

### 21. Resultado exacto de cada comando

| Comando | Salida final |
| --- | --- |
| `npm install` | Exit 0; `up to date in 2s`. |
| `npm run env:validate` | Exit 0; `DEVELOPMENT_WITH_WARNINGS`, 22 variables no configuradas. |
| `npm run env:validate -- --staging` | Exit 1 esperado; `INVALID (21 errores)` por ausencia de configuración real. |
| `npm run legal:validate` | Exit 0 en desarrollo; `INCOMPLETE`, 8 datos/revisión pendientes. |
| `npm run legal:validate -- --production` | Exit 1 esperado; `BLOCKED`. |
| `npm run auth:doctor` | Exit 0; estático OK, login real `PENDING` por variables Supabase ausentes. |
| `npm run typecheck` | Exit 0. |
| `npm run lint` | Exit 0, cero warnings. |
| `npm test` | Exit 0; 134 pruebas Node pasadas + helper de cookies válido. |
| `npm run test:access` | Exit 0; 46/46. |
| `npm run test:stripe` | Exit 0; 46/46 pruebas locales de dominio, alias de `test:access`. |
| `npm run test:middleware` | Exit 0; 2 cookies, atributos, redirect, JSON y cabeceras seguras. |
| `npm run fiscal:validate` | Exit 0; 70.931 filas, 70.886 vehículos, 45 bandas, 0 rechazadas, hashes válidos. |
| `npm run fiscal:test` | Exit 0; 51/51 + 10 cálculos exactos. |
| `npm run build` | Exit 0; compilación correcta y 63 páginas estáticas generadas. |
| `npm audit --audit-level=high` | Exit 0 en consulta autorizada al registro npm; `found 0 vulnerabilities`. |
| `npm run test:e2e` | Exit 0; 11/11 comprobaciones HTTP. |
| `npm run test:e2e:staging` | Exit 1 esperado; falta `STAGING_BASE_URL`. |
| `git diff --check` | Exit 0; sin errores de whitespace. |

### 22. Resultado Supabase local o staging

**No ejecutado y no declarado como aprobado.** `supabase=NOT_FOUND`, `docker=NOT_FOUND` y `psql=NOT_FOUND`; por tanto no se corrieron `supabase start`, `supabase db reset`, `supabase test db`, migración 009, RLS real ni las 189 aserciones. La migración recibió revisión estática: 13 aperturas/cierres dollar-quote equilibrados y TypeScript/contratos coherentes.

### 23. Resultado Stripe test

**No ejecutado y no declarado como aprobado.** `stripe=NOT_FOUND` y faltan `sk_test_`, Prices, Coupons y `whsec_`. No se usaron claves live. Los validadores, handlers y fixtures locales pasan; Customer real, Checkout, webhook firmado, refund y disputa deben repetirse en el proyecto Stripe test de staging.

### 24. Variables nuevas

- `PAYMENT_INCIDENT_ADMIN_SECRET`: bearer aleatorio server-only, mínimo 32 caracteres.
- `PAYMENT_INCIDENT_ALERT_WEBHOOK_URL`: canal interno HTTPS opcional.
- `PAYMENT_INCIDENT_ALERT_EMAIL`: destinatario operativo opcional; staging/producción exige este o webhook.

### 25. Pasos manuales restantes

1. Completar los 21 requisitos técnicos de `env:validate -- --staging` y los ocho legales, manteniendo Stripe test.
2. Crear Supabase staging, aplicar 001–009 + seed fiscal, ejecutar `supabase test db` y registrar las 189 salidas.
3. Configurar Auth/SMTP Resend, URL/redirects, Upstash y al menos un canal de incidencia.
4. Crear/revisar seis Prices tax-inclusive y dos Coupons test, webhook de ocho eventos y factura test.
5. Ejecutar `stripe listen`, refund parcial/total, disputa, Customer reutilizado, doble pestaña y retry administrativo.
6. Ejecutar `STAGING_BASE_URL=… npm run test:e2e:staging` con cuentas sintéticas/cookie temporal; no usar clientes reales.

### 26. Riesgos pendientes

- Bloqueante para afirmar staging: la migración/RLS/pgTAP no han tocado PostgreSQL real.
- Bloqueante para pagos: no se validaron objetos Stripe, firma, dirección española, Customer, alertas ni refund/disputa reales.
- Bloqueante para producción: faltan configuración técnica, identidad legal y revisión profesional; los validadores bloquean.
- La alerta por webhook/email usa `Promise.allSettled`; debe comprobarse recepción y monitorización en infraestructura.
- Las pruebas locales modelan carreras con locks/constraints, pero la carga concurrente real debe ejecutarse en staging.

### 27. Confirmación de ausencia de commit, push y despliegue

Confirmado. No se ejecutó commit, push, pull request ni despliegue. Rama `main`; `HEAD` sigue exactamente en `e6b22bd90e23f1cb1b907d12c11a92e2b577989e`. Los cambios permanecen en el worktree local y en el ZIP de entrega; no se conectó producción.

## 46. Cierre final de IVA, reembolso de ampliación y fechas de renovación

Auditoría registrada **antes de modificar esta fase**:

| Estado anterior | Problema detectado | Riesgo comercial o fiscal | Archivos afectados | Solución que se implementará | Pruebas que se añadirán | Resultado previo |
| --- | --- | --- | --- | --- | --- | --- |
| Los seis Prices se validaban como EUR, one-time e `inclusive`; Checkout generaba factura, pero la línea no aplicaba una Tax Rate manual y el webhook no contrastaba su desglose. | `tax_behavior=inclusive` por sí solo no prueba que Stripe haya aplicado IVA español del 21 %. | Factura sin cuota fiscal real o activación pese a una divergencia entre Stripe y el catálogo interno. | `.env.example`, validador de entorno, configuración/doctor Stripe, checkout, webhook, repositorio de pagos y compras SQL. | Tax Rate test única configurada por servidor, aplicada a la línea, verificación de tasa/desglose/factura y persistencia fiscal atómica. | Seis precios, tasa inválida/live/10 %/exclusive, país, moneda, factura, desglose, duplicado y retry. | **Confirmado; corrección pendiente.** |
| El refund total de la compra de ampliación marcaba la licencia ampliada como reembolsada e invalidaba la elegibilidad, pero no restauraba el periodo original aún pagado. | Se perdía el tiempo restante de la compra inicial de un mes. | El usuario podía quedar sin acceso pese a conservar un pago válido de 79 € o 129 €. | Migraciones 006/009, `upgrade_eligibility`, `purchases`, `user_licenses`, RPC de refund y pgTAP. | Relación explícita, estado de restauración, locks, restauración de la fila original hasta su vencimiento original y reglas para original vencida/reembolsada. | Particular/Profesional, 6/12 meses, parcial/total, vencida, original parcial/total, duplicado, orden y concurrencia. | **Confirmado; corrección pendiente.** |
| Dominio, SQL y `PlanSelector` restaban 720 horas (`30 * 24h` o `interval '30 days'`). | La frontera comercial no conservaba la hora de pared al cruzar DST. | Renovación abierta una hora antes o después de lo anunciado en Europe/Madrid y discrepancia cliente/servidor. | `renewal.ts`, `PlanSelector.tsx`, checkout y nueva función SQL de frontera. | Centralizar Europe/Madrid con Luxon, compartir la frontera calculada y persistir/validar el instante enviado por servidor. | Bordes ±1 ms, marzo/octubre DST, fin de mes, bisiesto, medianoche, servidor UTC, navegador en otra zona y licencia programada. | **Confirmado; corrección pendiente.** |

### Resultado final del cierre

| Bloque | Solución implementada | Pruebas añadidas | Resultado final |
| --- | --- | --- | --- |
| IVA Stripe | `STRIPE_TAX_RATE_ES_IVA_21` server-only, doctor de objetos test, Tax Rate manual por línea, Invoice de pago único y validación/persistencia atómica de tasa, país, base, IVA, total e invoice. | Tasa válida/inactiva/10 %/exclusive/live/país, seis precios, moneda, redondeo, invoice ausente/divergente, duplicado y retry. | **Implementado. Validación local aprobada; comprobación remota Stripe Test pendiente de credenciales.** |
| Refund de ampliación | `upgrade_relationships`, locks por usuario/compra, estados explícitos y restauración de la misma licencia original solo mientras conserva pago y tiempo. Refund original tras crédito crea incidencia con neto/precio/déficit sin mutación automática. | Particular 79→179, Profesional 129→299/449, parcial, acumulado total, original vigente/vencida/reembolsada, idempotencia, RLS y auditoría. | **Implementado. Dominio aprobado y 51 aserciones pgTAP preparadas; ejecución PostgreSQL pendiente de CLI/Docker.** |
| Renovación | Luxon y `LICENSE_BUSINESS_TIME_ZONE=Europe/Madrid`; resta de 30 días civiles con hora de pared compartida por servidor/UI y función SQL equivalente. | Borde ±1 ms, fin de ventana, enero/marzo/octubre, DST verano/invierno, bisiesto, medianoche, 23:59:59, vencida y programada. | **Implementado y aprobado en pruebas locales.** |

## 47. Protección ante reembolsos y disputas anteriores a la activación

Auditoría registrada **antes de modificar esta fase**:

| Estado anterior | Problema detectado | Riesgo | Archivos afectados | Solución prevista | Pruebas previstas | Resultado previo |
| --- | --- | --- | --- | --- | --- | --- |
| El webhook recuperaba Charge/PaymentIntent y trataba de localizar la compra, pero un reembolso sin compra conciliable terminaba como `refund_inconsistency` + evento ignorado. | El hecho económico no quedaba en una cola durable que la activación posterior consultase. | Un `checkout.session.completed` tardío podía activar una licencia ya reembolsada. | Webhook Stripe, repositorio, migración nueva y estado de cuenta. | Persistir primero una reversión verificada, emparejar solo con identificadores fuertes y consumirla bajo lock antes de activar. | Refund completo/parcial antes y después del pago, duplicados, identidad y ambigüedad. | **Confirmado; corrección pendiente.** |
| Una disputa desconocida terminaba como `dispute_review` + evento ignorado. | `open`/`lost` no bloqueaban de forma transaccional una activación posterior y `won` no tenía recuperación automática segura. | Acceso indebidamente activo durante una disputa o cuenta atascada tras ganarla. | Webhook, máquina de estados SQL, conciliador y mensajes. | Cola de reversiones con orden temporal; `open/lost` bloquean, `warning` conserva la política actual y `won` permite activar solo con pago fiscal ya verificado. | Disputa open/warning/lost/won, llegada fuera de orden y carreras. | **Confirmado; corrección pendiente.** |
| Los errores de asociación se registraban como incidencias, pero el evento podía responder 200 sin conservar los datos mínimos de la reversión. | Stripe no volvería a entregar un evento aceptado y la recuperación dependía de investigación manual. | Pérdida operativa silenciosa. | Recepción de eventos, RLS/grants y herramienta administrativa. | Responder 200 únicamente tras persistencia durable; fallo transitorio de almacenamiento produce 500/retry. Añadir `payments:reconcile -- --dry-run`. | Persistencia fallida, reintento, RLS y dry-run sin mutación. | **Confirmado; corrección pendiente.** |

### Resultado de la protección

- **Comportamiento anterior y causa:** refund/dispute podía llegar cuando `stripe_payment_intent_id` y `amount_paid_cents` aún no estaban enlazados. El RPC rechazaba esa reversión y el handler la convertía en incidencia ignorada con HTTP 200; la activación posterior no tenía una fuente durable que consultar.
- **Riesgo eliminado:** una licencia ya no puede quedar `active/scheduled` si su compra está totalmente reembolsada, disputada `open/lost` o marcada como revertida. Dos constraint triggers diferidos validan la compatibilidad al commit, además de los RPC y locks.
- **Solución:** `pending_payment_reversals` conserva Event ID, PaymentIntent, Charge, Session, Invoice, Customer auxiliar, importes/moneda o disputa y estado de procesamiento. El webhook persiste antes de resolver la compra; un fallo de persistencia sigue propagándose como 500/retry.
- **Migración:** `202608060011_payment_reversal_ordering.sql`, aditiva y consecutiva. No se modificaron 001–010. Añade índices, unicidad, RLS/grants mínimos, guardas diferidas y RPC de almacenamiento, activación protegida, marcado y disputa ganada.
- **Enlace y concurrencia:** prioridad PaymentIntent → Charge → Checkout Session → Invoice → Purchase validada. Customer nunca decide. Compra y reversiones se bloquean y ordenan por `occurred_at, stripe_event_id`; duplicados usan unicidad e identidad de payload.
- **Reglas:** refund total no crea licencia y resuelve su incidencia informativa; parcial activa con estado/importe/incidencia; disputa `open/lost` no crea licencia; `warning` mantiene política; `won` activa una sola vez únicamente con evidencia fiscal previa y sin otro bloqueo.
- **Pruebas:** 22 unitarias específicas, fixtures E2E con firma Stripe para refund/dispute/checkout y 45 aserciones pgTAP transaccionales. El total declarado queda en 285 aserciones pgTAP. La suite SQL está preparada pero no ejecutada por ausencia de Supabase CLI, Docker y `psql`.
- **Resultado:** TypeScript, lint, regresión Node, fiscal, build, E2E local, conciliador dry-run y audit npm aprobados. Stripe Test remoto, PostgreSQL real y staging autenticado siguen pendientes de credenciales/herramientas; no se declaran aprobados.
