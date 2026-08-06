begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

select has_table('public', 'upgrade_relationships', 'explicit upgrade relationship table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.upgrade_relationships'::regclass), 'upgrade relationships use RLS');
select ok(has_table_privilege('authenticated', 'public.upgrade_relationships', 'SELECT'), 'users can read their own relationship');
select ok(not has_table_privilege('authenticated', 'public.upgrade_relationships', 'INSERT,UPDATE,DELETE'), 'users cannot mutate relationships');
select ok(has_function_privilege('service_role', 'public.bind_purchase_tax_rate(uuid,text)', 'EXECUTE'), 'backend can bind a Tax Rate');
select ok(has_function_privilege('service_role', 'public.process_verified_order_independent_payment(text,text,timestamp with time zone,text,uuid,text,text,text,text,text,bigint,text,text,text,numeric,text,bigint,bigint,bigint,text,text,text,text,text,text,text,bigint,bigint,bigint)', 'EXECUTE'), 'backend can execute order-independent taxed activation');
select ok(has_function_privilege('service_role', 'public.process_verified_final_refund(text,text,timestamp with time zone,text,uuid,text,bigint,bigint,text)', 'EXECUTE'), 'backend can execute final refunds');
select ok(not has_function_privilege('service_role', 'public.process_verified_staging_payment(text,text,timestamp with time zone,text,uuid,text,text,text,text,bigint,text,text)', 'EXECUTE'), 'legacy activation is not a backend entry point');
select ok(not has_function_privilege('service_role', 'public.process_verified_staging_refund(text,text,timestamp with time zone,text,uuid,text,bigint,bigint,text)', 'EXECUTE'), 'legacy refund is not a backend entry point');
select is(
  (select count(*) from information_schema.columns where table_schema = 'public'
    and table_name = 'purchases' and column_name in (
      'expected_stripe_tax_rate_id', 'applied_stripe_tax_rate_id', 'tax_percentage',
      'tax_behavior', 'subtotal_excluding_tax_cents', 'tax_amount_cents',
      'total_including_tax_cents', 'stripe_invoice_id', 'stripe_invoice_number'
    )), 9::bigint, 'all fiscal evidence columns exist'
);

select is(
  public.renewal_window_opens_at_madrid('2026-04-15 10:00:00+02'::timestamptz),
  '2026-03-16 09:00:00+00'::timestamptz,
  'spring boundary preserves 10:00 Madrid wall time'
);
select is(
  extract(epoch from ('2026-04-15 10:00:00+02'::timestamptz
    - public.renewal_window_opens_at_madrid('2026-04-15 10:00:00+02'::timestamptz))) / 3600,
  719::numeric, 'spring commercial month is not forced to 720 hours'
);
select is(
  public.renewal_window_opens_at_madrid('2026-11-15 10:00:00+01'::timestamptz),
  '2026-10-16 08:00:00+00'::timestamptz,
  'autumn boundary preserves 10:00 Madrid wall time'
);
select is(
  extract(epoch from ('2026-11-15 10:00:00+01'::timestamptz
    - public.renewal_window_opens_at_madrid('2026-11-15 10:00:00+01'::timestamptz))) / 3600,
  721::numeric, 'autumn commercial month is not forced to 720 hours'
);
select is(
  public.renewal_window_opens_at_madrid('2028-02-29 00:00:00+01'::timestamptz),
  '2028-01-29 23:00:00+00'::timestamptz,
  'leap-day midnight boundary is calendar based'
);
select ok(
  public.renewal_window_opens_at_madrid('2026-10-31 18:00:00+01'::timestamptz)
    > public.renewal_window_opens_at_madrid('2026-10-31 18:00:00+01'::timestamptz) - interval '1 millisecond',
  'one millisecond before the inclusive boundary remains outside'
);

insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
)
select email, encode(extensions.digest(token, 'sha256'), 'hex'), display_name,
  '2026-08-v1', '2026-08-v1', now() + interval '1 hour'
