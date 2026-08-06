-- Run with: supabase test db
-- Transactional access/licensing/RLS checks. Stripe network calls are not used.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(102);

create function pg_temp.record_checkout_acceptances(p_purchase_id uuid)
returns void
language sql
as $$
  insert into public.legal_acceptances (
    user_id, purchase_id, document_type, document_version, evidence_source
  )
  select purchase.user_id, purchase.id, declaration.document_type,
         '2026-08-v1', 'checkout_confirmation'
  from public.purchases purchase
  cross join (values
    ('contract_terms'),
    ('immediate_performance'),
    ('withdrawal_acknowledgement')
  ) declaration(document_type)
  where purchase.id = p_purchase_id
  on conflict do nothing;
$$;

select is(
  (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(array[
        'profiles', 'user_licenses', 'license_events', 'purchases', 'payment_events',
        'upgrade_eligibility', 'free_vehicle_checks', 'professional_profiles',
        'professional_clients', 'professional_case_financials',
        'account_deletion_requests', 'legal_acceptances',
        'registration_authorizations'
      ]::text[])
      and relation.relrowsecurity
  ),
  13::bigint,
  'RLS is enabled on all launch access and professional tables'
);

select is(
  (
    select count(*)
    from unnest(array[
      'profiles', 'user_licenses', 'license_events', 'purchases', 'payment_events',
      'upgrade_eligibility', 'free_vehicle_checks', 'professional_profiles',
      'professional_clients', 'professional_case_financials',
      'account_deletion_requests', 'legal_acceptances',
      'registration_authorizations'
    ]::text[]) table_name
    where has_table_privilege(
      'anon', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE'
    )
  ),
  0::bigint,
  'anon has no access-table privileges'
);

select is(
  (
    select count(*)
    from unnest(array[
      'profiles', 'user_licenses', 'license_events', 'purchases', 'payment_events',
      'upgrade_eligibility', 'free_vehicle_checks', 'registration_authorizations',
      'professional_profiles', 'professional_clients', 'professional_case_financials'
    ]::text[]) table_name
    where has_table_privilege(
      'authenticated', 'public.' || table_name, 'INSERT,UPDATE,DELETE'
    )
  ),
  0::bigint,
  'authenticated cannot mutate authoritative ledgers or bypass Professional APIs'
);

select is(
  (
    select count(*)
    from unnest(array[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ]::text[]) privilege_name
    where has_table_privilege(
      'authenticated', 'public.registration_authorizations', privilege_name
    )
  ),
  0::bigint,
  'authenticated cannot read or mutate trusted registration authorizations'
);

select is(
  (
    select count(*)
    from unnest(array[
      'user_licenses', 'license_events', 'purchases', 'upgrade_eligibility'
    ]::text[]) table_name
    where has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')
  ),
  4::bigint,
  'authenticated can read only its own non-sensitive access history through RLS'
);

select ok(
  not has_table_privilege('authenticated', 'public.payment_events', 'SELECT'),
  'authenticated cannot read the provider event ledger'
);

select is(
  (
    select count(*)
    from (values
      ('user_licenses', 'SELECT'),
      ('license_events', 'SELECT'),
      ('purchases', 'SELECT'),
      ('payment_events', 'SELECT,INSERT,UPDATE'),
      ('upgrade_eligibility', 'SELECT'),
      ('registration_authorizations', 'SELECT,INSERT,DELETE')
    ) expected(table_name, privileges)
    cross join lateral unnest(string_to_array(expected.privileges, ',')) privilege_name
    where not has_table_privilege(
      'service_role', 'public.' || expected.table_name, privilege_name
    )
  ),
  0::bigint,
  'service_role has only the explicit direct privileges needed by trusted repositories'
);

select is(
  (
    select count(*)
    from (values
      ('user_licenses', 'INSERT'),
      ('user_licenses', 'UPDATE'),
      ('user_licenses', 'DELETE'),
      ('user_licenses', 'TRUNCATE'),
      ('user_licenses', 'REFERENCES'),
      ('user_licenses', 'TRIGGER'),
      ('license_events', 'INSERT'),
      ('license_events', 'UPDATE'),
      ('license_events', 'DELETE'),
      ('license_events', 'TRUNCATE'),
      ('license_events', 'REFERENCES'),
      ('license_events', 'TRIGGER'),
      ('purchases', 'INSERT'),
      ('purchases', 'UPDATE'),
      ('purchases', 'DELETE'),
      ('purchases', 'TRUNCATE'),
      ('purchases', 'REFERENCES'),
      ('purchases', 'TRIGGER'),
      ('upgrade_eligibility', 'INSERT'),
      ('upgrade_eligibility', 'UPDATE'),
      ('upgrade_eligibility', 'DELETE'),
      ('upgrade_eligibility', 'TRUNCATE'),
      ('upgrade_eligibility', 'REFERENCES'),
      ('upgrade_eligibility', 'TRIGGER'),
      ('payment_events', 'DELETE'),
      ('payment_events', 'TRUNCATE'),
      ('payment_events', 'REFERENCES'),
      ('payment_events', 'TRIGGER'),
      ('registration_authorizations', 'UPDATE'),
      ('registration_authorizations', 'TRUNCATE'),
      ('registration_authorizations', 'REFERENCES'),
      ('registration_authorizations', 'TRIGGER')
    ) forbidden(table_name, privilege_name)
    where has_table_privilege(
      'service_role', 'public.' || forbidden.table_name, forbidden.privilege_name
    )
  ),
  0::bigint,
  'service_role cannot bypass payment RPCs or mutate forbidden trusted-ledger operations'
);

