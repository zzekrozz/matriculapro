# Plantillas de Supabase Auth

Estos archivos son los originales versionados que deben copiarse manualmente en **Supabase Dashboard → Authentication → Email Templates**. No contienen dominio, remitente ni datos legales inventados.

| Supabase Dashboard | Asunto | HTML |
| --- | --- | --- |
| Confirm signup | `confirm-signup.subject.txt` | `confirm-signup.html` |
| Reset password | `recovery.subject.txt` | `recovery.html` |
| Change email address | `change-email.subject.txt` | `change-email.html` |

Supabase Auth no ofrece una ranura distinta para el reenvío de alta: `auth.resend({ type: 'signup' })` vuelve a usar **Confirm signup**. `resend-confirmation.html` y su asunto documentan el texto deseado, pero no deben prometerse como una cuarta ranura del Dashboard. Si se necesita distinguir el primer envío del reenvío, hace falta un flujo propio de Auth que no forma parte de este lanzamiento.

Las plantillas usan exclusivamente `{{ .ConfirmationURL }}`. Supabase genera ese enlace y conserva el `emailRedirectTo` permitido enviado por el servidor. No sustituyas la variable por un host escrito a mano, no añadas `{{ .Token }}` visible y no copies enlaces reales en el repositorio.

Antes de staging:

1. Configura Site URL y Redirect URLs exactas.
2. Copia asunto y HTML en la ranura correspondiente.
3. Desactiva click tracking y open tracking en Resend.
4. Prueba enlace válido, ya usado y caducado.
5. Comprueba el flujo PKCE hasta `/auth/callback`.

Los HTML no cargan imágenes, fuentes, píxeles ni recursos remotos.