from (values
  ('vat-final@example.test', 'pgtap_final_token_000000000000001', 'VAT Final'),
  ('upgrade-final@example.test', 'pgtap_final_token_000000000000002', 'Upgrade Final'),
  ('original-final@example.test', 'pgtap_final_token_000000000000003', 'Original Final'),
  ('expired-final@example.test', 'pgtap_final_token_000000000000004', 'Expired Final')
) authorization(email, token, display_name);

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select id, email, now(), '{}'::jsonb, jsonb_build_object('registration_token', token)
from (values
  ('60000000-0000-4000-8000-000000000001'::uuid, 'vat-final@example.test', 'pgtap_final_token_000000000000001'),
  ('60000000-0000-4000-8000-000000000002'::uuid, 'upgrade-final@example.test', 'pgtap_final_token_000000000000002'),
  ('60000000-0000-4000-8000-000000000003'::uuid, 'original-final@example.test', 'pgtap_final_token_000000000000003'),
  ('60000000-0000-4000-8000-000000000004'::uuid, 'expired-final@example.test', 'pgtap_final_token_000000000000004')
) users(id, email, token);

insert into public.billing_customers (user_id, stripe_customer_id, email_at_creation, email_current, country)
values ('60000000-0000-4000-8000-000000000001', 'cus_final_vat',
  'vat-final@example.test', 'vat-final@example.test', 'ES');

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_customer_id, purchase_kind
) values (
  '60000000-0000-4000-8000-000000000101', '60000000-0000-4000-8000-000000000001',
  'particular', 'one_month', 'pending', 'final_vat_checkout_01',
  6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
  'price_finalvat', 'cs_test_finalvat', 'cus_final_vat', 'new'
);

select lives_ok(
  $$select public.bind_purchase_tax_rate(
    '60000000-0000-4000-8000-000000000101', 'txr_final_es_iva21'
  )$$, 'server binds the configured Tax Rate to the pending purchase'
);
select is((select expected_stripe_tax_rate_id from public.purchases
  where id = '60000000-0000-4000-8000-000000000101'), 'txr_final_es_iva21', 'expected Tax Rate is persisted before Checkout');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_final_tax_bad', 'checkout.session.completed', repeat('a', 64), 'processing', now());
select is(
  public.process_verified_taxed_staging_payment(
    'evt_final_tax_bad', 'checkout.session.completed', now(), repeat('a', 64),
    '60000000-0000-4000-8000-000000000101', 'cs_test_finalvat', 'pi_finalvat',
    'cus_final_vat', 'price_finalvat', 7900, 'EUR', 'ES',
    'txr_final_es_iva21', 10, 'inclusive', 6529, 1371, 7900,
    'in_final_bad', 'MPR-BAD', 'paid', 'ES', 'EUR',
    'txr_final_es_iva21', 'inclusive', 6529, 1371, 7900
  ) ->> 'reason', 'tax_rate_mismatch', '10 percent VAT never activates access'
);
select is((select count(*) from public.payment_incidents
  where stripe_event_id = 'evt_final_tax_bad' and kind = 'tax_mismatch'), 1::bigint, 'tax mismatch creates an incident');
select is((select status from public.purchases
  where id = '60000000-0000-4000-8000-000000000101'), 'pending', 'tax mismatch leaves purchase pending for review');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_final_tax_ok', 'checkout.session.completed', repeat('b', 64), 'processing', now());
select is(
  public.process_verified_taxed_staging_payment(
    'evt_final_tax_ok', 'checkout.session.completed', now(), repeat('b', 64),
    '60000000-0000-4000-8000-000000000101', 'cs_test_finalvat', 'pi_finalvat',
    'cus_final_vat', 'price_finalvat', 7900, 'EUR', 'ES',
    'txr_final_es_iva21', 21, 'inclusive', 6529, 1371, 7900,
    'in_final_vat', 'MPR-000001', 'paid', 'ES', 'EUR',
    'txr_final_es_iva21', 'inclusive', 6529, 1371, 7900
  ) ->> 'processed', 'true', 'correct Spanish inclusive VAT activates the purchase'
);
select is((select status from public.purchases where id = '60000000-0000-4000-8000-000000000101'), 'paid', 'VAT-verified purchase is paid');
select is((select subtotal_excluding_tax_cents || ':' || tax_amount_cents || ':' || total_including_tax_cents
  from public.purchases where id = '60000000-0000-4000-8000-000000000101'), '6529:1371:7900', 'base, IVA and total are stored exactly');