select is(
  (
    select count(*) from unnest(array[
      'public.reserve_access_purchase(uuid,text,text,text,bigint,bigint,bigint,text,integer,text,text,timestamp with time zone,text,bigint,bigint,uuid)',
      'public.bind_access_checkout_session(uuid,text)',
      'public.cancel_access_purchase(uuid,text)',
      'public.record_ignored_access_payment_event(text,text,timestamp with time zone,text,text,uuid)',
      'public.process_verified_access_payment(text,text,timestamp with time zone,text,uuid,text,text,text,bigint,text)',
      'public.process_verified_access_reversal(text,text,timestamp with time zone,text,uuid,text,text,bigint)',
      'public.process_access_checkout_expired(text,text,timestamp with time zone,text,uuid,text)',
      'public.expire_due_user_licenses(timestamp with time zone)',
      'public.mark_access_payment_event_failed(text,text)'
    ]::text[]) signature
    where has_function_privilege('anon', signature, 'EXECUTE')
  ),
  0::bigint,
  'anon cannot execute any payment mutation RPC'
);

select is(
  (
    select count(*) from unnest(array[
      'public.reserve_access_purchase(uuid,text,text,text,bigint,bigint,bigint,text,integer,text,text,timestamp with time zone,text,bigint,bigint,uuid)',
      'public.bind_access_checkout_session(uuid,text)',
      'public.cancel_access_purchase(uuid,text)',
      'public.record_ignored_access_payment_event(text,text,timestamp with time zone,text,text,uuid)',
      'public.process_verified_access_payment(text,text,timestamp with time zone,text,uuid,text,text,text,bigint,text)',
      'public.process_verified_access_reversal(text,text,timestamp with time zone,text,uuid,text,text,bigint)',
      'public.process_access_checkout_expired(text,text,timestamp with time zone,text,uuid,text)',
      'public.expire_due_user_licenses(timestamp with time zone)',
      'public.mark_access_payment_event_failed(text,text)'
    ]::text[]) signature
    where has_function_privilege('authenticated', signature, 'EXECUTE')
  ),
  0::bigint,
  'authenticated cannot execute any payment mutation RPC'
);

select is(
  (
    select count(*) from unnest(array[
      'public.reserve_access_purchase(uuid,text,text,text,bigint,bigint,bigint,text,integer,text,text,timestamp with time zone,text,bigint,bigint,uuid)',
      'public.bind_access_checkout_session(uuid,text)',
      'public.cancel_access_purchase(uuid,text)',
      'public.record_ignored_access_payment_event(text,text,timestamp with time zone,text,text,uuid)',
      'public.process_verified_access_payment(text,text,timestamp with time zone,text,uuid,text,text,text,bigint,text)',
      'public.process_verified_access_reversal(text,text,timestamp with time zone,text,uuid,text,text,bigint)',
      'public.process_access_checkout_expired(text,text,timestamp with time zone,text,uuid,text)',
      'public.expire_due_user_licenses(timestamp with time zone)',
      'public.mark_access_payment_event_failed(text,text)'
    ]::text[]) signature
    where has_function_privilege('service_role', signature, 'EXECUTE')
  ),
  9::bigint,
  'service_role alone can execute all nine payment mutation RPCs'
);

select ok(
  has_function_privilege('authenticated', 'public.get_my_access_context()', 'EXECUTE'),
  'authenticated can read its server-derived access context'
);

select is(
  (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any(array[
        'has_active_access', 'can_manage_real_cases', 'get_my_access_context'
      ]::text[])
      and procedure.prosecdef
      and array_to_string(procedure.proconfig, ',') like '%search_path=pg_catalog, public%'
  ),
  3::bigint,
  'access SECURITY DEFINER functions fix their search_path'
);

select is(
  (select count(*) from pg_views where schemaname = 'public' and viewname like '%founder%'),
  0::bigint,
  'no Founder view remains operational'
);

select is(
  (
    select count(*) from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any(array[
        'activate_founder_by_email', 'next_founder_number', 'founder_purchase_is_eligible'
      ]::text[])
  ),
  0::bigint,
  'no Founder entitlement function remains operational'
);

select is(
  (
    select count(*) from unnest(array[
      'pending_founder_purchases', 'stripe_webhook_events'
    ]::text[]) table_name
    where has_table_privilege(
      'service_role', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE'
    )
  ),
  0::bigint,
  'retired Founder ledgers have no application-role privileges'
);

select ok(
  exists (
    select 1 from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.profiles'::regclass
      and constraint_record.conname = 'profiles_access_level_valid'
      and pg_get_constraintdef(constraint_record.oid) =
        'CHECK ((access_level = ''free''::text))'
  ),
  'profile compatibility tier is constrained to free only'
);

select is(
  public.calculate_license_expiry('2025-01-31 12:30:00+00', 'one_month'),
  '2025-02-28 12:30:00+00'::timestamptz,
  '31 January clamps to the last February day'
);

select is(
  public.calculate_license_expiry('2024-01-31 12:30:00+00', 'one_month'),
  '2024-02-29 12:30:00+00'::timestamptz,
  'leap-year expiration uses 29 February'
);

select is(
  public.calculate_license_expiry('2024-02-29 12:30:00+00', 'twelve_months'),
  '2025-02-28 12:30:00+00'::timestamptz,
  'twelve-month expiration remains calendar-based'
);

select is(
  (
    select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'legal_acceptances'
      and column_name in ('ip', 'ip_address', 'user_agent')
  ),
  0::bigint,
  'legal acceptance does not collect IP or user-agent just in case'
);

select ok(
  exists (select 1 from pg_indexes where schemaname = 'public'
    and indexname = 'payment_events_provider_event_id_key'),
  'provider event ID has a unique constraint for webhook idempotency'
);

select ok(
  exists (select 1 from pg_indexes where schemaname = 'public'
    and indexname = 'purchases_user_id_idempotency_key_key'),
  'purchase idempotency key is unique per user'
);

select ok(
  exists (select 1 from pg_indexes where schemaname = 'public'
    and indexname = 'purchases_one_pending_per_user_idx'),
  'a user cannot open two concurrently payable Checkout purchases'
);

select ok(
  exists (select 1 from pg_indexes where schemaname = 'public'
    and indexname = 'user_licenses_one_active_paid_per_user_idx'),
  'only one paid licence can be materially active per user'
);

