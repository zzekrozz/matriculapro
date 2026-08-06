-- Run with: supabase test db
-- Regression for /auth/v1/verify SQLSTATE 42501 on the deferred licence guard.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

select is(
  (
    select pg_get_userbyid(procedure.proowner)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'enforce_payment_license_compatibility'
      and procedure.pronargs = 0
  ),
  'postgres',
  'the deferred payment/licence guard has the explicit postgres owner'
);

select ok(
  (
    select procedure.prosecdef
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'enforce_payment_license_compatibility'
      and procedure.pronargs = 0
  ),
  'the minimal deferred guard is SECURITY DEFINER'
);

select ok(
  (
    select array_to_string(procedure.proconfig, ',') like '%search_path=pg_catalog, public%'
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'enforce_payment_license_compatibility'
      and procedure.pronargs = 0
  ),
  'the deferred guard fixes a safe search_path'
);

select is(
  (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any(array[
        'handle_new_user',
        'handle_auth_user_email_confirmed',
        'assign_free_license',
        'enforce_payment_license_compatibility'
      ]::text[])
      and procedure.prosecdef
      and pg_get_userbyid(procedure.proowner) = 'postgres'
      and array_to_string(procedure.proconfig, ',') like '%search_path=pg_catalog, public%'
  ),
  4::bigint,
  'the complete confirmation/free-access chain has explicit owner, definer mode and search_path'
);

select is(
  (
    select count(*)
    from pg_trigger trigger_record
    where trigger_record.tgname in (
      'purchases_payment_license_compatibility',
      'licenses_payment_compatibility'
    )
      and trigger_record.tgconstraint <> 0
  ),
  2::bigint,
  'both deferred purchase/licence compatibility triggers remain installed'
);

select ok(
  not has_function_privilege(
    'anon', 'public.enforce_payment_license_compatibility()', 'EXECUTE'
  ),
  'anon cannot execute the trigger-only guard'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.enforce_payment_license_compatibility()', 'EXECUTE'
  ),
  'authenticated cannot execute the trigger-only guard'
);

select ok(
  not has_function_privilege(
    'service_role', 'public.enforce_payment_license_compatibility()', 'EXECUTE'
  ),
  'service_role cannot bypass the trigger and invoke its internal guard'
);

select ok(
  (
    select relation.relrowsecurity
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = 'purchases'
  ),
  'purchases keeps RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.purchases', 'SELECT'),
  'anon has no direct SELECT privilege on purchases'
);

select ok(
  not has_table_privilege('supabase_auth_admin', 'public.purchases', 'SELECT'),
  'the Auth transaction role still has no direct SELECT privilege on purchases'
);

select is(
  (
    select count(*)
    from unnest(array['INSERT', 'UPDATE', 'DELETE']::text[]) privilege_name
    where has_table_privilege(
      'authenticated', 'public.purchases', privilege_name
    )
  ),
  0::bigint,
  'authenticated has no direct purchase mutation privilege'
);

select is(
  (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any(array[
        'store_pending_payment_reversal',
        'process_verified_automatic_tax_payment',
        'process_verified_order_independent_dispute'
      ]::text[])
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  0::bigint,
  'authenticated still cannot execute payment, refund or dispute backends'
);

select is(
  (
    select count(distinct procedure.proname)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any(array[
        'store_pending_payment_reversal',
        'process_verified_automatic_tax_payment',
        'process_verified_order_independent_dispute'
      ]::text[])
      and has_function_privilege('service_role', procedure.oid, 'EXECUTE')
  ),
  3::bigint,
  'service_role retains the payment, refund and dispute backend entry points'
);

insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
) values (
  'auth-confirmation-a@example.test',
  encode(extensions.digest('pgtap_auth_confirmation_token_000001', 'sha256'), 'hex'),
  'Auth Confirmation A',
  '2026-08-v1',
  '2026-08-v1',
  now() + interval '10 minutes'
);

set local role supabase_auth_admin;

select lives_ok(
  $$insert into auth.users (
      id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
    ) values (
      '13000000-0000-4000-8000-000000000001',
      'auth-confirmation-a@example.test',
      null,
      '{}'::jsonb,
      '{"registration_token":"pgtap_auth_confirmation_token_000001"}'::jsonb
    )$$,
  'the Supabase Auth role can create an authorized unconfirmed user'
);

select lives_ok(
  $$update auth.users
    set email_confirmed_at = now()
    where id = '13000000-0000-4000-8000-000000000001'$$,
  'email confirmation updates auth.users without an immediate permission error'
);

select lives_ok(
  $$set constraints all immediate$$,
  'the deferred licence trigger completes without SQLSTATE 42501 at commit'
);

reset role;

select is(
  (
    select count(*) from public.profiles
    where id = '13000000-0000-4000-8000-000000000001'
      and access_level = 'free'
  ),
  1::bigint,
  'the authorized user receives its profile'
);

select is(
  (
    select count(*) from public.user_licenses
    where user_id = '13000000-0000-4000-8000-000000000001'
      and tier = 'free' and status = 'free'
  ),
  1::bigint,
  'email confirmation creates the free licence exactly once'
);

select is(
  (
    select count(*) from public.license_events
    where user_id = '13000000-0000-4000-8000-000000000001'
      and event_type = 'free_assigned'
  ),
  1::bigint,
  'free access keeps its authoritative licence event'
);

insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
) values (
  'auth-confirmation-b@example.test',
  encode(extensions.digest('pgtap_auth_confirmation_token_000002', 'sha256'), 'hex'),
  'Auth Confirmation B',
  '2026-08-v1',
  '2026-08-v1',
  now() + interval '10 minutes'
);

insert into auth.users (
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
) values (
  '13000000-0000-4000-8000-000000000002',
  'auth-confirmation-b@example.test',
  now(),
  '{}'::jsonb,
  '{"registration_token":"pgtap_auth_confirmation_token_000002"}'::jsonb
);

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, purchase_kind
) values
  (
    '13000000-0000-4000-8000-000000000101',
    '13000000-0000-4000-8000-000000000001',
    'particular', 'one_month', 'pending', 'auth_confirmation_purchase_0001',
    6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_authconfirmationa', 'new'
  ),
  (
    '13000000-0000-4000-8000-000000000102',
    '13000000-0000-4000-8000-000000000002',
    'professional', 'one_month', 'pending', 'auth_confirmation_purchase_0002',
    10661, 2239, 12900, 12900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_authconfirmationb', 'new'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-4000-8000-000000000001',
  true
);

select is(
  public.get_my_access_context() ->> 'mode',
  'free',
  'the confirmed user resolves its free access context'
);

select is(
  (select count(*) from public.purchases),
  1::bigint,
  'authenticated sees only its own purchase through RLS'
);

select is(
  (
    select count(*) from public.purchases
    where user_id = '13000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'authenticated cannot read another user purchase'
);

select throws_ok(
  $$insert into public.purchases (id) values (gen_random_uuid())$$,
  '42501', null,
  'authenticated cannot insert purchases directly'
);

select throws_ok(
  $$update public.purchases set metadata = metadata where user_id = auth.uid()$$,
  '42501', null,
  'authenticated cannot update purchases directly'
);

reset role;
set local role anon;

select throws_ok(
  $$select count(*) from public.purchases$$,
  '42501', null,
  'anon cannot read purchases'
);

reset role;

select * from finish();
rollback;
