# Modo beta pública

`PUBLIC_BETA_MODE` es el único interruptor de la apertura temporal de MatriculaPro. Se evalúa exclusivamente en el servidor. Son valores activos `true`, `1`, `yes` y `on`; cualquier otro valor mantiene el modo comercial.

## Activación

Configura en el entorno de despliegue:

```env
PUBLIC_BETA_MODE=true
```

Después crea un nuevo despliegue. No hace falta alterar Stripe, Products, Prices, webhooks, tablas de compras, licencias ni políticas RLS.

Cuando la beta está activa:

- la landing muestra un aviso discreto y dirige a crear un expediente;
- se ocultan precios, comparación de planes, renovaciones y llamadas al checkout;
- una cuenta autenticada recibe las capacidades Particular y Profesional sin que se fabrique una licencia de pago;
- el backend aplica el mismo contexto beta en APIs fiscales y profesionales;
- los expedientes se leen y escriben a través de `/api/public-beta/cases`, que autentica la sesión, impone el `user_id`, comprueba la propiedad y conserva rate limiting;
- Supabase RLS no se relaja y el navegador no recibe `service_role`;
- Stripe Tax, webhooks, compras y ciclo de licencias permanecen en el código; el checkout se cierra temporalmente antes de contactar con Stripe.

En staging o producción beta, `env:validate` no bloquea el build si faltan las credenciales y los seis Prices de Stripe, porque el checkout devuelve una respuesta cerrada antes de tocar Stripe. Si esas variables están presentes, continúan validándose y nunca deben contener objetos live en staging. Al volver al modo comercial pasan de nuevo a ser obligatorias.

El login continúa siendo obligatorio en `/app` porque los expedientes, documentos, cálculos, clientes y márgenes se guardan por usuario. Las páginas públicas y guías permanecen accesibles sin sesión.

## Protecciones que siguen activas

- autenticación SSR y cookies seguras;
- separación por `user_id` en cada lectura y escritura privilegiada;
- validación Zod y listas explícitas de campos mutables;
- límites por usuario para rutas de expedientes, fiscalidad y área profesional;
- roles administrativos, middleware, RLS y secretos solo de servidor;
- avisos sobre el carácter orientativo de cálculos y resultados.

No se añade analítica durante la beta. El proyecto mantiene su comprobación `launch:no-tracking`.

## Volver al modelo comercial

1. Cambia `PUBLIC_BETA_MODE=false` (o elimina la variable).
2. Crea un nuevo despliegue.
3. Ejecuta `npm run env:validate`, `npm run stripe:doctor`, `npm test` y `npm run build`.
4. Comprueba que reaparecen precios y selector de licencias, y que una cuenta sin licencia solo conserva la comprobación previa.

No hay migración de reversión: las políticas y el esquema comercial nunca se modifican. Los datos creados durante la beta permanecen asociados a su propietario y, al desactivar el modo, vuelven a quedar sujetos a las reglas de licencia ya existentes.

## Validación local

```powershell
$env:PUBLIC_BETA_MODE = 'true'
npm run env:validate
npm run test:public-beta
npm run typecheck
npm run lint
npm test
npm run build
```