select ok(
  exists (select 1 from pg_indexes where schemaname = 'public'
    and indexname = 'upgrade_eligibility_source_license_id_key'),
  'one-month source licence has at most one promotional eligibility record'
);

select throws_ok(
  $$insert into auth.users (
      id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
    ) values (
      '30000000-0000-4000-8000-000000000099',
      'unauthorized@example.test', now(), '{}'::jsonb, '{}'::jsonb
    )$$,
  '22023', null,
  'direct auth insertion without a trusted one-time registration token is rejected'
);

insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
)
select
  email,
  encode(extensions.digest(registration_token, 'sha256'), 'hex'),
  display_name,
  '2026-08-v1',
  '2026-08-v1',
  now() + interval '10 minutes'
from (values
  (
    'professional-a@example.test',
    'pgtap_registration_token_00000001',
    'Professional A'
  ),
  (
    'expired-b@example.test',
    'pgtap_registration_token_00000002',
    'Expired B'
  ),
  (
    'unconfirmed-c@example.test',
    'pgtap_registration_token_00000003',
    'Unconfirmed C'
  )
) authorization(email, registration_token, display_name);

insert into auth.users (
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    'professional-a@example.test',
    now(),
    '{"mpro_access_level":"professional","tier":"professional"}'::jsonb,
    '{"display_name":"Professional A","tier":"professional","registration_token":"pgtap_registration_token_00000001"}'::jsonb
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'expired-b@example.test',
    now(),
    '{"mpro_access_level":"professional"}'::jsonb,
    '{"display_name":"Expired B","registration_token":"pgtap_registration_token_00000002"}'::jsonb
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    'unconfirmed-c@example.test',
    null,
    '{"mpro_access_level":"professional"}'::jsonb,
    '{"display_name":"Unconfirmed C","registration_token":"pgtap_registration_token_00000003"}'::jsonb
  );

select is(
  (select access_level from public.profiles where id = '30000000-0000-4000-8000-000000000001'),
  'free',
  'client-controlled auth metadata cannot grant access'
);

select is(
  (select count(*) from public.user_licenses where tier = 'free'
    and user_id in (
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002'
    )),
  2::bigint,
  'confirmed users receive exactly one free licence automatically'
);

select is(
  (select count(*) from public.user_licenses
    where user_id = '30000000-0000-4000-8000-000000000003'),
  0::bigint,
  'unconfirmed email does not receive even free application access'
);

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_payment_intent_id, paid_at
) values
  (
    '30000000-0000-4000-8000-000000000101',
    '30000000-0000-4000-8000-000000000001',
    'professional', 'one_month', 'paid', 'professional_a_purchase_0001',
    10661, 2239, 12900, 12900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_professionaltest', 'cs_test_professional', 'pi_professional', now() - interval '1 day'
  ),
  (
    '30000000-0000-4000-8000-000000000102',
    '30000000-0000-4000-8000-000000000002',
    'particular', 'one_month', 'paid', 'expired_b_purchase_000001',
    6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_particulartest', 'cs_test_expired', 'pi_expired', now() - interval '2 months'
  );

insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id
) values
  (
    '30000000-0000-4000-8000-000000000201',
    '30000000-0000-4000-8000-000000000001',
    'professional', 'one_month', 'active', now() - interval '1 day',
    public.calculate_license_expiry(now() - interval '1 day', 'one_month'),
    '30000000-0000-4000-8000-000000000101'
  ),
  (
    '30000000-0000-4000-8000-000000000202',
    '30000000-0000-4000-8000-000000000002',
    'particular', 'one_month', 'expired', now() - interval '2 months',
    public.calculate_license_expiry(now() - interval '2 months', 'one_month'),
    '30000000-0000-4000-8000-000000000102'
  );

update public.purchases set resulting_license_id =
  case id
    when '30000000-0000-4000-8000-000000000101' then '30000000-0000-4000-8000-000000000201'::uuid
    else '30000000-0000-4000-8000-000000000202'::uuid
  end
where id in (
  '30000000-0000-4000-8000-000000000101',
  '30000000-0000-4000-8000-000000000102'
);

insert into public.registration_cases (id, user_id, title, is_active)
values
  (
    '30000000-0000-4000-8000-000000000301',
    '30000000-0000-4000-8000-000000000001',
    'Professional A case', true
  ),
  (
    '30000000-0000-4000-8000-000000000302',
    '30000000-0000-4000-8000-000000000002',
    'Expired B case', true
  );

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, upgrade_credit_cents, amount_due_cents,
  currency, vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, source_license_id
) values (
  '30000000-0000-4000-8000-000000000103',
  '30000000-0000-4000-8000-000000000001',
  'professional', 'six_months', 'pending', 'professional_upgrade_00001',
  24711, 5189, 29900, 12900, 17000,
  'EUR', 2100, 'ES', 'pgtap', now(), 'price_professional6test',
  '30000000-0000-4000-8000-000000000201'
);

select is(
  (select amount_due_base_cents from public.purchases
    where id = '30000000-0000-4000-8000-000000000103'),
  14050::bigint,
  'gross upgrade credit produces the correct payable VAT base'
);

select is(
  (select amount_due_vat_cents from public.purchases
    where id = '30000000-0000-4000-8000-000000000103'),
  2950::bigint,
  'gross upgrade credit preserves the exact payable VAT amount'
);

-- Exercise the service-only state machine itself, without trusting browser or
-- Stripe metadata. Transaction-level now() makes the exact day-15 boundary
-- deterministic.
insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
)
select
  email,
  encode(extensions.digest(registration_token, 'sha256'), 'hex'),
  display_name,
  '2026-08-v1',
  '2026-08-v1',
  now() + interval '10 minutes'
