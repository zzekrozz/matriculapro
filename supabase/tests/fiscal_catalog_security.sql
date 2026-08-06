-- Run with: supabase test db
-- Structural security checks; the 70,931-row seed is intentionally not required.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

select is(
  (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(array[
        'fiscal_catalog_versions',
        'fiscal_vehicle_values',
        'fiscal_generic_vehicle_value_bands'
      ]::text[])
      and relation.relrowsecurity
  ),
  3::bigint,
  'RLS is enabled on all fiscal catalogue tables'
);

select is(
  (
    select count(*)
    from unnest(array[
      'fiscal_catalog_versions',
      'fiscal_vehicle_values',
      'fiscal_generic_vehicle_value_bands'
    ]::text[]) table_name
    where has_table_privilege('anon', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE')
  ),
  0::bigint,
  'anon has no direct fiscal catalogue table privileges'
);

select is(
  (
    select count(*)
    from unnest(array[
      'fiscal_catalog_versions',
      'fiscal_vehicle_values',
      'fiscal_generic_vehicle_value_bands'
    ]::text[]) table_name
    where has_table_privilege('authenticated', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE')
  ),
  0::bigint,
  'authenticated has no direct fiscal catalogue table privileges'
);

select ok(
  has_table_privilege('service_role', 'public.fiscal_catalog_versions', 'SELECT')
  and has_table_privilege('service_role', 'public.fiscal_catalog_versions', 'INSERT')
  and has_table_privilege('service_role', 'public.fiscal_catalog_versions', 'UPDATE'),
  'service_role can maintain catalogue version metadata'
);

select ok(
  has_table_privilege('service_role', 'public.fiscal_vehicle_values', 'SELECT')
  and has_table_privilege('service_role', 'public.fiscal_vehicle_values', 'INSERT')
  and has_table_privilege('service_role', 'public.fiscal_vehicle_values', 'UPDATE')
  and has_table_privilege('service_role', 'public.fiscal_vehicle_values', 'DELETE'),
  'service_role can perform the controlled idempotent vehicle import'
);

select is(
  (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any(array[
        'search_fiscal_vehicle_values',
        'get_fiscal_vehicle_value',
        'list_fiscal_generic_vehicle_value_bands'
      ]::text[])
      and procedure.prosecdef
  ),
  3::bigint,
  'All public catalogue RPCs are SECURITY DEFINER'
);

select is(
  (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any(array[
        'search_fiscal_vehicle_values',
        'get_fiscal_vehicle_value',
        'list_fiscal_generic_vehicle_value_bands'
      ]::text[])
      and array_to_string(procedure.proconfig, ',') like '%search_path=pg_catalog, public%'
  ),
  3::bigint,
  'Every SECURITY DEFINER catalogue RPC fixes search_path'
);

select is(
  (
    select count(*)
    from unnest(array[
      'public.search_fiscal_vehicle_values(text,text,text,integer,integer)',
      'public.get_fiscal_vehicle_value(text)',
      'public.list_fiscal_generic_vehicle_value_bands(text)'
    ]::text[]) function_signature
    where has_function_privilege('anon', function_signature, 'EXECUTE')
  ),
  0::bigint,
  'anon cannot execute server-only fiscal catalogue RPCs'
);

select is(
  (
    select count(*)
    from unnest(array[
      'public.search_fiscal_vehicle_values(text,text,text,integer,integer)',
      'public.get_fiscal_vehicle_value(text)',
      'public.list_fiscal_generic_vehicle_value_bands(text)'
    ]::text[]) function_signature
    where has_function_privilege('authenticated', function_signature, 'EXECUTE')
  ),
  0::bigint,
  'authenticated cannot execute server-only fiscal catalogue RPCs'
);

select is(
  (
    select count(*)
    from unnest(array[
      'public.search_fiscal_vehicle_values(text,text,text,integer,integer)',
      'public.get_fiscal_vehicle_value(text)',
      'public.list_fiscal_generic_vehicle_value_bands(text)'
    ]::text[]) function_signature
    where has_function_privilege('service_role', function_signature, 'EXECUTE')
  ),
  3::bigint,
  'service_role alone can execute fiscal catalogue RPCs'
);

select ok(
  not has_function_privilege('anon', 'public.normalize_fiscal_catalog_query(text)', 'EXECUTE'),
  'the internal normalization helper is not client-executable'
);

select ok(
  position(
    'char_length(parameter.query) >= 2'
    in pg_get_functiondef(
      'public.search_fiscal_vehicle_values(text,text,text,integer,integer)'::regprocedure
    )
  ) > 0,
  'server-side search requires a query or exact filter with at least two characters'
);

select ok(
  position(
    'least(greatest(coalesce(p_limit, 20), 1), 50)'
    in pg_get_functiondef(
      'public.search_fiscal_vehicle_values(text,text,text,integer,integer)'::regprocedure
    )
  ) > 0,
  'server-side search retains the hard page-size cap of 50 rows'
);

select is(
  (
    select count(*)
    from pg_class index_relation
    join pg_namespace namespace on namespace.oid = index_relation.relnamespace
    where namespace.nspname = 'public'
      and index_relation.relkind = 'i'
      and index_relation.relname = any(array[
        'fiscal_vehicle_values_catalog_brand_idx',
        'fiscal_vehicle_values_catalog_brand_model_idx',
        'fiscal_vehicle_values_search_fts_idx',
        'fiscal_vehicle_values_search_trgm_idx',
        'fiscal_vehicle_values_natural_hash_idx'
      ]::text[])
  ),
  5::bigint,
  'Fiscal catalogue has filter, FTS, trigram and duplicate-detection indexes'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'fiscal_catalog_versions',
        'fiscal_vehicle_values',
        'fiscal_generic_vehicle_value_bands'
      ]::text[])
  ),
  0::bigint,
  'No permissive direct-table client policy exists'
);

select * from finish();
rollback;
