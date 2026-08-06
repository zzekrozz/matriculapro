-- MatriculaPRO - immutable, versioned official fiscal vehicle catalogue.
-- Source: BOE-A-2025-26357, Orden HAC/1501/2025, Annex I, fiscal year 2026.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.fiscal_catalog_versions (
  id text primary key,
  catalog_year integer not null check (catalog_year between 2000 and 2200),
  source_document_id text not null,
  source_order text not null,
  source_pdf_url text not null check (source_pdf_url like 'https://www.boe.es/%'),
  source_xml_url text not null check (source_xml_url like 'https://www.boe.es/%'),
  source_pdf_sha256 text not null check (source_pdf_sha256 ~ '^[a-f0-9]{64}$'),
  source_xml_sha256 text not null check (source_xml_sha256 ~ '^[a-f0-9]{64}$'),
  normalized_sha256 text not null check (normalized_sha256 ~ '^[a-f0-9]{64}$'),
  effective_from date not null,
  effective_to date not null,
  is_active boolean not null default false,
  identified_model_rows integer not null check (identified_model_rows >= 0),
  generic_value_band_rows integer not null check (generic_value_band_rows >= 0),
  rejected_rows integer not null check (rejected_rows >= 0),
  duplicate_groups integer not null check (duplicate_groups >= 0),
  brand_count integer not null check (brand_count >= 0),
  model_count integer not null check (model_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  check (effective_to >= effective_from),
  unique (source_document_id, source_xml_sha256, normalized_sha256)
);

create unique index if not exists fiscal_catalog_one_active_per_year_idx
  on public.fiscal_catalog_versions (catalog_year)
  where is_active;

create table if not exists public.fiscal_vehicle_values (
  id text primary key,
  catalog_version_id text not null references public.fiscal_catalog_versions(id) on delete restrict,
  catalog_year integer not null check (catalog_year between 2000 and 2200),
  source_document_id text not null,
  source_annex text not null,
  brand text not null check (btrim(brand) <> ''),
  model text not null check (btrim(model) <> ''),
  version text,
  official_model_type text not null check (btrim(official_model_type) <> ''),
  commercial_start_year integer check (commercial_start_year between 1900 and 2200),
  commercial_end_year integer check (commercial_end_year between 1900 and 2200),
  fuel_type text,
  engine_capacity_cc integer check (engine_capacity_cc >= 0),
  cylinders integer check (cylinders >= 0),
  power_kw numeric(12, 3) check (power_kw >= 0),
  fiscal_power numeric(12, 3) check (fiscal_power >= 0),
  power_cv numeric(12, 3) check (power_cv >= 0),
  co2_g_km numeric(12, 3) check (co2_g_km >= 0),
  new_vehicle_official_value numeric(14, 2) not null check (new_vehicle_official_value > 0),
  official_row_reference text not null,
  source_xml_line integer not null check (source_xml_line > 0),
  normalized_search_text text not null check (btrim(normalized_search_text) <> ''),
  source_checksum text not null check (source_checksum ~ '^[a-f0-9]{64}$'),
  natural_row_hash text not null check (natural_row_hash ~ '^[a-f0-9]{64}$'),
  raw_official_cells jsonb not null check (
    jsonb_typeof(raw_official_cells) = 'array'
    and jsonb_array_length(raw_official_cells) = 10
  ),
  check (
    commercial_start_year is null
    or commercial_end_year is null
    or commercial_start_year <= commercial_end_year
  ),
  unique (catalog_version_id, official_row_reference)
);

create index if not exists fiscal_vehicle_values_catalog_brand_idx
  on public.fiscal_vehicle_values (catalog_version_id, brand);
create index if not exists fiscal_vehicle_values_catalog_brand_model_idx
  on public.fiscal_vehicle_values (catalog_version_id, brand, model);
create index if not exists fiscal_vehicle_values_period_idx
  on public.fiscal_vehicle_values (commercial_start_year, commercial_end_year);
create index if not exists fiscal_vehicle_values_search_fts_idx
  on public.fiscal_vehicle_values
  using gin (to_tsvector('simple', normalized_search_text));
create index if not exists fiscal_vehicle_values_search_trgm_idx
  on public.fiscal_vehicle_values
  using gin (normalized_search_text extensions.gin_trgm_ops);
create index if not exists fiscal_vehicle_values_natural_hash_idx
  on public.fiscal_vehicle_values (catalog_version_id, natural_row_hash);

create table if not exists public.fiscal_generic_vehicle_value_bands (
  id text primary key,
  catalog_version_id text not null references public.fiscal_catalog_versions(id) on delete restrict,
  catalog_year integer not null check (catalog_year between 2000 and 2200),
  source_document_id text not null,
  source_annex text not null,
  category_code text not null check (category_code in (
    'electric-mopeds-motorcycles',
    'combustion-mopeds-motorcycles',
    'quads',
    'buggies'
  )),
  category_title text not null check (btrim(category_title) <> ''),
  criterion_name text not null check (criterion_name in ('power-kw', 'engine-capacity-cc')),
  criterion_label text not null check (btrim(criterion_label) <> ''),
  new_vehicle_official_value numeric(14, 2) not null check (new_vehicle_official_value > 0),
  official_row_reference text not null,
  source_xml_line integer not null check (source_xml_line > 0),
  source_checksum text not null check (source_checksum ~ '^[a-f0-9]{64}$'),
  natural_row_hash text not null check (natural_row_hash ~ '^[a-f0-9]{64}$'),
  raw_official_cells jsonb not null check (
    jsonb_typeof(raw_official_cells) = 'array'
    and jsonb_array_length(raw_official_cells) = 2
  ),
  unique (catalog_version_id, official_row_reference)
);

create index if not exists fiscal_generic_value_bands_catalog_category_idx
  on public.fiscal_generic_vehicle_value_bands (catalog_version_id, category_code);

alter table public.fiscal_catalog_versions enable row level security;
alter table public.fiscal_vehicle_values enable row level security;
alter table public.fiscal_generic_vehicle_value_bands enable row level security;

revoke all on public.fiscal_catalog_versions from anon, authenticated;
revoke all on public.fiscal_vehicle_values from anon, authenticated;
revoke all on public.fiscal_generic_vehicle_value_bands from anon, authenticated;
grant select, insert, update on public.fiscal_catalog_versions to service_role;
grant select, insert, update, delete on public.fiscal_vehicle_values to service_role;
grant select, insert, update, delete on public.fiscal_generic_vehicle_value_bands to service_role;

create or replace function public.normalize_fiscal_catalog_query(input text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $function$
  select btrim(
    regexp_replace(
      translate(
        lower(input),
        'áéíóúüñçàèìòùäëïöÿâêîôûãõ',
        'aeiouuncaeiouaeioyaeiouao'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$function$;

create or replace function public.get_fiscal_vehicle_value(p_id text)
returns table (
  id text,
  catalog_version_id text,
  brand text,
  model text,
  version text,
  official_model_type text,
  commercial_start_year integer,
  commercial_end_year integer,
  fuel_type text,
  engine_capacity_cc integer,
  cylinders integer,
  power_kw numeric,
  fiscal_power numeric,
  power_cv numeric,
  co2_g_km numeric,
  new_vehicle_official_value numeric,
  official_row_reference text,
  source_checksum text,
  raw_official_cells jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    value.id,
    value.catalog_version_id,
    value.brand,
    value.model,
    value.version,
    value.official_model_type,
    value.commercial_start_year,
    value.commercial_end_year,
    value.fuel_type,
    value.engine_capacity_cc,
    value.cylinders,
    value.power_kw,
    value.fiscal_power,
    value.power_cv,
    value.co2_g_km,
    value.new_vehicle_official_value,
    value.official_row_reference,
    value.source_checksum,
    value.raw_official_cells
  from public.fiscal_vehicle_values value
  join public.fiscal_catalog_versions version_row
    on version_row.id = value.catalog_version_id
   and version_row.is_active
  where char_length(p_id) <= 80
    and value.id = p_id
  limit 1;
$function$;

create or replace function public.search_fiscal_vehicle_values(
  p_query text default '',
  p_brand text default null,
  p_model text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  total_count bigint,
  id text,
  catalog_version_id text,
  brand text,
  model text,
  version text,
  official_model_type text,
  commercial_start_year integer,
  commercial_end_year integer,
  fuel_type text,
  engine_capacity_cc integer,
  cylinders integer,
  power_kw numeric,
  fiscal_power numeric,
  power_cv numeric,
  co2_g_km numeric,
  new_vehicle_official_value numeric,
  official_row_reference text,
  source_checksum text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  with parameters as (
    select
      left(public.normalize_fiscal_catalog_query(coalesce(p_query, '')), 160) as query,
      nullif(left(btrim(p_brand), 200), '') as brand,
      nullif(left(btrim(p_model), 500), '') as model,
      least(greatest(coalesce(p_limit, 20), 1), 50) as row_limit,
      least(greatest(coalesce(p_offset, 0), 0), 10000) as row_offset
  ),
  filtered as materialized (
    select value.*
    from public.fiscal_vehicle_values value
    join public.fiscal_catalog_versions version_row
      on version_row.id = value.catalog_version_id
     and version_row.is_active
    cross join parameters parameter
    where (
        char_length(parameter.query) >= 2
        or char_length(coalesce(parameter.brand, '')) >= 2
        or char_length(coalesce(parameter.model, '')) >= 2
      )
      and (parameter.brand is null or value.brand = parameter.brand)
      and (parameter.model is null or value.model = parameter.model)
      and (
        parameter.query = ''
        or to_tsvector('simple', value.normalized_search_text)
           @@ plainto_tsquery('simple', parameter.query)
      )
  )
  select
    count(*) over () as total_count,
    value.id,
    value.catalog_version_id,
    value.brand,
    value.model,
    value.version,
    value.official_model_type,
    value.commercial_start_year,
    value.commercial_end_year,
    value.fuel_type,
    value.engine_capacity_cc,
    value.cylinders,
    value.power_kw,
    value.fiscal_power,
    value.power_cv,
    value.co2_g_km,
    value.new_vehicle_official_value,
    value.official_row_reference,
    value.source_checksum
  from filtered value
  cross join parameters parameter
  order by value.brand, value.model, value.commercial_start_year nulls last, value.id
  limit (select row_limit from parameters)
  offset (select row_offset from parameters);
$function$;

create or replace function public.list_fiscal_generic_vehicle_value_bands(
  p_category_code text default null
)
returns table (
  catalog_version_id text,
  category_code text,
  category_title text,
  criterion_name text,
  criterion_label text,
  new_vehicle_official_value numeric,
  official_row_reference text,
  source_checksum text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    band.catalog_version_id,
    band.category_code,
    band.category_title,
    band.criterion_name,
    band.criterion_label,
    band.new_vehicle_official_value,
    band.official_row_reference,
    band.source_checksum
  from public.fiscal_generic_vehicle_value_bands band
  join public.fiscal_catalog_versions version_row
    on version_row.id = band.catalog_version_id
   and version_row.is_active
  where p_category_code is null or band.category_code = p_category_code
  order by band.category_code, band.source_xml_line;
$function$;

revoke all on function public.normalize_fiscal_catalog_query(text) from public, anon, authenticated;
revoke all on function public.search_fiscal_vehicle_values(text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.get_fiscal_vehicle_value(text) from public, anon, authenticated;
revoke all on function public.list_fiscal_generic_vehicle_value_bands(text) from public, anon, authenticated;
grant execute on function public.search_fiscal_vehicle_values(text, text, text, integer, integer) to service_role;
grant execute on function public.get_fiscal_vehicle_value(text) to service_role;
grant execute on function public.list_fiscal_generic_vehicle_value_bands(text) to service_role;

comment on table public.fiscal_catalog_versions is
  'Immutable version metadata for official fiscal catalogues. No direct client access.';
comment on table public.fiscal_vehicle_values is
  'Exact BOE Annex I brand/Modelo-Tipo rows. Modelo-Tipo is not heuristically split.';
comment on table public.fiscal_generic_vehicle_value_bands is
  'Annex I generic bands for unlisted electric/combustion motorcycles, quads and buggies.';
comment on function public.search_fiscal_vehicle_values(text, text, text, integer, integer) is
  'Server-only, active-catalog search. Requires at least two normalized query/filter characters; page size is capped at 50 and offset at 10000.';