select is((select stripe_invoice_id || ':' || stripe_invoice_number from public.purchases
  where id = '60000000-0000-4000-8000-000000000101'), 'in_final_vat:MPR-000001', 'paid invoice evidence is stored');
select is((select status from public.user_licenses where original_purchase_id = '60000000-0000-4000-8000-000000000101'), 'active', 'only a fiscal-valid event creates active access');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_final_tax_retry', 'checkout.session.completed', repeat('c', 64), 'processing', now() + interval '1 second');
select is(
  public.process_verified_taxed_staging_payment(
    'evt_final_tax_retry', 'checkout.session.completed', now() + interval '1 second', repeat('c', 64),
    '60000000-0000-4000-8000-000000000101', 'cs_test_finalvat', 'pi_finalvat',
    'cus_final_vat', 'price_finalvat', 7900, 'EUR', 'ES',
    'txr_final_es_iva21', 21, 'inclusive', 6529, 1371, 7900,
    'in_final_vat', 'MPR-000001', 'paid', 'ES', 'EUR',
    'txr_final_es_iva21', 'inclusive', 6529, 1371, 7900
  ) ->> 'duplicate', 'true', 'webhook retry is idempotent'
);
select is((select count(*) from public.user_licenses where original_purchase_id = '60000000-0000-4000-8000-000000000101'), 1::bigint, 'retry creates no duplicate licence');

-- Particular 79 EUR -> 179 EUR upgrade; only the upgrade is refunded.
insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key, base_cents, vat_cents,
  total_cents, upgrade_credit_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_payment_intent_id,
  stripe_customer_id, purchase_kind, amount_paid_cents, paid_at
) values (
  '60000000-0000-4000-8000-000000000102', '60000000-0000-4000-8000-000000000002',
  'particular', 'one_month', 'paid', 'final_original_part_1', 6529, 1371,
  7900, 0, 7900, 'EUR', 2100, 'ES', 'pgtap', now(), 'price_final79',
  'cs_test_final79', 'pi_final79', 'cus_final_part', 'new', 7900, now()
);
insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id
) values (
  '60000000-0000-4000-8000-000000000202', '60000000-0000-4000-8000-000000000002',
  'particular', 'one_month', 'revoked', now() - interval '5 days', now() + interval '26 days',
  '60000000-0000-4000-8000-000000000102'
);
update public.purchases set resulting_license_id = '60000000-0000-4000-8000-000000000202'
where id = '60000000-0000-4000-8000-000000000102';
insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key, base_cents, vat_cents,
  total_cents, upgrade_credit_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_payment_intent_id,
  stripe_customer_id, source_license_id, purchase_kind, amount_paid_cents, paid_at
) values (
  '60000000-0000-4000-8000-000000000103', '60000000-0000-4000-8000-000000000002',
  'particular', 'six_months', 'paid', 'final_upgrade_part_1', 14793, 3107,
  17900, 7900, 10000, 'EUR', 2100, 'ES', 'pgtap', now(), 'price_final179',
  'cs_test_final179', 'pi_final179', 'cus_final_part',
  '60000000-0000-4000-8000-000000000202', 'upgrade', 10000, now()
);
insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at,
  original_purchase_id, upgraded_from_license_id
) values (
  '60000000-0000-4000-8000-000000000203', '60000000-0000-4000-8000-000000000002',
  'particular', 'six_months', 'active', now() - interval '5 days', now() + interval '5 months',
  '60000000-0000-4000-8000-000000000103', '60000000-0000-4000-8000-000000000202'
);
update public.purchases set resulting_license_id = '60000000-0000-4000-8000-000000000203'
where id = '60000000-0000-4000-8000-000000000103';
insert into public.upgrade_eligibility (
  user_id, source_license_id, source_purchase_id, tier, eligible_from, eligible_until,
  max_credit_cents, currency, status, consumed_purchase_id, consumed_at
) values (
  '60000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000202',
  '60000000-0000-4000-8000-000000000102', 'particular', now() - interval '5 days',
  now() + interval '10 days', 7900, 'EUR', 'consumed',
  '60000000-0000-4000-8000-000000000103', now()
);
insert into public.upgrade_relationships (
  upgrade_purchase_id, user_id, original_purchase_id, original_license_id,
  upgraded_license_id, credited_amount_cents, original_starts_at, original_expires_at
) select '60000000-0000-4000-8000-000000000103', user_id,
  '60000000-0000-4000-8000-000000000102', id,
  '60000000-0000-4000-8000-000000000203', 7900, starts_at, expires_at