from (values
  ('day15-d@example.test', 'pgtap_registration_token_00000004', 'Day 15 D'),
  ('late-e@example.test', 'pgtap_registration_token_00000005', 'Late E'),
  ('payment-f@example.test', 'pgtap_registration_token_00000006', 'Payment F'),
  ('expiry-g@example.test', 'pgtap_registration_token_00000007', 'Expiry G'),
  ('free-legacy-h@example.test', 'pgtap_registration_token_00000008', 'Free Legacy H'),
  ('refunded-i@example.test', 'pgtap_registration_token_00000009', 'Refunded I'),
  ('revoked-j@example.test', 'pgtap_registration_token_00000010', 'Revoked J'),
  ('renewal-k@example.test', 'pgtap_registration_token_00000011', 'Renewal K'),
  ('receipt-l@example.test', 'pgtap_registration_token_00000012', 'Receipt L')
) authorization(email, registration_token, display_name);

insert into auth.users (
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
)
select id, email, now(), '{}'::jsonb,
  jsonb_build_object('registration_token', registration_token)
from (values
  (
    '30000000-0000-4000-8000-000000000004'::uuid,
    'day15-d@example.test', 'pgtap_registration_token_00000004'
  ),
  (
    '30000000-0000-4000-8000-000000000005'::uuid,
    'late-e@example.test', 'pgtap_registration_token_00000005'
  ),
  (
    '30000000-0000-4000-8000-000000000006'::uuid,
    'payment-f@example.test', 'pgtap_registration_token_00000006'
  ),
  (
    '30000000-0000-4000-8000-000000000007'::uuid,
    'expiry-g@example.test', 'pgtap_registration_token_00000007'
  ),
  (
    '30000000-0000-4000-8000-000000000008'::uuid,
    'free-legacy-h@example.test', 'pgtap_registration_token_00000008'
  ),
  (
    '30000000-0000-4000-8000-000000000009'::uuid,
    'refunded-i@example.test', 'pgtap_registration_token_00000009'
  ),
  (
    '30000000-0000-4000-8000-000000000010'::uuid,
    'revoked-j@example.test', 'pgtap_registration_token_00000010'
  ),
  (
    '30000000-0000-4000-8000-000000000011'::uuid,
    'renewal-k@example.test', 'pgtap_registration_token_00000011'
  ),
  (
    '30000000-0000-4000-8000-000000000012'::uuid,
    'receipt-l@example.test', 'pgtap_registration_token_00000012'
  )
) users(id, email, registration_token);

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_payment_intent_id,
  paid_at, refunded_at, disputed_at
) values
  (
    '30000000-0000-4000-8000-000000000109',
    '30000000-0000-4000-8000-000000000009',
    'particular', 'one_month', 'refunded', 'refunded_history_0001',
    6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_refundedhistory', 'cs_test_refundedhistory', 'pi_refundedhistory',
    now() - interval '2 months', now() - interval '1 month', null
  ),
  (
    '30000000-0000-4000-8000-000000000110',
    '30000000-0000-4000-8000-000000000010',
    'professional', 'one_month', 'disputed', 'revoked_history_00001',
    10661, 2239, 12900, 12900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_revokedhistory', 'cs_test_revokedhistory', 'pi_revokedhistory',
    now() - interval '2 months', null, now() - interval '1 month'
  ),
  (
    '30000000-0000-4000-8000-000000000111',
    '30000000-0000-4000-8000-000000000011',
    'particular', 'one_month', 'paid', 'renewal_history_00001',
    6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_renewalhistory', 'cs_test_renewalhistory', 'pi_renewalhistory',
    now() - interval '2 months', null, null
  ),
  (
    '30000000-0000-4000-8000-000000000112',
    '30000000-0000-4000-8000-000000000009',
    'particular', 'one_month', 'paid', 'older_refunded_history_1',
    6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_oldrefundhistory', 'cs_test_oldrefundhistory', 'pi_oldrefundhistory',
    now() - interval '4 months', null, null
  ),
  (
    '30000000-0000-4000-8000-000000000113',
    '30000000-0000-4000-8000-000000000010',
    'professional', 'one_month', 'paid', 'older_revoked_history_1',
    10661, 2239, 12900, 12900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_oldrevokedhistory', 'cs_test_oldrevokedhistory', 'pi_oldrevokedhistory',
    now() - interval '4 months', null, null
  );

insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id
) values
  (
    '30000000-0000-4000-8000-000000000209',
    '30000000-0000-4000-8000-000000000009',
    'particular', 'one_month', 'refunded', now() - interval '2 months',
    public.calculate_license_expiry(now() - interval '2 months', 'one_month'),
    '30000000-0000-4000-8000-000000000109'
  ),
  (
    '30000000-0000-4000-8000-000000000210',
    '30000000-0000-4000-8000-000000000010',
    'professional', 'one_month', 'revoked', now() - interval '2 months',
    public.calculate_license_expiry(now() - interval '2 months', 'one_month'),
    '30000000-0000-4000-8000-000000000110'
  ),
  (
    '30000000-0000-4000-8000-000000000211',
    '30000000-0000-4000-8000-000000000011',
    'particular', 'one_month', 'expired', now() - interval '2 months',
    public.calculate_license_expiry(now() - interval '2 months', 'one_month'),
    '30000000-0000-4000-8000-000000000111'
  ),
  (
    '30000000-0000-4000-8000-000000000212',
    '30000000-0000-4000-8000-000000000009',
    'particular', 'one_month', 'expired', now() - interval '4 months',
    public.calculate_license_expiry(now() - interval '4 months', 'one_month'),
    '30000000-0000-4000-8000-000000000112'
  ),
  (
    '30000000-0000-4000-8000-000000000213',
    '30000000-0000-4000-8000-000000000010',
    'professional', 'one_month', 'expired', now() - interval '4 months',
    public.calculate_license_expiry(now() - interval '4 months', 'one_month'),
    '30000000-0000-4000-8000-000000000113'
  );

