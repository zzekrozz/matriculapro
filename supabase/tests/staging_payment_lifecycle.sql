begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

select has_table('public', 'billing_customers', 'persistent Stripe Customer table exists');
select has_table('public', 'payment_incidents', 'payment incident table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.billing_customers'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.payment_incidents'::regclass),
  'RLS is enabled on billing customers and incidents'
);
select ok(has_table_privilege('authenticated', 'public.billing_customers', 'SELECT'), 'authenticated can read its own billing customer');
select ok(not has_table_privilege('authenticated', 'public.billing_customers', 'INSERT,UPDATE,DELETE'), 'authenticated cannot mutate billing customers');
select ok(not has_table_privilege('authenticated', 'public.payment_incidents', 'SELECT,INSERT,UPDATE,DELETE'), 'authenticated cannot read or resolve incidents directly');
select is(
  (select count(*) from (values
    ('public.claim_billing_customer(uuid,text,text,text)'::regprocedure),
    ('public.record_payment_incident(text,text,jsonb,uuid,uuid,text,text,text)'::regprocedure),
    ('public.reserve_staging_access_purchase(uuid,text,text,text,bigint,bigint,bigint,text,integer,text,text,timestamp with time zone,text,bigint,bigint,text,text,uuid,uuid)'::regprocedure),
    ('public.process_verified_order_independent_payment(text,text,timestamp with time zone,text,uuid,text,text,text,text,text,bigint,text,text,text,numeric,text,bigint,bigint,bigint,text,text,text,text,text,text,text,bigint,bigint,bigint)'::regprocedure),
    ('public.process_verified_final_refund(text,text,timestamp with time zone,text,uuid,text,bigint,bigint,text)'::regprocedure),
    ('public.process_verified_order_independent_dispute(text,text,timestamp with time zone,text,uuid,text,text,text)'::regprocedure),
    ('public.resolve_payment_incident(uuid,text,text)'::regprocedure)
  ) f(signature) where has_function_privilege('service_role', signature, 'EXECUTE')),
  7::bigint,
  'service role can execute all seven staging payment RPCs'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'user_licenses_no_paid_period_overlap'),
  'database has an exclusion constraint against overlapping paid periods'
);

insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
)
select email, encode(extensions.digest(token, 'sha256'), 'hex'), display_name,
  '2026-08-v1', '2026-08-v1', now() + interval '1 hour'
from (values
  ('scheduled@example.test', 'pgtap_staging_token_00000000000001', 'Scheduled User'),
  ('refund@example.test', 'pgtap_staging_token_00000000000002', 'Refund User'),
  ('dispute@example.test', 'pgtap_staging_token_00000000000003', 'Dispute User'),
  ('overlap@example.test', 'pgtap_staging_token_00000000000004', 'Overlap User')
) authorization(email, token, display_name);

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select id, email, now(), '{}'::jsonb, jsonb_build_object('registration_token', token)
from (values
  ('40000000-0000-4000-8000-000000000001'::uuid, 'scheduled@example.test', 'pgtap_staging_token_00000000000001'),
  ('40000000-0000-4000-8000-000000000002'::uuid, 'refund@example.test', 'pgtap_staging_token_00000000000002'),
  ('40000000-0000-4000-8000-000000000003'::uuid, 'dispute@example.test', 'pgtap_staging_token_00000000000003'),
  ('40000000-0000-4000-8000-000000000004'::uuid, 'overlap@example.test', 'pgtap_staging_token_00000000000004')
) users(id, email, token);

