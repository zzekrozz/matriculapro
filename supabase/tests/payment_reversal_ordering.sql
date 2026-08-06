begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

select has_table('public', 'pending_payment_reversals', 'durable pending reversal table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.pending_payment_reversals'::regclass), 'pending reversals use RLS');
select ok(not has_table_privilege('authenticated', 'public.pending_payment_reversals', 'SELECT'), 'authenticated users cannot read reversal rows');
select ok(not has_table_privilege('authenticated', 'public.pending_payment_reversals', 'INSERT,UPDATE,DELETE'), 'authenticated users cannot mutate reversal rows');
select ok(has_table_privilege('service_role', 'public.pending_payment_reversals', 'SELECT,INSERT,UPDATE'), 'service role owns reversal persistence');
select is((select count(*) from information_schema.columns where table_schema = 'public'
  and table_name = 'purchases' and column_name in (
    'stripe_charge_id', 'payment_verified_at', 'payment_verification_event_id'
  )), 3::bigint, 'purchase has verified payment linkage columns');
select is((select count(*) from pg_indexes where schemaname = 'public'
  and tablename = 'pending_payment_reversals'), 8::bigint, 'all lookup and uniqueness indexes exist');
select ok(has_function_privilege('service_role',
  'public.store_pending_payment_reversal(text,text,timestamp with time zone,text,text,text,text,text,text,text,uuid,bigint,bigint,text,text,text)',
  'EXECUTE'), 'service role can persist a reversal');
select ok(not has_function_privilege('authenticated',
  'public.store_pending_payment_reversal(text,text,timestamp with time zone,text,text,text,text,text,text,text,uuid,bigint,bigint,text,text,text)',
  'EXECUTE'), 'authenticated cannot persist a reversal');
select ok(has_function_privilege('service_role',
  'public.process_verified_automatic_tax_payment(text,text,timestamp with time zone,text,uuid,text,text,text,text,text,bigint,text,text,text,text,bigint,bigint,bigint,text,text,text,text,text,text,text,bigint,bigint,bigint)',
  'EXECUTE'), 'service role can run guarded automatic Tax activation');
select ok(not has_function_privilege('service_role',
  'public.process_verified_taxed_staging_payment(text,text,timestamp with time zone,text,uuid,text,text,text,text,bigint,text,text,text,numeric,text,bigint,bigint,bigint,text,text,text,text,text,text,text,bigint,bigint,bigint)',
  'EXECUTE'), 'migration 010 activation is no longer a backend entry point');
select ok(has_function_privilege('service_role',
  'public.process_verified_order_independent_dispute(text,text,timestamp with time zone,text,uuid,text,text,text)',
  'EXECUTE'), 'service role can reconcile a later dispute state');
select ok((select count(*) = 2 from pg_trigger where tgname in (
  'purchases_payment_license_compatibility', 'licenses_payment_compatibility'
) and tgconstraint <> 0), 'deferred database guards reject usable licences with reversed payments');

insert into public.registration_authorizations (
  email, token_sha256, display_name, terms_version, privacy_version, expires_at
)
select email, encode(extensions.digest(token, 'sha256'), 'hex'), display_name,
  '2026-08-v1', '2026-08-v1', now() + interval '1 hour'
from (values
  ('ordering-refund@example.test', 'pgtap_ordering_token_000000000001', 'Ordering Refund'),
  ('ordering-dispute@example.test', 'pgtap_ordering_token_000000000002', 'Ordering Dispute'),
  ('ordering-partial@example.test', 'pgtap_ordering_token_000000000003', 'Ordering Partial')
) authorization(email, token, display_name);

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select id, email, now(), '{}'::jsonb, jsonb_build_object('registration_token', token)
from (values
  ('70000000-0000-4000-8000-000000000001'::uuid, 'ordering-refund@example.test', 'pgtap_ordering_token_000000000001'),
  ('70000000-0000-4000-8000-000000000002'::uuid, 'ordering-dispute@example.test', 'pgtap_ordering_token_000000000002'),
  ('70000000-0000-4000-8000-000000000003'::uuid, 'ordering-partial@example.test', 'pgtap_ordering_token_000000000003')
) users(id, email, token);

