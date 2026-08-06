# Ciclo de vida de licencias y pagos

Los periodos son intervalos semiabiertos `[startsAt, expiresAt)`. La fecha final se calcula por meses naturales UTC, conservando el instante y ajustando fin de mes. La exclusión GiST `user_licenses_no_paid_period_overlap` impide que un usuario tenga periodos `active`/`scheduled` solapados.

## Compra, ampliación y renovación

- `new`: empieza cuando el webhook verificado activa el pago.
- `upgrade`: solo licencia inicial de un mes, mismo nivel, días 0–15 inclusive, crédito del 100 % de lo pagado y fecha de inicio original. La regla anterior no cambia.
- `renewal`: mismo nivel, precio completo y duración 1/6/12 meses. Se abre exactamente 30 días naturales antes conservando la hora de pared en `Europe/Madrid`. El borde exacto está incluido y la ventana termina al vencer. Si la licencia sigue activa, crea un periodo `scheduled` desde el vencimiento exacto; si ya venció, comienza al procesar el pago.
- Un periodo `scheduled` concede acceso lógicamente cuando `startsAt <= now < expiresAt`; no depende de cron.
- Una renovación programada reembolsada antes de empezar pasa a `refunded` y nunca concede acceso.

## Reembolsos

La fuente es el importe acumulado de la `Charge` recuperada desde Stripe. Se guardan bruto, pagado, reembolsado, restante, estado y fecha del último evento.

- `not_refunded`: sin cambio.
- `partially_refunded`: la compra permanece pagada; no se acorta ni revoca la licencia. Se abre revisión administrativa.
- `fully_refunded`: solo cuando acumulado `>= amountPaidCents`; la licencia resultante pasa a `refunded` de forma idempotente. El histórico queda en lectura.
- Eventos antiguos o acumulados no crecientes son no-op. Un acumulado superior al pagado, moneda distinta o importe de Charge incoherente crea incidencia sin alterar cantidades.
- El reembolso parcial de la ampliación mantiene la licencia ampliada y no restaura la original.
- El reembolso total únicamente de la ampliación marca su licencia como reembolsada. La relación explícita `upgrade_relationships` permite restaurar la misma licencia original —sin crear otra ni mover fechas— si su compra no está totalmente reembolsada y aún queda tiempo original.
- Si el mes original ya venció, no se restaura y se audita `original_license_expired_before_upgrade_refund`. Si su compra también fue reembolsada totalmente, tampoco se restaura.
- Un reembolso total de la compra original después de usarla como crédito crea `upgrade_original_purchase_refunded`, registra neto pagado, precio y déficit, y no altera automáticamente ninguna licencia.

## Disputas

`warning` registra revisión sin suspender. `open` pone la licencia en `suspended`: conserva datos, bloquea escrituras. `won` restaura `active`, `scheduled` o `expired` según las fechas. `lost` deja la compra disputada y la licencia `revoked`, conservando histórico de lectura.

## Reversiones anteriores a la activación

Una reversión firmada puede llegar antes del webhook de pago. Se conserva por Event ID único y se empareja en este orden: PaymentIntent, Charge, Checkout Session, Invoice y compra interna validada. Customer es solo contexto auxiliar. La activación bloquea la compra, ordena las reversiones por fecha/ID y las aplica dentro de la misma transacción antes de que una licencia sea visible.

Refund total y disputa `open/lost` impiden crear licencia; refund parcial mantiene la política actual con incidencia; `warning` no bloquea; el último estado cronológico `won` permite activar si el pago, IVA e invoice ya fueron verificados y no existe otro bloqueo. Una ambigüedad deja `requires_review` sin acceso. Duplicados y carreras se serializan con unicidad y advisory locks de compra.

## Concurrencia

Checkout usa una compra pendiente única por usuario, idempotencia por términos, locks transaccionales en orden usuario→compra y claves Stripe derivadas de IDs internos. Refund usa el mismo lock por usuario para serializar la compra original y la ampliación. Customer es único por usuario. Una renovación futura bloquea un segundo checkout incompatible y la exclusión de rangos impide estados imposibles incluso si dos solicitudes pasan comprobaciones TypeScript simultáneamente.