insert into public.billing_customers (user_id, stripe_customer_id, email_at_creation, email_current, country)
values
  ('40000000-0000-4000-8000-000000000001', 'cus_pgtap_scheduled', 'scheduled@example.test', 'scheduled@example.test', 'ES'),
  ('40000000-0000-4000-8000-000000000002', 'cus_pgtap_refund', 'refund@example.test', 'refund@example.test', 'ES'),
  ('40000000-0000-4000-8000-000000000003', 'cus_pgtap_dispute', 'dispute@example.test', 'dispute@example.test', 'ES');

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_payment_intent_id,
  stripe_customer_id, amount_paid_cents, paid_at
) values
  ('40000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000001',
   'particular', 'one_month', 'paid', 'scheduled_lifecycle_01',
   6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
   'price_pgtapscheduled', 'cs_test_pgtapscheduled', 'pi_pgtapscheduled',
   'cus_pgtap_scheduled', 7900, now()),
  ('40000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000002',
   'particular', 'six_months', 'paid', 'refund_lifecycle_0001',
   14793, 3107, 17900, 17900, 'EUR', 2100, 'ES', 'pgtap', now(),
   'price_pgtaprefund', 'cs_test_pgtaprefund', 'pi_pgtaprefund',
   'cus_pgtap_refund', 17900, now()),
  ('40000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000003',
   'professional', 'one_month', 'paid', 'dispute_lifecycle_01',
   10661, 2239, 12900, 12900, 'EUR', 2100, 'ES', 'pgtap', now(),
   'price_pgtapdispute', 'cs_test_pgtapdispute', 'pi_pgtapdispute',
   'cus_pgtap_dispute', 12900, now()),
  ('40000000-0000-4000-8000-000000000104', '40000000-0000-4000-8000-000000000004',
   'particular', 'one_month', 'paid', 'overlap_lifecycle_001',
   6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
   'price_pgtapoverlap', 'cs_test_pgtapoverlap', 'pi_pgtapoverlap',
   null, 7900, now());

insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id
) values
  ('40000000-0000-4000-8000-000000000201', '40000000-0000-4000-8000-000000000001',
   'particular', 'one_month', 'scheduled', now() + interval '2 days',
   public.calculate_license_expiry(now() + interval '2 days', 'one_month'),
   '40000000-0000-4000-8000-000000000101'),
  ('40000000-0000-4000-8000-000000000202', '40000000-0000-4000-8000-000000000002',
   'particular', 'six_months', 'active', now() - interval '1 day',
   public.calculate_license_expiry(now() - interval '1 day', 'six_months'),
   '40000000-0000-4000-8000-000000000102'),
  ('40000000-0000-4000-8000-000000000203', '40000000-0000-4000-8000-000000000003',
   'professional', 'one_month', 'active', now() - interval '1 day',
   public.calculate_license_expiry(now() - interval '1 day', 'one_month'),
   '40000000-0000-4000-8000-000000000103'),
  ('40000000-0000-4000-8000-000000000204', '40000000-0000-4000-8000-000000000004',
   'particular', 'one_month', 'active', now() - interval '1 day',
   public.calculate_license_expiry(now() - interval '1 day', 'one_month'),
   '40000000-0000-4000-8000-000000000104');

update public.purchases set resulting_license_id = case id
  when '40000000-0000-4000-8000-000000000102' then '40000000-0000-4000-8000-000000000202'::uuid
  else '40000000-0000-4000-8000-000000000203'::uuid end
where id in ('40000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000103');

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.billing_customers), 1::bigint, 'user sees only its own Stripe Customer');
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000004', true);
select is((select count(*) from public.billing_customers), 0::bigint, 'user cannot see another Stripe Customer');
select throws_ok(
  $$insert into public.billing_customers (user_id, stripe_customer_id, email_at_creation, email_current)
    values ('40000000-0000-4000-8000-000000000004', 'cus_forbidden', 'x@y.test', 'x@y.test')$$,
  '42501', null, 'browser cannot create a Stripe Customer relation'
);
select throws_ok(
  $$select public.resolve_payment_incident('40000000-0000-4000-8000-000000000999', 'resolved', 'forbidden')$$,
  '42501', null, 'browser cannot resolve a payment incident'
);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select is(public.get_my_access_context() ->> 'mode', 'free', 'future scheduled licence grants no early access');
select is(public.get_my_access_context() -> 'scheduledLicense' ->> 'status', 'scheduled', 'future period is exposed separately');
select is(public.has_active_access('particular'), false, 'scheduled period is inactive before starts_at');
reset role;

