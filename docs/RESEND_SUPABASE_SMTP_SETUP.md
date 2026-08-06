# Resend, Supabase Auth y emails transaccionales

Esta guía separa dos canales que comparten proveedor, pero no responsabilidades:

1. **Supabase Auth → SMTP de Resend** envía confirmación, reenvío, recuperación y cambio de email.
2. **Backend de MatriculaPro → API de Resend** procesa los eventos contractuales de producto desde una outbox idempotente.

No se ha elegido ni inventado un dominio final. El propietario debe aportar y controlar el dominio, la dirección remitente y el canal de soporte antes de staging o producción.

Referencias: [Resend SMTP](https://resend.com/docs/send-with-smtp), [Resend con Supabase](https://resend.com/docs/knowledge-base/getting-started-with-resend-and-supabase), [SMTP personalizado de Supabase](https://supabase.com/docs/guides/auth/auth-smtp) y [plantillas de Auth](https://supabase.com/docs/guides/auth/auth-email-templates).

## 1. Variables de entorno

Configura los secretos únicamente en el gestor de secretos del entorno:

```text
RESEND_API_KEY=<API key limitada al dominio verificado>
EMAIL_FROM=<nombre visible y buzón real del dominio verificado>
TRANSACTIONAL_EMAIL_CRON_SECRET=<secreto aleatorio de 32 caracteres o más>
TRANSACTIONAL_EMAIL_BATCH_SIZE=20
NEXT_PUBLIC_SUPPORT_EMAIL=<canal real que recibe respuestas>
NEXT_PUBLIC_SITE_URL=<URL exacta del entorno>
```

`RESEND_API_KEY`, `EMAIL_FROM` y `TRANSACTIONAL_EMAIL_CRON_SECRET` nunca deben llevar prefijo `NEXT_PUBLIC_`. `EMAIL_FROM` puede usar el formato `MatriculaPro by IvanImports <buzón@dominio-configurado>`, pero el buzón y el dominio deben ser reales y estar verificados. No copies un valor ficticio desde esta documentación.

El build de producción y `npm run env:validate -- --production` fallan si falta esta configuración. El endpoint de cola también falla de forma cerrada en cualquier entorno donde la configuración sea incompleta: no marca mensajes como enviados.

## 2. Verificar el dominio en Resend

1. Crea la cuenta Resend del titular.
2. Añade el dominio o subdominio que el propietario haya decidido.
3. Copia en el proveedor DNS exactamente los registros SPF y DKIM mostrados por Resend.
4. Configura DMARC de forma progresiva después de comprobar la entrega y alineación.
5. Espera al estado **Verified**.
6. Crea una API key limitada al envío desde ese dominio y guárdala como `RESEND_API_KEY`.
7. Comprueba que el canal configurado en `NEXT_PUBLIC_SUPPORT_EMAIL` recibe respuestas.

No uses `resend.dev` para usuarios reales ni publiques claves o registros copiados de otro dominio.

## 3. SMTP de Supabase Auth

Resend publica estas credenciales SMTP:

```text
Host: smtp.resend.com
Port: 587 (STARTTLS)
Username: resend
Password: <API key de Resend>
```

En **Supabase Dashboard → Authentication → SMTP Settings**:

```text
Enable Custom SMTP: sí
Sender name: MatriculaPro by IvanImports
Sender email: <buzón real del dominio verificado>
Host: smtp.resend.com
Port: 587
Username: resend
Password: <API key guardada como secreto>
```

Haz primero la configuración en staging. El SMTP incorporado y limitado de Supabase no es el canal de producción.

## 4. URLs de Auth

Antes de enviar correos, configura en Supabase el **Site URL** exacto y Redirect URLs exactas para cada entorno. Los flujos actuales envían al proveedor un `emailRedirectTo` bajo `/auth/callback`; el servidor valida el destino interno y completa el intercambio PKCE.

URL que debe estar permitida en Supabase para cada host real:

```text
/auth/callback
```

El callback redirige internamente a `/auth/confirm` cuando hay un error o a `/restablecer-contrasena` después de una recuperación válida; esas dos rutas no se entregan como `redirectTo`. Evita comodines amplios en producción. Nunca aceptes un destino externo aportado por query string.

## 5. Plantillas de Supabase Auth

Los originales están en [`supabase/email-templates`](../supabase/email-templates/README.md). Copia manualmente asunto y HTML en las ranuras del Dashboard:

- **Confirm signup:** confirmación de cuenta.
- **Reset password:** recuperación de contraseña.
- **Change email address:** cambio de email.

Supabase no ofrece una plantilla distinta para “reenviar confirmación”. `auth.resend({ type: 'signup' })` vuelve a usar **Confirm signup**. El activo `resend-confirmation.html` documenta el texto de reenvío, pero no debe presentarse como una ranura que el proveedor no tiene.

Las plantillas usan `{{ .ConfirmationURL }}` generado por Supabase. No guardan ni muestran OTP, no escriben un dominio a mano y no cargan recursos remotos.

## 6. Emails de producto

El backend incluye plantillas reales y versionadas para:

- Compra confirmada.
- Licencia activada.
- Ampliación aplicada.
- Vencimiento próximo (una vez, en los siete días anteriores).
- Licencia vencida.
- Reembolso registrado.
- Solicitud de supresión recibida.

Cuando corresponde, muestran nivel, duración, inicio, vencimiento, identificador de compra, base pagada, IVA, total y crédito de ampliación. No incluyen NIF, datos del vehículo, resultados fiscales, documentos ni afirmaciones de validación oficial.

## 7. Outbox idempotente

La migración `202608050008_transactional_email_outbox.sql` crea `transactional_email_outbox` y conecta triggers exclusivamente a transiciones autoritativas:

- `purchases.status → paid` encola compra confirmada.
- `license_events.activated` encola licencia activada.
- `license_events.upgraded` encola ampliación.
- `license_events.expired` encola vencida.
- `license_events.refunded` encola reembolso.
- una nueva `account_deletion_requests` encola la recepción de supresión.
- el scheduler encola el aviso de vencimiento próximo.

La tabla no tiene columnas de destinatario, asunto, HTML, texto, payload, token u OTP. Solo conserva referencias internas, estado, reintentos, una clave idempotente y el SHA-256 del ID devuelto por Resend. `anon`, `authenticated` y el navegador no tienen acceso. `service_role` solo puede usar los RPC controlados; tampoco recibe permisos CRUD directos sobre la tabla.

Cada envío utiliza la misma `idempotency_key` en la restricción única de PostgreSQL y en la cabecera `Idempotency-Key` de Resend. Un webhook repetido o un worker reiniciado no genera un segundo evento lógico.

## 8. Scheduler y procesador

Configura la plataforma para invocar cada pocos minutos:

```text
GET /api/cron/transactional-email
Authorization: Bearer <TRANSACTIONAL_EMAIL_CRON_SECRET>
```

También se admite `POST`. No pongas el secreto en la URL. El endpoint:

1. materializa licencias vencidas mediante la función autoritativa;
2. encola recordatorios dentro de la ventana de siete días;
3. reclama hasta `TRANSACTIONAL_EMAIL_BATCH_SIZE` filas con `FOR UPDATE SKIP LOCKED`;
4. recupera destinatario y datos mediante `service_role`;
5. renderiza en memoria;
6. envía por API HTTPS de Resend;
7. guarda solo estado y hash del ID de proveedor.

Una concesión de procesamiento caduca a los 15 minutos. Los errores se guardan como códigos acotados y se reintentan a 1 minuto, 5 minutos, 15 minutos, 1 hora, 4 horas y después cada 12 horas. Tras ocho intentos pasa a `dead_letter`. La respuesta del endpoint contiene únicamente contadores; nunca direcciones ni contenido.

Aplica la migración antes de activar el cron. Si el cron no está operativo, los webhooks siguen activando licencias, pero los emails quedan pendientes.

## 9. Desactivar seguimiento

Desactiva en Resend el seguimiento de aperturas y clics tanto para SMTP como para API. El repositorio no incorpora píxeles, imágenes remotas, SDK de analítica ni acortadores. El seguimiento de enlaces puede reescribir y romper enlaces de confirmación o recuperación de un solo uso.

Después de modificar plantillas ejecuta:

```bash
npm run launch:no-tracking
npm run test:email
```

## 10. Pruebas en staging

1. Registro y confirmación inicial.
2. Reenvío con respuesta neutra y sin enumerar cuentas.
3. Enlace válido, usado y caducado.
4. Recuperación completa y contraseña nueva.
5. Cambio de email con la protección configurada por Supabase.
6. Checkout Stripe de prueba: compra y licencia activada.
7. Repetición del webhook sin duplicar filas ni correos.
8. Ampliación con duración, fechas, crédito, base, IVA y total correctos.
9. Vencimiento próximo y vencimiento real con el reloj controlado.
10. Reembolso de prueba y retirada de acceso.
11. Solicitud de supresión.
12. Entrega en Gmail, Outlook y un proveedor adicional.
13. Cabeceras SPF, DKIM y DMARC alineadas.
14. Ausencia de tracking y de datos sensibles.

La seguridad SQL de la cola se comprueba con `supabase test db` mediante `supabase/tests/transactional_email_outbox.sql`. No afirmes que pgTAP o la entrega real han pasado hasta ejecutarlos contra Supabase local o staging.

## 11. Operación y diagnóstico

- **No llega Auth:** revisa Custom SMTP, dominio verificado, rate limits, spam y plantilla correcta.
- **No llegan emails de producto:** revisa migración 008, cron, variables y contadores del endpoint.
- **401 del cron:** rota y sincroniza `TRANSACTIONAL_EMAIL_CRON_SECRET`; no lo imprimas en logs.
- **503 del cron:** falta configuración o Supabase/Resend no está disponible. La cola no se marca como enviada.
- **Enlace caducado al primer clic:** confirma que click tracking está desactivado y revisa prefetch del proveedor.
- **Vuelve al host equivocado:** corrige Site URL, Redirect URLs y `NEXT_PUBLIC_SITE_URL`.
- **`dead_letter`:** corrige primero configuración o datos. Reintenta solo desde una sesión administrativa controlada y conserva la misma clave idempotente.
- **SPF/DKIM fallan:** compara los registros DNS carácter por carácter y elimina duplicados incompatibles.

No registres cuerpos, destinatarios completos, `ConfirmationURL`, API keys ni cabeceras Authorization.

## 12. Datos pendientes del propietario

- Dominio y, si procede, subdominio de envío.
- Dirección remitente real y nombre visible definitivo.
- Canal de soporte capaz de recibir respuestas.
- Cuenta Resend y responsables con acceso.
- Registros DNS SPF, DKIM y DMARC.
- Región y condiciones de tratamiento revisadas.
- Site URL y Redirect URLs exactas de staging y producción.
- Revisión jurídica de los textos contractuales y de privacidad.

Hasta completar estos puntos no debe activarse producción.
