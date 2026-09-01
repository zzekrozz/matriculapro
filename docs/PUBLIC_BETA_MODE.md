# Beta pública temporal

MatriculaPro está abierto por defecto durante la fase de desarrollo. `PUBLIC_BETA_MODE` es la única fuente de verdad: `true`, `1`, `yes` y `on` mantienen la beta; `false`, `0`, `no` y `off` restauran el flujo comercial. Si la variable no existe, la beta queda activa deliberadamente.

## Sin login ni registro

La landing enlaza directamente con `/app/expedientes/nuevo`. Durante la beta `AuthProvider` queda inactivo: no muestra formularios, no consulta una sesión existente y no ejecuta `signInAnonymously`. Las rutas `/entrar` y `/registro` redirigen al producto.

Los expedientes, documentos, cálculos guardados, checklists, clientes, costes y configuración profesional permanecen exclusivamente en `localStorage` del navegador. No se envían a Supabase y no pueden verse desde otro navegador o dispositivo. Borrar los datos del navegador elimina este contenido y no existe recuperación remota.

Las operaciones fiscales y de comprobación que necesitan cálculo servidor siguen disponibles sin cuenta. Conservan validación de entrada y rate limiting por IP. La comprobación gratuita devuelve el resultado pero no crea una fila de usuario. Admin, pagos, persistencia privada y endpoints profesionales de base de datos continúan protegidos.

## Qué se conserva

No se elimina código de Supabase Auth, pantallas de acceso, recuperación, RLS, Stripe, Prices, pagos, licencias, incidencias ni reconciliación. Quedan invisibles o cerrados mientras la beta está activa y vuelven a utilizarse al desactivar el interruptor.

El validador legal permite construir la beta sin cobros y muestra advertencias. Antes de volver al modo comercial deben completarse todos los campos legales y `LEGAL_REVIEW_COMPLETED=true`.

## Despliegue

No hay migración de base de datos ni ajuste de Anonymous Sign-Ins. En Vercel no es necesario crear `PUBLIC_BETA_MODE`; opcionalmente puede fijarse a `true`. Tras desplegar, comprueba en una ventana privada que el CTA abre el producto, que no aparecen enlaces de cuenta y que un expediente sobrevive a una recarga en el mismo navegador.

## Volver al modo comercial

1. Configura `PUBLIC_BETA_MODE=false` en Vercel para Production y Preview.
2. Completa la configuración legal, Auth y comercial exigida por los validadores.
3. Haz redeploy.

Con el interruptor desactivado vuelven el login, la persistencia Supabase, las capacidades por licencia, precios y checkout. Los datos locales creados durante la beta no se migran automáticamente a una cuenta.

## Validación local

```powershell
npm run env:validate
npm run test:public-beta
npm run typecheck
npm run lint
npm test
npm run build
```