update public.purchases
set resulting_license_id = case id
  when '30000000-0000-4000-8000-000000000109' then
    '30000000-0000-4000-8000-000000000209'::uuid
  when '30000000-0000-4000-8000-000000000110' then
    '30000000-0000-4000-8000-000000000210'::uuid
  when '30000000-0000-4000-8000-000000000111' then
    '30000000-0000-4000-8000-000000000211'::uuid
  when '30000000-0000-4000-8000-000000000112' then
    '30000000-0000-4000-8000-000000000212'::uuid
  else '30000000-0000-4000-8000-000000000213'::uuid
end
where id in (
  '30000000-0000-4000-8000-000000000109',
  '30000000-0000-4000-8000-000000000110',
  '30000000-0000-4000-8000-000000000111',
  '30000000-0000-4000-8000-000000000112',
  '30000000-0000-4000-8000-000000000113'
);

insert into public.registration_cases (id, user_id, title, is_active)
values
  (
    '30000000-0000-4000-8000-000000000308',
    '30000000-0000-4000-8000-000000000008',
    'Legacy case created before launch', true
  ),
  (
    '30000000-0000-4000-8000-000000000309',
    '30000000-0000-4000-8000-000000000009',
    'Refunded case history', true
  ),
  (
    '30000000-0000-4000-8000-000000000310',
    '30000000-0000-4000-8000-000000000010',
    'Revoked case history', true
  );

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_payment_intent_id, paid_at
) values
  (
    '30000000-0000-4000-8000-000000000104',
    '30000000-0000-4000-8000-000000000004',
    'particular', 'one_month', 'paid', 'rpc_day15_source_0001',
    6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_rpcday15source', 'cs_test_rpcday15source', 'pi_rpcday15source',
    now() - interval '15 days'
  ),
  (
    '30000000-0000-4000-8000-000000000105',
    '30000000-0000-4000-8000-000000000005',
    'particular', 'one_month', 'paid', 'rpc_late_source_00001',
    6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
    'price_rpclatesource', 'cs_test_rpclatesource', 'pi_rpclatesource',
    now() - interval '15 days 1 second'
  );

insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id
) values
  (
    '30000000-0000-4000-8000-000000000204',
    '30000000-0000-4000-8000-000000000004',
    'particular', 'one_month', 'active', now() - interval '15 days',
    public.calculate_license_expiry(now() - interval '15 days', 'one_month'),
    '30000000-0000-4000-8000-000000000104'
  ),
  (
    '30000000-0000-4000-8000-000000000205',
    '30000000-0000-4000-8000-000000000005',
    'particular', 'one_month', 'active', now() - interval '15 days 1 second',
    public.calculate_license_expiry(now() - interval '15 days 1 second', 'one_month'),
    '30000000-0000-4000-8000-000000000105'
  );

update public.purchases
set resulting_license_id = case id
  when '30000000-0000-4000-8000-000000000104' then
    '30000000-0000-4000-8000-000000000204'::uuid
  else '30000000-0000-4000-8000-000000000205'::uuid
end
where id in (
  '30000000-0000-4000-8000-000000000104',
  '30000000-0000-4000-8000-000000000105'
);

insert into public.upgrade_eligibility (
  user_id, source_license_id, source_purchase_id, tier,
  eligible_from, eligible_until, max_credit_cents, currency, status
) values
  (
    '30000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000204',
    '30000000-0000-4000-8000-000000000104', 'particular',
    now() - interval '15 days', now(), 7900, 'EUR', 'eligible'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000205',
    '30000000-0000-4000-8000-000000000105', 'particular',
    now() - interval '15 days 1 second', now() - interval '1 second',
    7900, 'EUR', 'eligible'
  );

select lives_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000004', 'rpc_day15_upgrade_0001',
    'particular', 'six_months', 14793, 3107, 17900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_particular6rpc', 7900, 10000,
    '30000000-0000-4000-8000-000000000204'
  )$test$,
  'upgrade reservation includes the exact day-15 instant'
);

select is(
  (select status || ':' || amount_due_cents::text from public.purchases
    where user_id = '30000000-0000-4000-8000-000000000004'
      and idempotency_key = 'rpc_day15_upgrade_0001'),
  'pending:10000',
  'day-15 reservation atomically fixes the full one-month credit'
);

do $setup$
begin
  perform pg_temp.record_checkout_acceptances((
    select id from public.purchases
    where user_id = '30000000-0000-4000-8000-000000000004'
      and idempotency_key = 'rpc_day15_upgrade_0001'
  ));
end;
$setup$;

select throws_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000004', 'rpc_tier_change_000001',
    'professional', 'six_months', 24711, 5189, 29900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_professional6rpc', 7900, 22000,
    '30000000-0000-4000-8000-000000000204'
  )$test$,
  '55000', null,
  'promotional upgrade cannot change the source licence tier'
);

select lives_ok(
  $test$select public.bind_access_checkout_session(
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000004'
        and idempotency_key = 'rpc_day15_upgrade_0001'),
    'cs_test_rpcday15upgrade'
  )$test$,
  'day-15 upgrade binds to its test Checkout Session'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_day15_upgrade', 'checkout.session.completed', now(), repeat('3', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000004'
        and idempotency_key = 'rpc_day15_upgrade_0001'),
    'cs_test_rpcday15upgrade', 'pi_rpcday15upgrade',
    'price_particular6rpc', 10000, 'EUR'
  ) ->> 'processed',
  'true',
  'verified payment completes the upgrade reserved at the inclusive day-15 boundary'
);

select is(
  (
    select source.status || ':' || replacement.status || ':' || replacement.duration
    from public.user_licenses source
    join public.user_licenses replacement
      on replacement.upgraded_from_license_id = source.id
    where source.id = '30000000-0000-4000-8000-000000000204'
  ),
  'revoked:active:six_months',
  'paid upgrade revokes its one-month source and activates the longer licence'
);

select is(
  (select count(*) from public.license_events
    where provider_event_id = 'evt_rpc_day15_upgrade'
      and event_type = 'upgraded'),
  1::bigint,
  'paid day-15 upgrade emits one authoritative upgraded event'
);

