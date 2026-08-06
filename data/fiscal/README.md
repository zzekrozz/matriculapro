# Catálogo fiscal oficial 2026

Fuente única: disposición oficial `BOE-A-2025-26357`, Orden HAC/1501/2025.

La copia PDF permite el cotejo visual y el XML oficial es la fuente de extracción. El
catálogo no divide heurísticamente la columna oficial `Modelo-Tipo`: `model` conserva
el literal completo y `version` queda a `null`. El Anexo I tampoco publica CO₂; por
eso `co2Gkm` queda a `null` y nunca se infiere.

El Anexo I contiene dos clases de datos:

- filas identificadas por marca y `Modelo-Tipo`;
- bandas genéricas para ciclomotores/motocicletas eléctricas o de combustión,
  quads y buggies sin modelo tabulado.

Ambas se importan. Las bandas genéricas no se presentan como versiones exactas.

Flujo reproducible, desde la raíz del repositorio:

```powershell
node --no-warnings --experimental-strip-types scripts/fiscal/download-official-vehicle-values.ts
node --no-warnings --experimental-strip-types scripts/fiscal/parse-official-vehicle-values.ts
node --no-warnings --experimental-strip-types scripts/fiscal/validate-official-vehicle-values.ts
node --no-warnings --experimental-strip-types scripts/fiscal/import-official-vehicle-values.ts
```

El último comando **no conecta con Supabase**. Genera un seed SQL transaccional en
`supabase/seed/fiscal_catalog_2026.sql`, que sólo debe aplicarse después de revisar la
migración y probarla en staging:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/fiscal_catalog_2026.sql
```

`DATABASE_URL` es una variable efímera de la sesión de administración, no una variable de la aplicación ni del navegador. Debe apuntar explícitamente a staging durante esta validación.

La aplicación usa Supabase como almacenamiento principal: el catálogo completo no se
concede a tablas cliente. La migración expone únicamente RPC paginadas y acotadas.
Los JSONL son artefactos reproducibles de importación y una posible reserva exclusiva
del servidor; nunca deben importarse desde componentes cliente.