from public.user_licenses where id = '60000000-0000-4000-8000-000000000202';

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_final_upgrade_partial', 'refund.updated', repeat('d', 64), 'processing', now());
select is(public.process_verified_final_refund(
  'evt_final_upgrade_partial', 'refund.updated', now(), repeat('d', 64),
  '60000000-0000-4000-8000-000000000103', 'pi_final179', 5000, 10000, 'EUR'
) ->> 'reason', 'partially_refunded', 'partial upgrade refund remains partial');
select is((select status from public.user_licenses where id = '60000000-0000-4000-8000-000000000203'), 'active', 'partial upgrade refund keeps upgraded licence');
select is((select status from public.user_licenses where id = '60000000-0000-4000-8000-000000000202'), 'revoked', 'partial upgrade refund does not restore original licence');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_final_upgrade_full', 'refund.updated', repeat('e', 64), 'processing', now() + interval '1 second');
select is(public.process_verified_final_refund(
  'evt_final_upgrade_full', 'refund.updated', now() + interval '1 second', repeat('e', 64),
  '60000000-0000-4000-8000-000000000103', 'pi_final179', 10000, 10000, 'EUR'
) ->> 'reason', 'fully_refunded_original_license_restored', 'two cumulative refunds reaching total restore original time');
select is((select status from public.user_licenses where id = '60000000-0000-4000-8000-000000000203'), 'refunded', 'fully refunded upgraded licence is removed');
select is((select status from public.user_licenses where id = '60000000-0000-4000-8000-000000000202'), 'active', 'unexpired paid original licence is restored');
select is((select original_expires_at from public.upgrade_relationships where upgrade_purchase_id = '60000000-0000-4000-8000-000000000103'),
  (select expires_at from public.user_licenses where id = '60000000-0000-4000-8000-000000000202'), 'restoration preserves original expiry exactly');
select is((select restoration_status from public.upgrade_relationships where upgrade_purchase_id = '60000000-0000-4000-8000-000000000103'), 'restored', 'restoration has explicit terminal state');
select is((select count(*) from public.license_events where provider_event_id = 'evt_final_upgrade_full' and event_type = 'restored'), 1::bigint, 'restoration is audited once');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_final_upgrade_duplicate', 'refund.updated', repeat('f', 64), 'processing', now() + interval '2 seconds');
select is(public.process_verified_final_refund(
  'evt_final_upgrade_duplicate', 'refund.updated', now() + interval '2 seconds', repeat('f', 64),
  '60000000-0000-4000-8000-000000000103', 'pi_final179', 10000, 10000, 'EUR'
) ->> 'duplicate', 'true', 'duplicate full refund is a no-op');
select is((select count(*) from public.license_events where provider_event_id = 'evt_final_upgrade_full' and event_type = 'restored'), 1::bigint, 'duplicate creates no second restoration audit');