select throws_ok(
  $$select public.reserve_staging_access_purchase(
    '40000000-0000-4000-8000-000000000001', 'scheduled_second_01',
    'particular', 'one_month', 6529, 1371, 7900, 'EUR', 2100, 'ES',
    'pgtap', now(), 'price_pgtapscheduled2', 0, 7900, 'new',
    'cus_pgtap_scheduled', null, null
  )$$,
  '23505', null, 'a scheduled paid period blocks a second new or upgrade Checkout'
);

select throws_ok(
  $$insert into public.user_licenses (user_id, tier, duration, status, starts_at, expires_at, original_purchase_id)
    values ('40000000-0000-4000-8000-000000000004', 'particular', 'one_month', 'scheduled',
      now(), public.calculate_license_expiry(now(), 'one_month'),
      '40000000-0000-4000-8000-000000000104')$$,
  '23P01', null, 'overlapping paid period is rejected by the database'
);
select lives_ok(
  $$insert into public.user_licenses (user_id, tier, duration, status, starts_at, expires_at, original_purchase_id)
    select user_id, tier, 'one_month', 'scheduled', expires_at,
      public.calculate_license_expiry(expires_at, 'one_month'), original_purchase_id
    from public.user_licenses where id = '40000000-0000-4000-8000-000000000204'$$,
  'an adjacent renewal period is allowed at the half-open boundary'
);

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_partial_1euro', 'charge.refunded', repeat('a', 64), 'processing', now());
select is(
  public.process_verified_staging_refund(
    'evt_partial_1euro', 'charge.refunded', now(), repeat('a', 64),
    '40000000-0000-4000-8000-000000000102', 'pi_pgtaprefund', 100, 17900, 'EUR'
  ) ->> 'reason',
  'partially_refunded', 'one euro refund is partial'
);
select is((select refund_status from public.purchases where id = '40000000-0000-4000-8000-000000000102'), 'partially_refunded', 'purchase stores partial refund state');
select is((select status from public.user_licenses where id = '40000000-0000-4000-8000-000000000202'), 'active', 'partial refund does not revoke licence');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_partial_half', 'refund.updated', repeat('b', 64), 'processing', now() + interval '1 second');
select is(
  public.process_verified_staging_refund(
    'evt_partial_half', 'refund.updated', now() + interval '1 second', repeat('b', 64),
    '40000000-0000-4000-8000-000000000102', 'pi_pgtaprefund', 8950, 17900, 'EUR'
  ) ->> 'reason',
  'partially_refunded', '50 percent cumulative refund remains partial'
);