select throws_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000005', 'rpc_late_upgrade_00001',
    'particular', 'six_months', 14793, 3107, 17900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_particular6late', 7900, 10000,
    '30000000-0000-4000-8000-000000000205'
  )$test$,
  '55000', null,
  'upgrade reservation is rejected one second after day 15'
);

select lives_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000006', 'rpc_normal_payment_0001',
    'particular', 'one_month', 6529, 1371, 7900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_particular1rpc', 0, 7900, null
  )$test$,
  'normal payment reservation succeeds with authoritative terms'
);

set local role service_role;
insert into public.legal_acceptances (
  user_id, purchase_id, document_type, document_version, evidence_source
)
select
  purchase.user_id,
  purchase.id,
  declaration.document_type,
  '2026-08-v1',
  'checkout_confirmation'
from public.purchases purchase
cross join (values
  ('contract_terms'),
  ('immediate_performance'),
  ('withdrawal_acknowledgement')
) declaration(document_type)
where purchase.user_id = '30000000-0000-4000-8000-000000000006'
  and purchase.idempotency_key = 'rpc_normal_payment_0001';
reset role;

select is(
  (
    select count(*)
    from public.legal_acceptances acceptance
    join public.purchases purchase
      on purchase.id = acceptance.purchase_id
     and purchase.user_id = acceptance.user_id
    where purchase.idempotency_key = 'rpc_normal_payment_0001'
      and acceptance.document_type in (
        'contract_terms', 'immediate_performance', 'withdrawal_acknowledgement'
      )
      and acceptance.document_version = '2026-08-v1'
      and acceptance.evidence_source = 'checkout_confirmation'
  ),
  3::bigint,
  'checkout declarations are stored as purchase-linked trusted evidence'
);

select throws_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000006', 'rpc_second_payment_0001',
    'particular', 'one_month', 6529, 1371, 7900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_particular1rpc', 0, 7900, null
  )$test$,
  '23505', null,
  'a second concurrently payable purchase for one user is rejected'
);

select lives_ok(
  $test$select public.bind_access_checkout_session(
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'cs_test_rpcpayment'
  )$test$,
  'pending purchase binds to one test Checkout Session'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_wrong_session', 'checkout.session.completed', now(), repeat('a', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'cs_test_tampered', 'pi_rpcpayment', 'price_particular1rpc', 7900, 'EUR'
  ) ->> 'reason',
  'checkout_session_mismatch',
  'payment RPC rejects a manipulated Checkout Session'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_wrong_price', 'checkout.session.completed', now(), repeat('b', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'cs_test_rpcpayment', 'pi_rpcpayment', 'price_tampered', 7900, 'EUR'
  ) ->> 'reason',
  'price_mismatch',
  'payment RPC rejects a manipulated Price ID'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_wrong_amount', 'checkout.session.completed', now(), repeat('c', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'cs_test_rpcpayment', 'pi_rpcpayment', 'price_particular1rpc', 1, 'EUR'
  ) ->> 'reason',
  'amount_mismatch',
  'payment RPC rejects a manipulated total'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_payment_ok', 'checkout.session.completed', now(), repeat('d', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'cs_test_rpcpayment', 'pi_rpcpayment', 'price_particular1rpc', 7900, 'EUR'
  ) ->> 'processed',
  'true',
  'verified payment atomically activates access'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_payment_ok', 'checkout.session.completed', now(), repeat('d', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'cs_test_rpcpayment', 'pi_rpcpayment', 'price_particular1rpc', 7900, 'EUR'
  ) ->> 'duplicate',
  'true',
  'repeated provider event is idempotent'
);

select is(
  (select count(*) from public.user_licenses
    where user_id = '30000000-0000-4000-8000-000000000006'
      and tier = 'particular' and status = 'active'),
  1::bigint,
  'duplicate webhook creates exactly one active paid licence'
);

select is(
  public.process_verified_access_reversal(
    'evt_rpc_refund', 'charge.refunded', now(), repeat('e', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'pi_rpcpayment', 'refund', 7900
  ) ->> 'processed',
  'true',
  'verified refund is processed atomically'
);

select is(
  (select status from public.user_licenses
    where user_id = '30000000-0000-4000-8000-000000000006'
      and tier = 'particular'),
  'refunded',
  'refund removes active access without deleting history'
);

select throws_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000006', 'rpc_refunded_upgrade_01',
    'particular', 'six_months', 14793, 3107, 17900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_particular6refund', 7900, 10000,
    (select id from public.user_licenses
      where user_id = '30000000-0000-4000-8000-000000000006'
        and tier = 'particular')
  )$test$,
  '55000', null,
  'a refunded source licence cannot claim a promotional upgrade'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_late_activation', 'checkout.session.completed', now(), repeat('f', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'cs_test_rpcpayment', 'pi_rpcpayment', 'price_particular1rpc', 7900, 'EUR'
  ) ->> 'reason',
  'purchase_not_pending_refunded',
  'out-of-order activation cannot restore refunded access'
);

select is(
  public.process_verified_access_reversal(
    'evt_rpc_refund', 'charge.refunded', now(), repeat('e', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000006'
        and idempotency_key = 'rpc_normal_payment_0001'),
    'pi_rpcpayment', 'refund', 7900
  ) ->> 'duplicate',
  'true',
  'repeated refund event is idempotent'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_missing_payment', 'checkout.session.completed', now(), repeat('4', 64),
    '30000000-0000-4000-8000-000000000901',
    'cs_test_missingpayment', 'pi_missingpayment', 'price_missingpayment', 7900, 'EUR'
  ) ->> 'reason',
  'purchase_not_found',
  'unknown payment purchase follows the audited purchase_not_found branch'
);

select is(
  (select processing_status || ':' || coalesce(purchase_id::text, 'null')
    from public.payment_events
    where provider_event_id = 'evt_rpc_missing_payment'),
  'ignored:null',
  'unknown payment is recorded without violating the nullable purchase foreign key'
);