-- Professional original refund after 129 -> 299 upgrade: incident, no mutation.
insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key, base_cents, vat_cents,
  total_cents, amount_due_cents, currency, vat_rate_basis_points, tax_country,
  price_source, price_effective_at, stripe_price_id, stripe_checkout_session_id,
  stripe_payment_intent_id, purchase_kind, amount_paid_cents, paid_at
) values (
  '60000000-0000-4000-8000-000000000104', '60000000-0000-4000-8000-000000000003',
  'professional', 'one_month', 'paid', 'final_original_pro_01', 10661, 2239,
  12900, 12900, 'EUR', 2100, 'ES', 'pgtap', now(), 'price_final129',
  'cs_test_final129', 'pi_final129', 'new', 12900, now()
);
insert into public.user_licenses (id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id)
values ('60000000-0000-4000-8000-000000000204', '60000000-0000-4000-8000-000000000003',
  'professional', 'one_month', 'revoked', now() - interval '3 days', now() + interval '28 days',
  '60000000-0000-4000-8000-000000000104');
update public.purchases set resulting_license_id = '60000000-0000-4000-8000-000000000204'
where id = '60000000-0000-4000-8000-000000000104';
insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key, base_cents, vat_cents,
  total_cents, upgrade_credit_cents, amount_due_cents, currency, vat_rate_basis_points,
  tax_country, price_source, price_effective_at, stripe_price_id,
  stripe_checkout_session_id, stripe_payment_intent_id, source_license_id,
  purchase_kind, amount_paid_cents, paid_at
) values (
  '60000000-0000-4000-8000-000000000105', '60000000-0000-4000-8000-000000000003',
  'professional', 'six_months', 'paid', 'final_upgrade_pro_001', 24711, 5189,
  29900, 12900, 17000, 'EUR', 2100, 'ES', 'pgtap', now(), 'price_final299',
  'cs_test_final299', 'pi_final299', '60000000-0000-4000-8000-000000000204',
  'upgrade', 17000, now()
);
insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at,
  original_purchase_id, upgraded_from_license_id
) values ('60000000-0000-4000-8000-000000000205', '60000000-0000-4000-8000-000000000003',
  'professional', 'six_months', 'active', now() - interval '3 days', now() + interval '6 months',
  '60000000-0000-4000-8000-000000000105', '60000000-0000-4000-8000-000000000204');
update public.purchases set resulting_license_id = '60000000-0000-4000-8000-000000000205'
where id = '60000000-0000-4000-8000-000000000105';
insert into public.upgrade_relationships (
  upgrade_purchase_id, user_id, original_purchase_id, original_license_id,
  upgraded_license_id, credited_amount_cents, original_starts_at, original_expires_at
) select '60000000-0000-4000-8000-000000000105', user_id,
  '60000000-0000-4000-8000-000000000104', id,
  '60000000-0000-4000-8000-000000000205', 12900, starts_at, expires_at
from public.user_licenses where id = '60000000-0000-4000-8000-000000000204';

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_final_original_refund', 'refund.updated', repeat('1', 64), 'processing', now());
select is(public.process_verified_final_refund(
  'evt_final_original_refund', 'refund.updated', now(), repeat('1', 64),
  '60000000-0000-4000-8000-000000000104', 'pi_final129', 12900, 12900, 'EUR'
) ->> 'reason', 'original_purchase_refunded_after_upgrade_review', 'original refund after upgrade enters manual review');
select is((select status from public.user_licenses where id = '60000000-0000-4000-8000-000000000205'), 'active', 'original refund does not silently alter upgraded licence');
select is((select status from public.user_licenses where id = '60000000-0000-4000-8000-000000000204'), 'revoked', 'original refund does not silently restore source licence');
select is((select count(*) from public.payment_incidents where stripe_event_id = 'evt_final_original_refund' and kind = 'upgrade_original_purchase_refunded'), 1::bigint, 'specific original-after-upgrade incident exists');
select is((select (details ->> 'netTotalPaidCents')::bigint from public.payment_incidents
  where stripe_event_id = 'evt_final_original_refund'), 17000::bigint, 'incident stores net amount still paid');
select is((select restoration_status from public.upgrade_relationships where upgrade_purchase_id = '60000000-0000-4000-8000-000000000105'), 'review_required', 'relationship prevents a contradictory silent transition');