-- Model a consumed promotional upgrade. A later partial refund of the source
-- purchase must leave the target alive; a cumulative full refund must revoke
-- it and invalidate the promotion.
update public.user_licenses
set status = 'revoked'
where id = '40000000-0000-4000-8000-000000000202';
insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, upgrade_credit_cents, amount_due_cents,
  currency, vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_payment_intent_id,
  stripe_customer_id, source_license_id, purchase_kind, amount_paid_cents, paid_at
) values (
  '40000000-0000-4000-8000-000000000105', '40000000-0000-4000-8000-000000000002',
  'particular', 'twelve_months', 'paid', 'refund_upgrade_000001',
  23058, 4842, 27900, 17900, 10000, 'EUR', 2100, 'ES', 'pgtap', now(),
  'price_pgtaprefundupgrade', 'cs_test_pgtaprefundupgrade', 'pi_pgtaprefundupgrade',
  'cus_pgtap_refund', '40000000-0000-4000-8000-000000000202', 'upgrade', 10000, now()
);
insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at,
  original_purchase_id, upgraded_from_license_id
) values (
  '40000000-0000-4000-8000-000000000205', '40000000-0000-4000-8000-000000000002',
  'particular', 'twelve_months', 'active', now() - interval '1 day',
  public.calculate_license_expiry(now() - interval '1 day', 'twelve_months'),
  '40000000-0000-4000-8000-000000000105', '40000000-0000-4000-8000-000000000202'
);
update public.purchases
set resulting_license_id = '40000000-0000-4000-8000-000000000205'
where id = '40000000-0000-4000-8000-000000000105';
insert into public.upgrade_eligibility (
  user_id, source_license_id, source_purchase_id, tier, eligible_from,
  eligible_until, max_credit_cents, currency, status, consumed_purchase_id, consumed_at
) values (
  '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000202',
  '40000000-0000-4000-8000-000000000102', 'particular', now() - interval '1 day',
  now() + interval '14 days', 17900, 'EUR', 'consumed',
  '40000000-0000-4000-8000-000000000105', now()
);
insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_partial_after_upgrade', 'refund.updated', repeat('9', 64), 'processing', now() + interval '1500 milliseconds');
select is(
  public.process_verified_staging_refund(
    'evt_partial_after_upgrade', 'refund.updated', now() + interval '1500 milliseconds', repeat('9', 64),
    '40000000-0000-4000-8000-000000000102', 'pi_pgtaprefund', 9000, 17900, 'EUR'
  ) ->> 'reason',
  'partially_refunded', 'partial refund after an upgrade remains partial'
);
select is((select status from public.user_licenses where id = '40000000-0000-4000-8000-000000000205'), 'active', 'partial source refund does not revoke the upgraded licence');
insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_partial_upgrade_purchase', 'refund.updated', repeat('8', 64), 'processing', now() + interval '1600 milliseconds');
select is(
  public.process_verified_staging_refund(
    'evt_partial_upgrade_purchase', 'refund.updated', now() + interval '1600 milliseconds', repeat('8', 64),
    '40000000-0000-4000-8000-000000000105', 'pi_pgtaprefundupgrade', 100, 10000, 'EUR'
  ) ->> 'reason',
  'partially_refunded', 'partial refund of the upgrade payment remains partial'
);
select is((select status from public.user_licenses where id = '40000000-0000-4000-8000-000000000205'), 'active', 'partial refund of the upgrade payment keeps its licence active');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_refund_full', 'refund.updated', repeat('c', 64), 'processing', now() + interval '2 seconds');
select is(
  public.process_verified_staging_refund(
    'evt_refund_full', 'refund.updated', now() + interval '2 seconds', repeat('c', 64),
    '40000000-0000-4000-8000-000000000102', 'pi_pgtaprefund', 17900, 17900, 'EUR'
  ) ->> 'reason',
  'fully_refunded', 'cumulative total produces a full refund'
);
select is((select refund_status || ':' || amount_refunded_cents from public.purchases where id = '40000000-0000-4000-8000-000000000102'), 'fully_refunded:17900', 'full cumulative amount is persisted');
select is((select status from public.user_licenses where id = '40000000-0000-4000-8000-000000000205'), 'revoked', 'full source refund revokes the consumed upgraded licence');
select is((select status from public.upgrade_eligibility where source_purchase_id = '40000000-0000-4000-8000-000000000102'), 'invalidated', 'full source refund invalidates the consumed promotion');
insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_full_upgrade_purchase', 'refund.updated', repeat('7', 64), 'processing', now() + interval '2500 milliseconds');
select is(
  public.process_verified_staging_refund(
    'evt_full_upgrade_purchase', 'refund.updated', now() + interval '2500 milliseconds', repeat('7', 64),
    '40000000-0000-4000-8000-000000000105', 'pi_pgtaprefundupgrade', 10000, 10000, 'EUR'
  ) ->> 'reason',
  'fully_refunded', 'full refund of the upgrade payment is processed independently'
);
select is((select refund_status from public.purchases where id = '40000000-0000-4000-8000-000000000105'), 'fully_refunded', 'upgrade purchase persists its own full refund state');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_refund_stale', 'refund.updated', repeat('d', 64), 'processing', now() - interval '1 hour');
select is(
  public.process_verified_staging_refund(
    'evt_refund_stale', 'refund.updated', now() - interval '1 hour', repeat('d', 64),
    '40000000-0000-4000-8000-000000000102', 'pi_pgtaprefund', 8950, 17900, 'EUR'
  ) ->> 'duplicate', 'true', 'older cumulative refund is an idempotent no-op'
);

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_refund_overpaid', 'refund.updated', repeat('e', 64), 'processing', now() + interval '3 seconds');
select is(
  public.process_verified_staging_refund(
    'evt_refund_overpaid', 'refund.updated', now() + interval '3 seconds', repeat('e', 64),
    '40000000-0000-4000-8000-000000000102', 'pi_pgtaprefund', 17901, 17900, 'EUR'
  ) ->> 'reason', 'refund_inconsistency', 'refund above the paid amount is rejected'
);
select is((select count(*) from public.payment_incidents where stripe_event_id = 'evt_refund_overpaid' and kind = 'refund_inconsistency'), 1::bigint, 'refund inconsistency creates one incident');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values
  ('evt_refund_bad_currency', 'refund.updated', repeat('3', 64), 'processing', now() + interval '4 seconds'),
  ('evt_refund_missing_purchase', 'refund.updated', repeat('4', 64), 'processing', now() + interval '5 seconds');