insert into public.billing_customers (user_id, stripe_customer_id, email_at_creation, email_current, country)
values
  ('70000000-0000-4000-8000-000000000001', 'cus_order_refund', 'ordering-refund@example.test', 'ordering-refund@example.test', 'ES'),
  ('70000000-0000-4000-8000-000000000002', 'cus_order_dispute', 'ordering-dispute@example.test', 'ordering-dispute@example.test', 'ES'),
  ('70000000-0000-4000-8000-000000000003', 'cus_order_partial', 'ordering-partial@example.test', 'ordering-partial@example.test', 'ES');

insert into public.purchases (
  id, user_id, tier, duration, status, idempotency_key,
  base_cents, vat_cents, total_cents, amount_due_cents, currency,
  vat_rate_basis_points, tax_country, price_source, price_effective_at,
  stripe_price_id, stripe_checkout_session_id, stripe_customer_id, purchase_kind
) values
  ('70000000-0000-4000-8000-000000000101', '70000000-0000-4000-8000-000000000001',
   'particular', 'one_month', 'pending', 'ordering_refund_000001',
   6529, 1371, 7900, 7900, 'EUR', 2100, 'ES', 'pgtap', now(),
   'price_orderrefund', 'cs_test_orderrefund', 'cus_order_refund', 'new'),
  ('70000000-0000-4000-8000-000000000102', '70000000-0000-4000-8000-000000000002',
   'professional', 'one_month', 'pending', 'ordering_dispute_0001',
   10661, 2239, 12900, 12900, 'EUR', 2100, 'ES', 'pgtap', now(),
   'price_orderdispute', 'cs_test_orderdispute', 'cus_order_dispute', 'new'),
  ('70000000-0000-4000-8000-000000000103', '70000000-0000-4000-8000-000000000003',
   'particular', 'six_months', 'pending', 'ordering_partial_0001',
   14793, 3107, 17900, 17900, 'EUR', 2100, 'ES', 'pgtap', now(),
   'price_orderpartial', 'cs_test_orderpartial', 'cus_order_partial', 'new');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_order_unknown', 'charge.refunded', repeat('1', 64), 'processing', now());
select lives_ok($$select public.store_pending_payment_reversal(
  'evt_order_unknown', 'charge.refunded', now(), repeat('1', 64), 'refund',
  'pi_not_yet_linked', 'ch_not_yet_linked', null, null, 'cus_order_refund', null,
  100, 7900, 'eur', null, null
)$$, 'unknown verified refund is persisted before any match');
select is((select processing_status from public.pending_payment_reversals
  where stripe_event_id = 'evt_order_unknown'), 'pending_match', 'unknown reversal remains pending_match');
select is((select processing_status from public.payment_events
  where provider_event_id = 'evt_order_unknown'), 'processed', 'Stripe delivery is acknowledged only after durable storage');
select lives_ok($$select public.store_pending_payment_reversal(
  'evt_order_unknown', 'charge.refunded', now(), repeat('1', 64), 'refund',
  'pi_not_yet_linked', 'ch_not_yet_linked', null, null, 'cus_order_refund', null,
  100, 7900, 'eur', null, null
)$$, 'same Stripe event is idempotent');
select is((select count(*) from public.pending_payment_reversals
  where stripe_event_id = 'evt_order_unknown'), 1::bigint, 'retry creates one reversal row');
select throws_ok($$select public.store_pending_payment_reversal(
  'evt_order_unknown', 'charge.refunded', now(), repeat('2', 64), 'refund',
  'pi_not_yet_linked', 'ch_not_yet_linked', null, null, 'cus_order_refund', null,
  100, 7900, 'eur', null, null
)$$, '23505', 'Stripe reversal identity collision', 'event ID collision with another payload is rejected');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values
  ('evt_order_full_refund', 'charge.refunded', repeat('3', 64), 'processing', now()),
  ('evt_order_full_checkout', 'checkout.session.completed', repeat('4', 64), 'processing', now() + interval '1 second');