select is(
  public.process_verified_access_reversal(
    'evt_rpc_missing_reversal', 'charge.refunded', now(), repeat('5', 64),
    '30000000-0000-4000-8000-000000000902',
    'pi_missingreversal', 'refund', 7900
  ) ->> 'reason',
  'purchase_not_found',
  'unknown reversal purchase follows the audited purchase_not_found branch'
);

select is(
  (select processing_status || ':' || coalesce(purchase_id::text, 'null')
    from public.payment_events
    where provider_event_id = 'evt_rpc_missing_reversal'),
  'ignored:null',
  'unknown reversal is recorded without violating the nullable purchase foreign key'
);

select is(
  public.process_access_checkout_expired(
    'evt_rpc_missing_expiry', 'checkout.session.expired', now(), repeat('6', 64),
    '30000000-0000-4000-8000-000000000903', 'cs_test_missingexpiry'
  ) ->> 'reason',
  'checkout_session_mismatch',
  'unknown Checkout expiration is ignored without aborting its audit branch'
);

select is(
  (select processing_status || ':' || coalesce(purchase_id::text, 'null')
    from public.payment_events
    where provider_event_id = 'evt_rpc_missing_expiry'),
  'ignored:null',
  'unknown Checkout expiration is recorded without a dangling purchase foreign key'
);

select lives_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000007', 'rpc_expiry_payment_0001',
    'particular', 'one_month', 6529, 1371, 7900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_particular1expiry', 0, 7900, null
  )$test$,
  'checkout-expiry purchase reservation succeeds'
);

do $setup$
begin
  perform pg_temp.record_checkout_acceptances((
    select id from public.purchases
    where user_id = '30000000-0000-4000-8000-000000000007'
      and idempotency_key = 'rpc_expiry_payment_0001'
  ));
end;
$setup$;

select lives_ok(
  $test$select public.bind_access_checkout_session(
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000007'
        and idempotency_key = 'rpc_expiry_payment_0001'),
    'cs_test_rpcexpiry'
  )$test$,
  'checkout-expiry purchase binds to a test Session'
);

select is(
  public.process_access_checkout_expired(
    'evt_rpc_expiry', 'checkout.session.expired', now(), repeat('1', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000007'
        and idempotency_key = 'rpc_expiry_payment_0001'),
    'cs_test_rpcexpiry'
  ) ->> 'processed',
  'true',
  'signed Checkout expiration cancels its pending reservation'
);

select is(
  (select status from public.purchases
    where user_id = '30000000-0000-4000-8000-000000000007'
      and idempotency_key = 'rpc_expiry_payment_0001'),
  'cancelled',
  'expired Checkout is no longer payable in the purchase ledger'
);

select is(
  public.process_access_checkout_expired(
    'evt_rpc_expiry', 'checkout.session.expired', now(), repeat('1', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000007'
        and idempotency_key = 'rpc_expiry_payment_0001'),
    'cs_test_rpcexpiry'
  ) ->> 'duplicate',
  'true',
  'repeated Checkout expiration event is idempotent'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_after_expiry', 'checkout.session.completed', now(), repeat('2', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000007'
        and idempotency_key = 'rpc_expiry_payment_0001'),
    'cs_test_rpcexpiry', 'pi_rpcexpiry', 'price_particular1expiry', 7900, 'EUR'
  ) ->> 'reason',
  'purchase_not_pending_cancelled',
  'out-of-order payment cannot activate an expired Checkout'
);

select lives_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000011', 'rpc_renewal_payment_0001',
    'particular', 'six_months', 14793, 3107, 17900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_particular6renewal', 0, 17900, null
  )$test$,
  'an expired paid user can reserve a normal renewal'
);

do $setup$
begin
  perform pg_temp.record_checkout_acceptances((
    select id from public.purchases
    where user_id = '30000000-0000-4000-8000-000000000011'
      and idempotency_key = 'rpc_renewal_payment_0001'
  ));
end;
$setup$;

select lives_ok(
  $test$select public.bind_access_checkout_session(
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000011'
        and idempotency_key = 'rpc_renewal_payment_0001'),
    'cs_test_rpcrenewal'
  )$test$,
  'renewal binds to its test Checkout Session'
);

select is(
  public.process_verified_access_payment(
    'evt_rpc_renewal', 'checkout.session.completed', now(), repeat('7', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000011'
        and idempotency_key = 'rpc_renewal_payment_0001'),
    'cs_test_rpcrenewal', 'pi_rpcrenewal',
    'price_particular6renewal', 17900, 'EUR'
  ) ->> 'processed',
  'true',
  'verified payment activates access after genuine expiry'
);

select is(
  (select event_type || ':' || reason_code from public.license_events
    where provider_event_id = 'evt_rpc_renewal'),
  'renewed:manual_renewal',
  'payment after genuine expiry emits renewed instead of a first activation'
);

select lives_ok(
  $test$select public.reserve_access_purchase(
    '30000000-0000-4000-8000-000000000012', 'rpc_receipt_expiry_0001',
    'particular', 'one_month', 6529, 1371, 7900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_particular1receipt', 0, 7900, null
  )$test$,
  'receipt retry fixture reserves a pending purchase'
);

do $setup$
begin
  perform pg_temp.record_checkout_acceptances((
    select id from public.purchases
    where user_id = '30000000-0000-4000-8000-000000000012'
      and idempotency_key = 'rpc_receipt_expiry_0001'
  ));
end;
$setup$;

select lives_ok(
  $test$select public.bind_access_checkout_session(
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000012'
        and idempotency_key = 'rpc_receipt_expiry_0001'),
    'cs_test_rpcreceipt'
  )$test$,
  'receipt retry fixture binds its test Checkout Session'
);

insert into public.payment_events (
  provider_event_id, event_type, livemode, purchase_id, payload_sha256,
  processing_status, attempts, event_created_at
) values (
  'evt_rpc_receipt_expiry', 'checkout.session.expired', false, null,
  repeat('8', 64), 'processing', 1, now()
);

