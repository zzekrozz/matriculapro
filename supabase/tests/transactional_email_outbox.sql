-- Run with: supabase test db
-- Reference-only transactional email outbox and service-role boundary.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.transactional_email_outbox'::regclass),
  'RLS is enabled on the transactional email outbox'
);

select ok(
  not has_table_privilege('anon', 'public.transactional_email_outbox', 'SELECT,INSERT,UPDATE,DELETE'),
  'anon has no outbox table privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.transactional_email_outbox', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated has no outbox table privileges'
);
select ok(
  not has_table_privilege('service_role', 'public.transactional_email_outbox', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role uses controlled RPCs rather than direct table access'
);

select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactional_email_outbox'
      and column_name ~ '(recipient|email_address|subject|body|html|text|token|otp|payload)'
  ),
  0::bigint,
  'outbox has no recipient, content, token, OTP or payload column'
);

select is(
  (
    select count(*)
    from unnest(array[
      'public.schedule_due_transactional_emails(timestamp with time zone)',
      'public.claim_transactional_email_batch(uuid,integer,timestamp with time zone)',
      'public.complete_transactional_email(uuid,uuid,text)',
      'public.fail_transactional_email(uuid,uuid,text,timestamp with time zone)'
    ]::text[]) signature
    where has_function_privilege('service_role', signature, 'EXECUTE')
  ),
  4::bigint,
  'service_role can execute the four controlled worker RPCs'
);

select is(
  (
    select count(*)
    from unnest(array['anon', 'authenticated']) role_name
    cross join unnest(array[
      'public.schedule_due_transactional_emails(timestamp with time zone)',
      'public.claim_transactional_email_batch(uuid,integer,timestamp with time zone)',
      'public.complete_transactional_email(uuid,uuid,text)',
      'public.fail_transactional_email(uuid,uuid,text,timestamp with time zone)'
    ]::text[]) signature
    where has_function_privilege(role_name, signature, 'EXECUTE')
  ),
  0::bigint,
  'anon and authenticated cannot execute worker RPCs'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.enqueue_transactional_email_reference(text,uuid,uuid,uuid,uuid,text,timestamp with time zone)',
    'EXECUTE'
  ),
  'service_role cannot bypass trigger/scheduler event creation'
);

insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
) values (
  'outbox-test@localhost.invalid',
  encode(extensions.digest('outbox-registration-token-000000000001', 'sha256'), 'hex'),
  'Outbox Test', '2026-08-v1', '2026-08-v1', now() + interval '10 minutes'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '80000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'outbox-test@localhost.invalid', '',
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"registration_token":"outbox-registration-token-000000000001"}'::jsonb,
  now(), now()
);

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, upgrade_credit_cents, amount_due_cents,
  currency, vat_rate_basis_points, tax_country, tax_included,
  price_source, price_effective_at, stripe_price_id, stripe_checkout_session_id
) values (
  '80000000-0000-4000-8000-000000000101',
  '80000000-0000-4000-8000-000000000001',
  'particular', 'one_month', 'pending', 'outbox_test_purchase_0001',
  6529, 1371, 7900, 0, 7900,
  'EUR', 2100, 'ES', true,
  'outbox-test', '2026-08-05T00:00:00Z', 'price_OutboxTest01', 'cs_test_outbox_01'
);

insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id
) values (
  '80000000-0000-4000-8000-000000000201',
  '80000000-0000-4000-8000-000000000001',
  'particular', 'one_month', 'active',
  '2026-07-10T10:00:00Z', '2026-08-10T10:00:00Z',
  '80000000-0000-4000-8000-000000000101'
);

insert into public.license_events (
  user_id, license_id, purchase_id, event_type, new_status, occurred_at
) values (
  '80000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000201',
  '80000000-0000-4000-8000-000000000101',
  'activated', 'active', '2026-07-10T10:00:00Z'
);

update public.purchases
set status = 'paid',
    resulting_license_id = '80000000-0000-4000-8000-000000000201',
    stripe_payment_intent_id = 'pi_OutboxTest01',
    paid_at = '2026-07-10T10:00:00Z'
where id = '80000000-0000-4000-8000-000000000101';

insert into public.license_events (
  user_id, license_id, purchase_id, event_type, new_status, occurred_at
) values
  (
    '80000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000201',
    '80000000-0000-4000-8000-000000000101',
    'upgraded', 'active', '2026-07-10T10:01:00Z'
  ),
  (
    '80000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000201',
    '80000000-0000-4000-8000-000000000101',
    'refunded', 'refunded', '2026-07-11T10:00:00Z'
  );

update public.purchases
set status = 'refunded', refunded_at = '2026-07-11T10:00:00Z'
where id = '80000000-0000-4000-8000-000000000101';

update public.user_licenses
set status = 'refunded'
where id = '80000000-0000-4000-8000-000000000201';

