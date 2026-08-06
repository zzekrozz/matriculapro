# MatriculaPro: matriz única de acceso

La autorización real se resuelve en `get_my_access_context()` y se vuelve a comprobar en cada RPC/RLS o ruta de servidor. La UI solo refleja el resultado. Las cookies, metadata de usuario y parámetros del navegador nunca conceden un plan.

| Estado | Gratis | Histórico de pago | Crear | Editar | Cálculo fiscal | Simuladores | Informes nuevos | Exportar | Profesional |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gratis | Sí | No | No | No | No | No | No | No | No |
| Particular activo | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí | No |
| Particular vencido | Sí | Sí, lectura | No | No | No | No | No | No | No |
| Profesional activo | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Profesional vencido | Sí | Sí, lectura | No | No | No | No | No | No | No |
| Reembolso parcial | Sí | Sí | Sí mientras el periodo siga activo | Sí mientras siga activo | Sí mientras siga activo | Sí mientras siga activo | Sí mientras siga activo | Sí mientras siga activo | Según nivel activo |
| Disputa abierta | Sí | Sí, lectura | No | No | No | No | No | No | No |
| Reembolsado total | Sí | Sí, lectura | No | No | No | No | No | No | No |
| Ampliación reembolsada, mes original vigente | Sí | Sí | Sí hasta el vencimiento original | Sí hasta el vencimiento original | Según licencia original | Según licencia original | Según licencia original | Según licencia original | Según nivel original |
| Revocado/disputa perdida | Sí | Sí, lectura | No | No | No | No | No | No | No |
| Periodo futuro `scheduled` | Sí | Solo si existe otro periodo histórico | No antes de `startsAt` | No | No | No | No | No | No |

Capacidades canónicas: `use_free_checker`, `view_historical_paid_data`, `create_full_cases`, `edit_full_cases`, `run_fiscal_calculations`, `use_advanced_simulators`, `generate_reports`, `export_data` y `use_professional_tools`.

Biblioteca: queda visible a quien tenga histórico de pago. Casos ya completados pueden consultarse; ejecutar decisiones nuevas requiere `use_advanced_simulators`. Checklists, ruta interactiva, ficha, recorrido ITV y simuladores requieren licencia activa. Crear plantillas requiere `generate_reports`.