select is(
  public.process_access_checkout_expired(
    'evt_rpc_receipt_expiry', 'checkout.session.expired', now(), repeat('8', 64),
    (select id from public.purchases
      where user_id = '30000000-0000-4000-8000-000000000012'
        and idempotency_key = 'rpc_receipt_expiry_0001'),
    'cs_test_rpcreceipt'
  ) ->> 'processed',
  'true',
  'a pre-existing processing receipt does not block Checkout expiration'
);

select is(
  (
    select purchase.status || ':' || event.processing_status || ':' || event.attempts::text
    from public.purchases purchase
    join public.payment_events event on event.purchase_id = purchase.id
    where purchase.user_id = '30000000-0000-4000-8000-000000000012'
      and purchase.idempotency_key = 'rpc_receipt_expiry_0001'
      and event.provider_event_id = 'evt_rpc_receipt_expiry'
  ),
  'cancelled:processed:1',
  'Checkout expiration consumes the receipt and records one real processing attempt'
);

insert into public.payment_events (
  provider_event_id, event_type, livemode, purchase_id, payload_sha256,
  processing_status, attempts, event_created_at
) values (
  'evt_rpc_repeated_failure', 'checkout.session.completed', false, null,
  repeat('9', 64), 'processing', 1, now()
);

do $failure_attempts$
begin
  perform public.mark_access_payment_event_failed('evt_rpc_repeated_failure', 'first_failure');
  perform public.mark_access_payment_event_failed('evt_rpc_repeated_failure', 'second_failure');
end;
$failure_attempts$;

select is(
  (select processing_status || ':' || attempts::text
   from public.payment_events
   where provider_event_id = 'evt_rpc_repeated_failure'),
  'failed:2',
  'separately committed repeated failures retain an exact attempt count'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.user_licenses),
  2::bigint,
  'user A sees only its own free and paid licences'
);

select is(
  public.get_my_access_context() ->> 'tier',
  'professional',
  'database context derives Professional from the active licence'
);

select is(
  public.get_my_access_context() ->> 'mode',
  'full',
  'active licence grants full mode'
);

select ok(public.can_manage_real_cases(), 'active Professional can manage full cases');

select is(
  (select count(*) from public.registration_cases),
  1::bigint,
  'user A sees only its own registration case'
);

select is(
  (
    with changed as (
      update public.registration_cases
      set title = 'Professional A updated case'
      where id = '30000000-0000-4000-8000-000000000301'
      returning 1
    )
    select count(*) from changed
  ),
  1::bigint,
  'active paid user can update its own registration case'
);

select throws_ok(
  $$insert into public.professional_clients (display_name) values ('Client A')$$,
  '42501', null,
  'authenticated cannot bypass the rate-limited Professional API'
);

select throws_ok(
  $$select public.record_legal_acceptance('contract_terms', '2026-08-v1')$$,
  '22023', null,
  'authenticated acceptance RPC cannot forge checkout-specific declarations'
);

select lives_ok(
  $$select public.record_legal_acceptance('terms', '2026-08-v1'),
    public.record_legal_acceptance('terms', '2026-08-v1')$$,
  'current legal acceptance RPC is idempotent'
);

select is(
  (select count(*) from public.legal_acceptances
    where document_type = 'terms' and document_version = '2026-08-v1'),
  1::bigint,
  'repeated current-version acceptance keeps one append-only record'
);

select lives_ok(
  $$select public.request_account_deletion('test'),
    public.request_account_deletion('test')$$,
  'account deletion request RPC is idempotent'
);

select is(
  (select count(*) from public.account_deletion_requests where status = 'requested'),
  1::bigint,
  'repeated deletion request creates one open record'
);

select throws_ok(
  $$insert into public.user_licenses (user_id, tier, duration, status)
    values (auth.uid(), 'professional', null, 'free')$$,
  '42501',
  null,
  'authenticated user cannot forge a licence row'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);

select is(
  public.get_my_access_context() ->> 'mode',
  'read_only',
  'expired paid user retains read-only case access'
);

select ok(not public.can_manage_real_cases(), 'expired user cannot mutate full cases');

select is(
  (select count(*) from public.registration_cases),
  1::bigint,
  'expired user B retains read-only visibility of only its own case'
);

select is(
  (
    with changed as (
      update public.registration_cases
      set title = 'Forbidden expired update'
      where id = '30000000-0000-4000-8000-000000000302'
      returning 1
    )
    select count(*) from changed
  ),
  0::bigint,
  'expired user cannot update its retained registration case'
);

select throws_ok(
  $$insert into public.professional_clients (display_name) values ('Forbidden')$$,
  '42501',
  null,
  'expired Particular cannot create professional clients'
);

select is(
  (select count(*) from public.professional_clients),
  0::bigint,
  'user B cannot see user A professional clients'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000008', true);

select is(
  (select count(*) from public.registration_cases),
  0::bigint,
  'free user cannot SELECT an owned case inherited from before launch'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000009', true);

select is(
  public.get_my_access_context() ->> 'mode',
  'read_only',
  'refunded licence retains read-only history without paid writes'
);

select is(
  (select count(*) from public.registration_cases),
  1::bigint,
  'refunded user can SELECT retained paid-case history'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000010', true);

select is(
  public.get_my_access_context() ->> 'mode',
  'read_only',
  'revoked licence retains read-only history without paid writes'
);

select is(
  (select count(*) from public.registration_cases),
  1::bigint,
  'revoked user can SELECT retained paid-case history'
);

select is(
  public.can_view_professional_history(),
  true,
  'a revoked Professional licence retains historical read access'
);

reset role;

select ok(
  position('has_active_access' in pg_get_functiondef('public.can_manage_real_cases()'::regprocedure)) > 0
  and position('profiles' in pg_get_functiondef('public.can_manage_real_cases()'::regprocedure)) = 0,
  'case authorization depends on licences and never profile metadata'
);

select * from finish();
rollback;