select lives_ok($$select public.store_pending_payment_reversal(
  'evt_order_full_refund', 'charge.refunded', now(), repeat('3', 64), 'refund',
  'pi_order_full', 'ch_order_full', null, null, 'cus_order_refund', null,
  7900, 7900, 'eur', null, null
)$$, 'full refund arriving first is durable');
select is(public.process_verified_automatic_tax_payment(
  'evt_order_full_checkout', 'checkout.session.completed', now(), repeat('4', 64),
  '70000000-0000-4000-8000-000000000101', 'cs_test_orderrefund',
  'pi_order_full', 'ch_order_full', 'cus_order_refund', 'price_orderrefund',
  7900, 'EUR', 'ES', 'complete', 'inclusive', 6529, 1371, 7900,
  'in_order_full', 'MPR-ORDER-001', 'paid', 'ES', 'EUR', 'complete',
  'inclusive', 6529, 1371, 7900
) ->> 'reason', 'fully_refunded_before_activation', 'full refund blocks later checkout activation');
select is((select status from public.purchases where id = '70000000-0000-4000-8000-000000000101'), 'refunded', 'purchase records full refund');
select is((select refund_status from public.purchases where id = '70000000-0000-4000-8000-000000000101'), 'fully_refunded', 'refund ledger is complete');
select is((select count(*) from public.user_licenses where original_purchase_id = '70000000-0000-4000-8000-000000000101'), 0::bigint, 'no paid licence ever exists for early full refund');
select is((select processing_status from public.pending_payment_reversals where stripe_event_id = 'evt_order_full_refund'), 'applied', 'full refund reversal is atomically applied');
select is((select count(*) from public.payment_incidents where purchase_id = '70000000-0000-4000-8000-000000000101'
  and kind = 'payment_fully_refunded_before_activation' and status = 'resolved'), 1::bigint, 'automatic full-refund outcome is audited and resolved');
insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_order_full_checkout_retry', 'checkout.session.async_payment_succeeded', repeat('a', 64), 'processing', now() + interval '2 seconds');
select is(public.process_verified_automatic_tax_payment(
  'evt_order_full_checkout_retry', 'checkout.session.async_payment_succeeded', now(), repeat('a', 64),
  '70000000-0000-4000-8000-000000000101', 'cs_test_orderrefund',
  'pi_order_full', 'ch_order_full', 'cus_order_refund', 'price_orderrefund',
  7900, 'EUR', 'ES', 'complete', 'inclusive', 6529, 1371, 7900,
  'in_order_full', 'MPR-ORDER-001', 'paid', 'ES', 'EUR', 'complete',
  'inclusive', 6529, 1371, 7900
) ->> 'processed', 'false', 'concurrent or repeated payment cannot reactivate a refunded purchase');

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select is(public.get_my_payment_activation_status('cs_test_orderrefund') ->> 'status',
  'fully_refunded_before_activation', 'account receives the specific early-refund state');
reset role;

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values
  ('evt_order_dispute_open', 'charge.dispute.created', repeat('5', 64), 'processing', now()),
  ('evt_order_dispute_checkout', 'checkout.session.completed', repeat('6', 64), 'processing', now() + interval '1 second');