-- Professional 129 -> 449 upgrade after original expiry: no restoration.
insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key, base_cents, vat_cents,
  total_cents, amount_due_cents, currency, vat_rate_basis_points, tax_country,
  price_source, price_effective_at, stripe_price_id, stripe_checkout_session_id,
  stripe_payment_intent_id, purchase_kind, amount_paid_cents, paid_at
) values ('60000000-0000-4000-8000-000000000106', '60000000-0000-4000-8000-000000000004',
  'professional', 'one_month', 'paid', 'final_expired_pro_01', 10661, 2239,
  12900, 12900, 'EUR', 2100, 'ES', 'pgtap', now(), 'price_expired129',
  'cs_test_expired129', 'pi_expired129', 'new', 12900, now());
insert into public.user_licenses (id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id)
values ('60000000-0000-4000-8000-000000000206', '60000000-0000-4000-8000-000000000004',
  'professional', 'one_month', 'revoked', now() - interval '32 days', now() - interval '1 day',
  '60000000-0000-4000-8000-000000000106');
update public.purchases set resulting_license_id = '60000000-0000-4000-8000-000000000206'
where id = '60000000-0000-4000-8000-000000000106';
insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key, base_cents, vat_cents,
  total_cents, upgrade_credit_cents, amount_due_cents, currency, vat_rate_basis_points,
  tax_country, price_source, price_effective_at, stripe_price_id,
  stripe_checkout_session_id, stripe_payment_intent_id, source_license_id,
  purchase_kind, amount_paid_cents, paid_at
) values ('60000000-0000-4000-8000-000000000107', '60000000-0000-4000-8000-000000000004',
  'professional', 'twelve_months', 'paid', 'final_expired_pro_up', 37107, 7793,
  44900, 12900, 32000, 'EUR', 2100, 'ES', 'pgtap', now(), 'price_expired449',
  'cs_test_expired449', 'pi_expired449', '60000000-0000-4000-8000-000000000206',
  'upgrade', 32000, now());
insert into public.user_licenses (
  id, user_id, tier, duration, status, starts_at, expires_at, original_purchase_id, upgraded_from_license_id
) values ('60000000-0000-4000-8000-000000000207', '60000000-0000-4000-8000-000000000004',
  'professional', 'twelve_months', 'active', now() - interval '32 days', now() + interval '11 months',
  '60000000-0000-4000-8000-000000000107', '60000000-0000-4000-8000-000000000206');
update public.purchases set resulting_license_id = '60000000-0000-4000-8000-000000000207'
where id = '60000000-0000-4000-8000-000000000107';
insert into public.upgrade_relationships (
  upgrade_purchase_id, user_id, original_purchase_id, original_license_id,
  upgraded_license_id, credited_amount_cents, original_starts_at, original_expires_at
) select '60000000-0000-4000-8000-000000000107', user_id,
  '60000000-0000-4000-8000-000000000106', id,
  '60000000-0000-4000-8000-000000000207', 12900, starts_at, expires_at
from public.user_licenses where id = '60000000-0000-4000-8000-000000000206';
insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_final_expired_upgrade', 'refund.updated', repeat('2', 64), 'processing', now());
select is(public.process_verified_final_refund(
  'evt_final_expired_upgrade', 'refund.updated', now(), repeat('2', 64),
  '60000000-0000-4000-8000-000000000107', 'pi_expired449', 32000, 32000, 'EUR'
) ->> 'reason', 'fully_refunded', 'expired original does not replace the refund result');
select is((select status from public.user_licenses where id = '60000000-0000-4000-8000-000000000206'), 'revoked', 'expired original licence is not restored');
select is((select restoration_status from public.upgrade_relationships where upgrade_purchase_id = '60000000-0000-4000-8000-000000000107'), 'not_restored_expired', 'expired restoration outcome is explicit');
select is((select count(*) from public.license_events where provider_event_id = 'evt_final_expired_upgrade'
  and reason_code = 'original_license_expired_before_upgrade_refund'), 1::bigint, 'expired original skip is audited');

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.upgrade_relationships), 1::bigint, 'RLS exposes only the current user relationship');
select throws_ok(
  $$update public.upgrade_relationships set restoration_status = 'eligible'$$,
  '42501', null, 'browser cannot restore or alter a relationship'
);
reset role;

select * from finish();
rollback;