-- Existing active licence for another user: migration 008 must not backfill
-- purchase emails, but its scheduler should queue the seven-day reminder.
insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
) values (
  'outbox-reminder@localhost.invalid',
  encode(extensions.digest('outbox-registration-token-000000000002', 'sha256'), 'hex'),
  'Outbox Reminder', '2026-08-v1', '2026-08-v1', now() + interval '10 minutes'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '80000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'outbox-reminder@localhost.invalid', '',
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"registration_token":"outbox-registration-token-000000000002"}'::jsonb,
  now(), now()
);

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, upgrade_credit_cents, amount_due_cents,
  currency, vat_rate_basis_points, tax_country, tax_included,
  price_source, price_effective_at, stripe_price_id, stripe_checkout_session_id,
  stripe_payment_intent_id, paid_at
) values (
  '80000000-0000-4000-8000-000000000102',
  '80000000-0000-4000-8000-000000000002',
  'particular', 'one_month', 'paid', 'outbox_test_purchase_0002',
  6529, 1371, 7900, 0, 7900,
  'EUR', 2100, 'ES', true,
  'outbox-test', '2026-08-05T00:00:00Z', 'price_OutboxTest02', 'cs_test_outbox_02',
  'pi_OutboxTest02', '2026-07-10T10:00:00Z'
);

insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id
) values (
  '80000000-0000-4000-8000-000000000202',
  '80000000-0000-4000-8000-000000000002',
  'particular', 'one_month', 'active',
  now() - interval '25 days',
  public.calculate_license_expiry(now() - interval '25 days', 'one_month'),
  '80000000-0000-4000-8000-000000000102'
);

update public.purchases
set resulting_license_id = '80000000-0000-4000-8000-000000000202'
where id = '80000000-0000-4000-8000-000000000102';

insert into public.account_deletion_requests (
  id, user_id, status, requested_at, reason
) values (
  '80000000-0000-4000-8000-000000000301',
  '80000000-0000-4000-8000-000000000001',
  'requested', '2026-08-05T10:00:00Z', 'outbox test'
);

select is(
  (select count(*) from public.transactional_email_outbox),
  5::bigint,
  'authoritative purchase, licence and deletion transitions queue five product emails'
);

select is(
  (public.schedule_due_transactional_emails(now())->>'expiryReminders')::integer,
  1,
  'scheduler queues a reminder within the seven-day window'
);
select is(
  (public.schedule_due_transactional_emails(now())->>'expiryReminders')::integer,
  0,
  'scheduler is idempotent for the same licence reminder'
);
select is(
  (select count(*) from public.transactional_email_outbox),
  6::bigint,
  'all six distinct event references remain queued once'
);
select is(
  (select count(distinct idempotency_key) from public.transactional_email_outbox),
  6::bigint,
  'every queued email has a unique stable idempotency key'
);

set local role service_role;
create temporary table claimed_email_ids on commit drop as
select * from public.claim_transactional_email_batch(
  '80000000-0000-4000-8000-000000000901', 20, now()
);
reset role;

select is(
  (select count(*) from claimed_email_ids),
  6::bigint,
  'service worker atomically claims all ready events'
);
select is(
  (select count(*) from public.transactional_email_outbox where status = 'processing' and attempt_count = 1),
  6::bigint,
  'claim establishes a first-attempt processing lease'
);

set local role service_role;
select ok(
  public.complete_transactional_email(
    (select id from claimed_email_ids order by id limit 1),
    '80000000-0000-4000-8000-000000000901',
    repeat('a', 64)
  ),
  'worker can acknowledge a leased delivery using only a provider-ID hash'
);
select is(
  public.fail_transactional_email(
    (select id from claimed_email_ids order by id offset 1 limit 1),
    '80000000-0000-4000-8000-000000000901',
    'resend_http_429', now() + interval '1 minute'
  ),
  'failed',
  'worker schedules a sanitized retry after provider failure'
);
reset role;

select is(
  (select count(*) from public.transactional_email_outbox where status = 'sent' and provider_message_id_sha256 = repeat('a', 64)),
  1::bigint,
  'sent row retains only the hashed provider message identifier'
);
select is(
  (select last_error_code from public.transactional_email_outbox where status = 'failed'),
  'resend_http_429',
  'failed row stores a bounded error code rather than provider content'
);

select throws_ok(
  $$select public.complete_transactional_email(
      (select id from public.transactional_email_outbox limit 1),
      '80000000-0000-4000-8000-000000000901',
      'raw-provider-message-id'
    )$$,
  '22023',
  'Invalid provider message hash',
  'raw provider message identifiers cannot be stored'
);

select ok(
  position('recipient addresses' in obj_description('public.transactional_email_outbox'::regclass)) > 0,
  'table documentation explicitly forbids recipient and content storage'
);

select * from finish();
rollback;