select is(
  public.process_verified_staging_refund(
    'evt_refund_bad_currency', 'refund.updated', now() + interval '4 seconds', repeat('3', 64),
    '40000000-0000-4000-8000-000000000103', 'pi_pgtapdispute', 100, 12900, 'USD'
  ) ->> 'reason', 'refund_inconsistency', 'refund currency different from the paid EUR charge is rejected'
);
select is(
  public.process_verified_staging_refund(
    'evt_refund_missing_purchase', 'refund.updated', now() + interval '5 seconds', repeat('4', 64),
    '40000000-0000-4000-8000-000000000999', 'pi_missing', 100, 12900, 'EUR'
  ) ->> 'reason', 'purchase_not_found', 'refund for a nonexistent purchase creates a reviewable failure'
);

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values
  ('evt_dispute_open', 'charge.dispute.created', repeat('f', 64), 'processing', now()),
  ('evt_dispute_won', 'charge.dispute.closed', repeat('1', 64), 'processing', now() + interval '1 second'),
  ('evt_dispute_lost', 'charge.dispute.closed', repeat('2', 64), 'processing', now() + interval '2 seconds');
select is(
  public.process_verified_staging_dispute(
    'evt_dispute_open', 'charge.dispute.created', now(), repeat('f', 64),
    '40000000-0000-4000-8000-000000000103', 'pi_pgtapdispute', 'dp_pgtapdispute', 'open'
  ) ->> 'reason', 'open', 'open dispute is tracked independently'
);
select is((select status from public.user_licenses where id = '40000000-0000-4000-8000-000000000203'), 'suspended', 'open dispute suspends paid writes');
select is(
  public.process_verified_staging_dispute(
    'evt_dispute_won', 'charge.dispute.closed', now() + interval '1 second', repeat('1', 64),
    '40000000-0000-4000-8000-000000000103', 'pi_pgtapdispute', 'dp_pgtapdispute', 'won'
  ) ->> 'reason', 'won', 'won dispute is recorded'
);
select is((select status from public.user_licenses where id = '40000000-0000-4000-8000-000000000203'), 'active', 'won dispute restores time-compatible access');
select is(
  public.process_verified_staging_dispute(
    'evt_dispute_lost', 'charge.dispute.closed', now() + interval '2 seconds', repeat('2', 64),
    '40000000-0000-4000-8000-000000000103', 'pi_pgtapdispute', 'dp_pgtapdispute', 'lost'
  ) ->> 'reason', 'lost', 'lost dispute is recorded'
);
select is((select status from public.user_licenses where id = '40000000-0000-4000-8000-000000000203'), 'revoked', 'lost dispute revokes paid writes without deleting history');

select is(
  public.resolve_payment_incident(
    (select id from public.payment_incidents where stripe_event_id = 'evt_refund_overpaid'),
    'resolved', 'Reviewed against Stripe and resolved in pgTAP'
  ) ->> 'status',
  'resolved', 'service workflow resolves an incident with reason'
);

select * from finish();
rollback;