select lives_ok($$select public.store_pending_payment_reversal(
  'evt_order_dispute_open', 'charge.dispute.created', now(), repeat('5', 64), 'dispute',
  'pi_order_dispute', 'ch_order_dispute', null, null, 'cus_order_dispute', null,
  null, null, null, 'dp_order_dispute', 'open'
)$$, 'open dispute arriving first is durable');
select is(public.process_verified_automatic_tax_payment(
  'evt_order_dispute_checkout', 'checkout.session.completed', now(), repeat('6', 64),
  '70000000-0000-4000-8000-000000000102', 'cs_test_orderdispute',
  'pi_order_dispute', 'ch_order_dispute', 'cus_order_dispute', 'price_orderdispute',
  12900, 'EUR', 'ES', 'complete', 'inclusive', 10661, 2239, 12900,
  'in_order_dispute', 'MPR-ORDER-002', 'paid', 'ES', 'EUR', 'complete',
  'inclusive', 10661, 2239, 12900
) ->> 'reason', 'dispute_before_activation', 'open dispute blocks later activation');
select is((select status from public.purchases where id = '70000000-0000-4000-8000-000000000102'), 'disputed', 'purchase remains disputed without licence');
select is((select count(*) from public.user_licenses where original_purchase_id = '70000000-0000-4000-8000-000000000102'), 0::bigint, 'open dispute creates no paid licence');
select ok((select payment_verified_at is not null from public.purchases where id = '70000000-0000-4000-8000-000000000102'), 'verified fiscal evidence is retained for a later won dispute');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values ('evt_order_dispute_won', 'charge.dispute.closed', repeat('7', 64), 'processing', now() + interval '2 seconds');
select lives_ok($$select public.store_pending_payment_reversal(
  'evt_order_dispute_won', 'charge.dispute.closed', now() + interval '2 seconds', repeat('7', 64), 'dispute',
  'pi_order_dispute', 'ch_order_dispute', null, 'in_order_dispute', 'cus_order_dispute', null,
  null, null, null, 'dp_order_dispute', 'won'
)$$, 'later won dispute is persisted');
select is(public.process_verified_order_independent_dispute(
  'evt_order_dispute_won', 'charge.dispute.closed', now() + interval '2 seconds', repeat('7', 64),
  '70000000-0000-4000-8000-000000000102', 'pi_order_dispute', 'dp_order_dispute', 'won'
) ->> 'reason', 'dispute_won_activated', 'won dispute activates only the previously verified payment');
select is((select status from public.purchases where id = '70000000-0000-4000-8000-000000000102'), 'paid', 'won dispute restores paid purchase state');
select is((select dispute_status from public.purchases where id = '70000000-0000-4000-8000-000000000102'), 'won', 'won is the final dispute state');
select is((select count(*) from public.user_licenses where original_purchase_id = '70000000-0000-4000-8000-000000000102'
  and status in ('active', 'scheduled')), 1::bigint, 'won dispute creates exactly one usable licence');

insert into public.payment_events (provider_event_id, event_type, payload_sha256, processing_status, event_created_at)
values
  ('evt_order_partial_refund', 'refund.updated', repeat('8', 64), 'processing', now()),
  ('evt_order_partial_checkout', 'checkout.session.completed', repeat('9', 64), 'processing', now() + interval '1 second');
select lives_ok($$select public.store_pending_payment_reversal(
  'evt_order_partial_refund', 'refund.updated', now(), repeat('8', 64), 'refund',
  'pi_order_partial', 'ch_order_partial', null, null, 'cus_order_partial', null,
  1000, 17900, 'eur', null, null
)$$, 'partial refund arriving first is durable');
select is(public.process_verified_automatic_tax_payment(
  'evt_order_partial_checkout', 'checkout.session.completed', now(), repeat('9', 64),
  '70000000-0000-4000-8000-000000000103', 'cs_test_orderpartial',
  'pi_order_partial', 'ch_order_partial', 'cus_order_partial', 'price_orderpartial',
  17900, 'EUR', 'ES', 'complete', 'inclusive', 14793, 3107, 17900,
  'in_order_partial', 'MPR-ORDER-003', 'paid', 'ES', 'EUR', 'complete',
  'inclusive', 14793, 3107, 17900
) ->> 'processed', 'true', 'partial refund follows current activation policy');
select is((select status from public.purchases where id = '70000000-0000-4000-8000-000000000103'), 'paid', 'partial refund leaves purchase paid');
select is((select refund_status from public.purchases where id = '70000000-0000-4000-8000-000000000103'), 'partially_refunded', 'partial refund is marked explicitly');
select is((select amount_refunded_cents from public.purchases where id = '70000000-0000-4000-8000-000000000103'), 1000::bigint, 'partial cumulative amount is exact');
select is((select count(*) from public.user_licenses where original_purchase_id = '70000000-0000-4000-8000-000000000103'
  and status in ('active', 'scheduled')), 1::bigint, 'partial refund keeps one usable licence');
select is((select count(*) from public.payment_incidents where purchase_id = '70000000-0000-4000-8000-000000000103'
  and kind = 'partial_refund_review'), 1::bigint, 'partial refund creates the existing review incident');

select * from finish();
rollback;
