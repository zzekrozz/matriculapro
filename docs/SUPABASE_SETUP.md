# Configuración reproducible de Supabase para MatriculaPro

Estado del documento: preparado para staging. No ejecutar primero contra producción.

Documentación oficial de referencia: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [URL y redirecciones](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP personalizado](https://supabase.com/docs/guides/auth/auth-smtp) y [CLI local](https://supabase.com/docs/guides/local-development/cli/getting-started).

## 1. Crear los entornos

1. Crea un proyecto separado para **staging** en Supabase. No reutilices producción para pruebas.
2. Conserva la región elegida, el identificador del proyecto y el responsable que tiene acceso al panel.
3. Activa únicamente autenticación por email y contraseña. No habilites inicio anónimo, proveedores sociales ni magic links como acceso principal.
4. Mantén confirmación de email activada.
5. Crea producción solo después de que migraciones, RLS, Auth, correo y pagos hayan pasado en local o staging.

## 2. Obtener URL y claves

En **Project settings → API** copia:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-o-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Reglas:

- `NEXT_PUBLIC_SUPABASE_URL` y la clave anónima pueden llegar al navegador; RLS sigue siendo obligatorio.
- `SUPABASE_SERVICE_ROLE_KEY` es un secreto de servidor. Nunca debe llevar prefijo `NEXT_PUBLIC_`, aparecer en logs, componentes cliente, capturas o repositorio.
- Usa valores distintos para local, preview, staging y producción.
- Rota cualquier clave que haya sido compartida fuera del gestor de secretos.

## 3. URL principal y redirecciones

En **Authentication → URL Configuration**:

- **Site URL local:** `http://localhost:3000`
- **Site URL staging:** `https://<host-exacto-de-staging>`
- **Site URL producción:** `https://<dominio-final>`

No mantengas `localhost` como Site URL en un proyecto publicado. Añade como **Redirect URLs** únicamente el callback SSR en los hosts controlados:

```text
http://localhost:3000/auth/callback
https://<host-exacto-de-staging>/auth/callback
https://<dominio-final>/auth/callback
```

Las plantillas de email construyen el enlace bajo `/auth/confirm` a partir de la Site URL; esa página solo transmite los parámetros permitidos al Route Handler `/auth/callback`. `/restablecer-contrasena` es un destino interno posterior al callback. Los comodines amplios solo son aceptables en previews controladas. En producción usa ruta y host exactos. Configura `NEXT_PUBLIC_SITE_URL` con el mismo origen que Site URL.

## 4. Confirmación de email y recuperación

En **Authentication → Providers → Email**:

- Activa email y contraseña.
- Activa confirmación de email.
- Mantén desactivado el alta anónima.
- Decide la política de cambio seguro de email y documenta la elección.
- Ajusta rate limits después de probar entrega real; nunca los uses como límite comercial.

En **Authentication → Email Templates**, copia los HTML versionados en `supabase/email-templates`. Sus enlaces deben usar exactamente el flujo de hash que consume el servidor:

```text
Confirm signup: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
Reset password: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
Change email:   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change
```

`/auth/confirm` reenvía de forma interna a `/auth/callback`. El callback valida el tipo, limita `next` con `safeInternalPath`, ejecuta `verifyOtp({ token_hash, type })`, verifica la sesión con `getUser()` y deja que el adaptador SSR escriba las cookies. No usa `exchangeCodeForSession` para email.

El alta pública permanece disponible en Supabase para que pueda enviar la confirmación por SMTP, pero el trigger de base de datos exige una fila efímera en `registration_authorizations`. Solo `/api/auth/register`, después de validar, limitar y registrar las versiones legales vigentes, crea ese token SHA-256 de un solo uso. Una llamada directa a `auth.signUp` sin autorización se revierte. No concedas políticas cliente sobre esa tabla.

La recuperación añade un `state` aleatorio HttpOnly como comprobación adicional cuando el enlace lo conserva. La autoridad sigue siendo el `token_hash` de un solo uso validado por Supabase, por lo que la plantilla directa también funciona sin `state`. Tras `verifyOtp`, el callback crea un marcador HttpOnly de diez minutos. `/api/auth/reset-password` consume ese marcador y cierra las sesiones; una sesión ordinaria no habilita el formulario.

Prueba por separado:

1. Registro nuevo y confirmación válida.
2. Enlace caducado o ya utilizado.
3. Reenvío de confirmación.
4. Solicitud y finalización de recuperación.
5. Cambio de email, contraseña y cierre de sesión.
6. Que ningún destino externo pueda entrar mediante el parámetro `next`.

## 5. SMTP

El SMTP incluido por Supabase es limitado y no está destinado a producción. Configura Resend siguiendo [RESEND_SUPABASE_SMTP_SETUP.md](./RESEND_SUPABASE_SMTP_SETUP.md). Verifica un dominio real; no inventes el remitente final.

## 6. Aplicar migraciones

Instala la CLI oficial y enlaza primero el proyecto de staging:

```bash
supabase login
supabase link --project-ref <project-ref-staging>
supabase migration list
supabase db push --dry-run
supabase db push
```

Para local, con Docker disponible:

```bash
supabase start
supabase db reset
supabase status
supabase test db
```

`db reset` elimina y reconstruye la base local. No lo ejecutes contra producción.
El repositorio incluye `supabase/config.toml`; el reset aplica las migraciones en orden y carga `supabase/seed/*.sql` en local.

## 7. Importar el catálogo fiscal

Después de aplicar las migraciones y solo en el entorno correcto:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/fiscal_catalog_2026.sql
```

Verifica los conteos esperados:

```sql
select count(*) from fiscal_vehicle_values; -- 70886
select count(*) from fiscal_generic_value_bands; -- 45
select
  (select count(*) from fiscal_vehicle_values) +
  (select count(*) from fiscal_generic_value_bands) as total; -- 70931
```

La importación debe ser idempotente. No actives en producción un fallback silencioso que cargue el catálogo completo en memoria si PostgreSQL o la RPC fallan.

## 8. RLS y separación de clientes

Comprueba que:

- Cada tabla privada tiene RLS activado.
- `auth.uid()` limita lectura y escritura al propietario.
- Particular no accede a datos profesionales.
- Un profesional no puede leer clientes o expedientes de otro profesional.
- El catálogo fiscal no es editable por `anon` o `authenticated`.
- Las RPC fiscales solo se ejecutan desde backend con `service_role` cuando así se haya diseñado.
- Ningún permiso depende de `user_metadata` editable o de una cookie de nivel.
- El token de `registration_authorizations` se consume dentro del trigger que crea perfil y aceptaciones; no se guarda el token en claro ni se devuelve al navegador.
- Cada aceptación contractual de checkout queda enlazada al `purchase_id` del intento reservado; no se reutiliza la fecha de otra compra.
- La migración `007` elimina las políticas de escritura de Storage, añade un trigger que bloquea escrituras autenticadas incluso ante una política heredada y conserva la recuperación privada de objetos históricos. Consulta [DOCUMENT_STORAGE_RETIREMENT.md](./DOCUMENT_STORAGE_RETIREMENT.md) antes de borrar el bucket.
- La migración `008` crea una outbox de email sin destinatarios, contenido ni tokens persistidos. Solo sus RPC controladas se conceden a `service_role`; configura el cron según [RESEND_SUPABASE_SMTP_SETUP.md](./RESEND_SUPABASE_SMTP_SETUP.md).

Ejecuta:

```bash
supabase test db
npm run supabase:verify
npm run fiscal:verify-database
```

Si esas tareas no están integradas todavía en `package.json`, deben apuntar a los scripts de diagnóstico del repositorio antes de staging.

## 9. Verificación de Auth sin usuarios reales

Usa cuentas sintéticas exclusivas de staging. El diagnóstico debe comprobar, sin imprimir secretos:

- presencia y formato de variables;
- conectividad básica;
- URL de callback y coincidencia con Site URL;
- tablas y migraciones esperadas;
- creación de perfil y licencia Gratis tras confirmar email;
- renovación de sesión y cierre completo;
- aislamiento RLS.

Elimina las cuentas sintéticas cuando termine la prueba. Nunca ejecutes pruebas destructivas con usuarios de producción.

## 10. Errores habituales

### `Email address not authorized`

El SMTP de prueba de Supabase solo entrega a direcciones autorizadas del equipo. Configura SMTP personalizado y dominio verificado.

### El email vuelve a `localhost`

Site URL o `NEXT_PUBLIC_SITE_URL` no coinciden con el entorno, o el HTML del Dashboard no coincide con las plantillas versionadas basadas en `{{ .TokenHash }}`.

### `redirect_uri` no permitida

La URL exacta no está en Redirect URLs. Compara protocolo, host, puerto, path y barra final.

### La sesión existe en cliente pero no en servidor

Comprueba que navegador, servidor y middleware usan `@supabase/ssr`, que las cookies se escriben en la respuesta y que no se mezclan helpers antiguos.

### RLS devuelve cero filas

Verifica usuario autenticado, `auth.uid()`, propiedad de la fila y políticas. No lo resuelvas desactivando RLS o usando `service_role` desde el navegador.

### La migración local y remota divergen

Ejecuta `supabase migration list`, compara el historial y crea una migración correctora. No edites una migración ya aplicada en producción.

## 11. Checklist antes de producción

- Migraciones aplicadas en staging desde cero.
- Seed fiscal con 70.931 registros totales.
- pgTAP y pruebas de Auth/RLS aprobadas.
- Site URL y redirects exactos.
- SMTP de dominio verificado y tracking de enlaces desactivado.
- Variables configuradas en el gestor de secretos.
- Claves Stripe exclusivamente de prueba hasta autorización expresa.
- Copia de seguridad y procedimiento de reversión documentados.
- Datos legales completos y `LEGAL_REVIEW_COMPLETED=true` solo después de revisión profesional.
