-- MatriculaPro out-of-order refund/dispute protection.
-- Additive migration; migrations 001-010 remain immutable.
-- Reviewed: 2026-08-06

alter table public.purchases
  add column stripe_charge_id text,
  add column payment_verified_at timestamptz,
  add column payment_verification_event_id text;

alter table public.purchases
  add constraint purchases_stripe_charge_check check (
    stripe_charge_id is null or stripe_charge_id ~ '^ch_[A-Za-z0-9_]+$'
  ),
  add constraint purchases_payment_verification_check check (
    (payment_verified_at is null and payment_verification_event_id is null)
    or (payment_verified_at is not null and length(btrim(payment_verification_event_id)) > 0)
  );

create unique index purchases_stripe_charge_unique_idx
  on public.purchases (stripe_charge_id) where stripe_charge_id is not null;

create table public.pending_payment_reversals (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique check (length(btrim(stripe_event_id)) > 0),
  event_type text not null check (length(btrim(event_type)) > 0),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  reversal_kind text not null check (reversal_kind in ('refund', 'dispute')),
  stripe_payment_intent_id text check (
    stripe_payment_intent_id is null or stripe_payment_intent_id ~ '^pi_[A-Za-z0-9_]+$'
  ),
  stripe_charge_id text check (
    stripe_charge_id is null or stripe_charge_id ~ '^ch_[A-Za-z0-9_]+$'
  ),
  stripe_checkout_session_id text check (
    stripe_checkout_session_id is null or stripe_checkout_session_id ~ '^cs_(test|live)_[A-Za-z0-9_]+$'
  ),
  stripe_invoice_id text check (
    stripe_invoice_id is null or stripe_invoice_id ~ '^in_[A-Za-z0-9_]+$'
  ),
  stripe_customer_id text check (
    stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9_]+$'
  ),
  purchase_id uuid references public.purchases(id) on delete restrict,
  user_id uuid references auth.users(id) on delete restrict,
  amount_refunded_cents bigint,
  charge_amount_cents bigint,
  currency text,
  stripe_dispute_id text,
  dispute_status text,
  processing_status text not null default 'pending_match' check (processing_status in (
    'pending_match', 'matched', 'applied', 'ignored_with_reason', 'requires_review'
  )),
  match_basis text check (match_basis is null or match_basis in (
    'payment_intent', 'charge', 'checkout_session', 'invoice', 'purchase'
  )),
  reason_code text,
  occurred_at timestamptz not null,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  check (
    (reversal_kind = 'refund' and amount_refunded_cents is not null
      and charge_amount_cents is not null and amount_refunded_cents >= 0
      and charge_amount_cents > 0 and amount_refunded_cents <= charge_amount_cents
      and currency ~ '^[A-Z]{3}$' and stripe_dispute_id is null and dispute_status is null)
    or
    (reversal_kind = 'dispute' and amount_refunded_cents is null
      and charge_amount_cents is null and currency is null
      and stripe_dispute_id ~ '^dp_[A-Za-z0-9_]+$'
      and dispute_status in ('warning', 'open', 'won', 'lost'))
  ),
  check ((processing_status = 'applied') = (applied_at is not null))
);

create index pending_payment_reversals_payment_intent_idx
  on public.pending_payment_reversals (stripe_payment_intent_id, occurred_at)
  where stripe_payment_intent_id is not null;
create index pending_payment_reversals_charge_idx
  on public.pending_payment_reversals (stripe_charge_id, occurred_at)
  where stripe_charge_id is not null;
create index pending_payment_reversals_checkout_idx
  on public.pending_payment_reversals (stripe_checkout_session_id, occurred_at)
  where stripe_checkout_session_id is not null;
create index pending_payment_reversals_invoice_idx
  on public.pending_payment_reversals (stripe_invoice_id, occurred_at)
  where stripe_invoice_id is not null;
create index pending_payment_reversals_status_idx
  on public.pending_payment_reversals (processing_status, occurred_at);
create index pending_payment_reversals_purchase_idx
  on public.pending_payment_reversals (purchase_id, occurred_at)
  where purchase_id is not null;

alter table public.pending_payment_reversals enable row level security;
revoke all on table public.pending_payment_reversals from public, anon, authenticated, service_role;
grant select, insert, update on table public.pending_payment_reversals to service_role;
create trigger pending_payment_reversals_set_updated_at
  before update on public.pending_payment_reversals
  for each row execute function public.set_updated_at();

create or replace function public.enforce_payment_license_compatibility()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare v_purchase_id uuid;
begin
  if tg_table_name = 'purchases' then
    v_purchase_id := new.id;
  else
    select p.id into v_purchase_id from public.purchases p
    where p.resulting_license_id = new.id limit 1;
  end if;
  if v_purchase_id is not null and exists (
    select 1 from public.purchases p
    join public.user_licenses l on l.id = p.resulting_license_id
    where p.id = v_purchase_id and l.status in ('active', 'scheduled')
      and (p.refund_status = 'fully_refunded'
        or p.status = 'refunded'
        or p.dispute_status in ('open', 'lost')
        or p.status = 'disputed')
  ) then
    raise exception 'Usable licence is incompatible with reversed payment'
      using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function public.enforce_payment_license_compatibility()
  from public, anon, authenticated;
create constraint trigger purchases_payment_license_compatibility
  after insert or update of status, refund_status, dispute_status, resulting_license_id
  on public.purchases deferrable initially deferred
  for each row execute function public.enforce_payment_license_compatibility();
create constraint trigger licenses_payment_compatibility
  after insert or update of status on public.user_licenses deferrable initially deferred
  for each row execute function public.enforce_payment_license_compatibility();

alter table public.payment_incidents drop constraint payment_incidents_kind_check;
alter table public.payment_incidents add constraint payment_incidents_kind_check
  check (kind in (
    'paid_without_license', 'amount_mismatch', 'currency_mismatch',
    'country_mismatch', 'customer_mismatch', 'unknown_price',
    'overlapping_license', 'webhook_processing_failure',
    'refund_inconsistency', 'partial_refund_review', 'dispute_review',
    'tax_mismatch', 'invoice_mismatch', 'upgrade_refund_restore_failure',
    'upgrade_original_purchase_refunded', 'payment_reversal_ambiguous',
    'payment_fully_refunded_before_activation', 'payment_dispute_before_activation'
  ));

create or replace function public.store_pending_payment_reversal(
  p_stripe_event_id text, p_event_type text, p_occurred_at timestamptz,
  p_payload_sha256 text, p_reversal_kind text, p_payment_intent_id text,
  p_charge_id text, p_checkout_session_id text, p_invoice_id text,
  p_customer_id text, p_purchase_id uuid,
  p_amount_refunded_cents bigint default null,
  p_charge_amount_cents bigint default null, p_currency text default null,
  p_dispute_id text default null, p_dispute_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.pending_payment_reversals%rowtype;
  v_candidate_count integer;
  v_purchase_id uuid;
  v_user_id uuid;
  v_match_basis text;
  v_status text;
begin
  if p_reversal_kind not in ('refund', 'dispute')
     or (coalesce(p_payment_intent_id, '') !~ '^pi_[A-Za-z0-9_]+$'
       and coalesce(p_charge_id, '') !~ '^ch_[A-Za-z0-9_]+$')
     or p_payload_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid verified payment reversal' using errcode = '22023';
  end if;
  if p_reversal_kind = 'refund' and (
    p_amount_refunded_cents is null or p_charge_amount_cents is null
    or p_amount_refunded_cents < 0 or p_amount_refunded_cents > p_charge_amount_cents
    or upper(coalesce(p_currency, '')) !~ '^[A-Z]{3}$'
  ) then raise exception 'Invalid verified refund' using errcode = '22023'; end if;
  if p_reversal_kind = 'dispute' and (
    p_dispute_id !~ '^dp_[A-Za-z0-9_]+$'
    or p_dispute_status not in ('warning', 'open', 'won', 'lost')
  ) then raise exception 'Invalid verified dispute' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended('payment-reversal:' || p_stripe_event_id, 0));
  select r.* into v_existing from public.pending_payment_reversals r
  where r.stripe_event_id = p_stripe_event_id for update;
  if v_existing.id is not null then
    if v_existing.payload_sha256 <> p_payload_sha256
       or v_existing.event_type <> p_event_type
       or v_existing.reversal_kind <> p_reversal_kind
       or v_existing.stripe_payment_intent_id is distinct from p_payment_intent_id
       or v_existing.stripe_charge_id is distinct from p_charge_id then
      raise exception 'Stripe reversal identity collision' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'ok', true, 'duplicate', true, 'processed', true,
      'reason', v_existing.processing_status,
      'purchase_id', v_existing.purchase_id, 'license_id', null
    );
  end if;

  with candidates as (
    select p.id, p.user_id, 1 as priority, 'payment_intent'::text as basis
    from public.purchases p where p.stripe_payment_intent_id = p_payment_intent_id
    union all
    select p.id, p.user_id, 2, 'charge' from public.purchases p
    where p.stripe_charge_id = p_charge_id
    union all
    select p.id, p.user_id, 3, 'checkout_session' from public.purchases p
    where p_checkout_session_id is not null
      and p.stripe_checkout_session_id = p_checkout_session_id
    union all
    select p.id, p.user_id, 4, 'invoice' from public.purchases p
    where p_invoice_id is not null and p.stripe_invoice_id = p_invoice_id
    union all
    select p.id, p.user_id, 5, 'purchase' from public.purchases p
    where p_purchase_id is not null and p.id = p_purchase_id
  ), distinct_candidates as (
    select id, min(user_id::text)::uuid as user_id, min(priority) as priority
    from candidates group by id
  )
  select count(*), (array_agg(id))[1], (array_agg(user_id))[1]
  into v_candidate_count, v_purchase_id, v_user_id
  from distinct_candidates;

  if v_candidate_count = 1 then
    select c.basis into v_match_basis
    from (
      select p.id, 1 as priority, 'payment_intent'::text as basis from public.purchases p
        where p.stripe_payment_intent_id = p_payment_intent_id
      union all select p.id, 2, 'charge' from public.purchases p where p.stripe_charge_id = p_charge_id
      union all select p.id, 3, 'checkout_session' from public.purchases p
        where p_checkout_session_id is not null and p.stripe_checkout_session_id = p_checkout_session_id
      union all select p.id, 4, 'invoice' from public.purchases p
        where p_invoice_id is not null and p.stripe_invoice_id = p_invoice_id
      union all select p.id, 5, 'purchase' from public.purchases p
        where p_purchase_id is not null and p.id = p_purchase_id
    ) c where c.id = v_purchase_id order by c.priority limit 1;
    v_status := 'matched';
  elsif v_candidate_count > 1 then
    v_purchase_id := null; v_user_id := null; v_match_basis := null;
    v_status := 'requires_review';
  else
    v_status := 'pending_match';
  end if;

  insert into public.pending_payment_reversals (
    stripe_event_id, event_type, payload_sha256, reversal_kind,
    stripe_payment_intent_id, stripe_charge_id, stripe_checkout_session_id,
    stripe_invoice_id, stripe_customer_id, purchase_id, user_id,
    amount_refunded_cents, charge_amount_cents, currency,
    stripe_dispute_id, dispute_status, processing_status, match_basis,
    reason_code, occurred_at
  ) values (
    p_stripe_event_id, p_event_type, p_payload_sha256, p_reversal_kind,
    p_payment_intent_id, p_charge_id, p_checkout_session_id,
    p_invoice_id, p_customer_id, v_purchase_id, v_user_id,
    case when p_reversal_kind = 'refund' then p_amount_refunded_cents end,
    case when p_reversal_kind = 'refund' then p_charge_amount_cents end,
    case when p_reversal_kind = 'refund' then upper(p_currency) end,
    case when p_reversal_kind = 'dispute' then p_dispute_id end,
    case when p_reversal_kind = 'dispute' then p_dispute_status end,
    v_status, v_match_basis,
    case when v_status = 'requires_review' then 'ambiguous_strong_identifiers' end,
    p_occurred_at
  );

  update public.payment_events set purchase_id = v_purchase_id,
    processing_status = 'processed', processed_at = now(), reason_code = v_status,
    last_error = null
  where provider_event_id = p_stripe_event_id;

  if v_status = 'requires_review' then
    perform public.record_payment_incident(
      p_stripe_event_id, 'payment_reversal_ambiguous',
      jsonb_build_object('reason', 'ambiguous_strong_identifiers', 'candidateCount', v_candidate_count),
      null, null, p_checkout_session_id, p_payment_intent_id, p_customer_id
    );
  end if;
  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'processed', true, 'reason', v_status,
    'purchase_id', v_purchase_id, 'license_id', null
  );
end;
$$;

create or replace function public.mark_pending_payment_reversal_applied(
  p_stripe_event_id text, p_purchase_id uuid, p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_row public.pending_payment_reversals%rowtype;
begin
  select r.* into v_row from public.pending_payment_reversals r
  where r.stripe_event_id = p_stripe_event_id for update;
  if v_row.id is null then raise exception 'Pending reversal not found' using errcode = 'P0002'; end if;
  if v_row.purchase_id is not null and v_row.purchase_id <> p_purchase_id then
    raise exception 'Pending reversal purchase mismatch' using errcode = '22023';
  end if;
  update public.pending_payment_reversals set purchase_id = p_purchase_id,
    user_id = (select p.user_id from public.purchases p where p.id = p_purchase_id),
    processing_status = 'applied', applied_at = coalesce(applied_at, now()),
    reason_code = left(coalesce(p_reason, 'applied'), 200),
    match_basis = coalesce(match_basis, 'purchase')
  where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.process_verified_order_independent_payment(
  p_provider_event_id text, p_event_type text, p_event_created_at timestamptz,
  p_payload_sha256 text, p_purchase_id uuid, p_checkout_session_id text,
  p_payment_intent_id text, p_charge_id text, p_customer_id text, p_price_id text,
  p_amount_total_cents bigint, p_currency text, p_country text,
  p_tax_rate_id text, p_tax_percentage numeric, p_tax_behavior text,
  p_subtotal_excluding_tax_cents bigint, p_tax_amount_cents bigint,
  p_total_including_tax_cents bigint, p_invoice_id text, p_invoice_number text,
  p_invoice_status text, p_invoice_country text, p_invoice_currency text,
  p_invoice_tax_rate_id text, p_invoice_tax_behavior text,
  p_invoice_subtotal_excluding_tax_cents bigint,
  p_invoice_tax_amount_cents bigint, p_invoice_total_including_tax_cents bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_result jsonb;
  v_refund public.pending_payment_reversals%rowtype;
  v_dispute public.pending_payment_reversals%rowtype;
  v_full_refund bigint := 0;
  v_latest_refund_at timestamptz;
  v_latest_refund_event_id text;
  v_latest_dispute text;
  v_latest_dispute_id text;
  v_latest_dispute_at timestamptz;
  v_ambiguous boolean := false;
  v_reason text;
begin
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id;
  if v_purchase.user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('purchase-user:' || v_purchase.user_id::text, 0));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id for update;

  -- Mirror migrations 009/010 before recording a blocked payment as verified.
  if v_purchase.id is null
     or v_purchase.stripe_checkout_session_id is distinct from p_checkout_session_id
     or v_purchase.stripe_customer_id is distinct from p_customer_id
     or upper(coalesce(p_country, '')) <> 'ES'
     or v_purchase.stripe_price_id is distinct from p_price_id
     or v_purchase.amount_due_cents is distinct from p_amount_total_cents
     or v_purchase.currency is distinct from upper(coalesce(p_currency, ''))
     or p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
     or p_charge_id !~ '^ch_[A-Za-z0-9_]+$'
     or v_purchase.expected_stripe_tax_rate_id is distinct from p_tax_rate_id
     or p_tax_rate_id !~ '^txr_[A-Za-z0-9]+$'
     or p_tax_percentage is distinct from 21.00
     or p_tax_behavior is distinct from 'inclusive'
     or p_subtotal_excluding_tax_cents is distinct from v_purchase.amount_due_base_cents
     or p_tax_amount_cents is distinct from v_purchase.amount_due_vat_cents
     or p_total_including_tax_cents is distinct from v_purchase.amount_due_cents
     or p_subtotal_excluding_tax_cents + p_tax_amount_cents is distinct from p_total_including_tax_cents
     or p_invoice_id !~ '^in_[A-Za-z0-9_]+$'
     or length(btrim(coalesce(p_invoice_number, ''))) = 0
     or p_invoice_status is distinct from 'paid'
     or upper(coalesce(p_invoice_country, '')) <> 'ES'
     or upper(coalesce(p_invoice_currency, '')) <> v_purchase.currency
     or p_invoice_tax_rate_id is distinct from p_tax_rate_id
     or p_invoice_tax_behavior is distinct from 'inclusive'
     or p_invoice_subtotal_excluding_tax_cents is distinct from p_subtotal_excluding_tax_cents
     or p_invoice_tax_amount_cents is distinct from p_tax_amount_cents
     or p_invoice_total_including_tax_cents is distinct from p_total_including_tax_cents then
    return public.process_verified_taxed_staging_payment(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_customer_id,
      p_price_id, p_amount_total_cents, p_currency, p_country, p_tax_rate_id,
      p_tax_percentage, p_tax_behavior, p_subtotal_excluding_tax_cents,
      p_tax_amount_cents, p_total_including_tax_cents, p_invoice_id,
      p_invoice_number, p_invoice_status, p_invoice_country, p_invoice_currency,
      p_invoice_tax_rate_id, p_invoice_tax_behavior,
      p_invoice_subtotal_excluding_tax_cents, p_invoice_tax_amount_cents,
      p_invoice_total_including_tax_cents
    );
  end if;

  for v_refund in
    select r.* from public.pending_payment_reversals r
    where r.processing_status in ('pending_match', 'matched', 'requires_review')
      and (r.stripe_payment_intent_id = p_payment_intent_id
        or r.stripe_charge_id = p_charge_id
        or r.stripe_checkout_session_id = p_checkout_session_id
        or r.stripe_invoice_id = p_invoice_id or r.purchase_id = p_purchase_id)
    order by r.occurred_at, r.stripe_event_id for update
  loop
    if v_refund.processing_status = 'requires_review'
       or (v_refund.stripe_payment_intent_id is not null
           and v_refund.stripe_payment_intent_id <> p_payment_intent_id)
       or (v_refund.stripe_charge_id is not null
           and v_refund.stripe_charge_id <> p_charge_id)
       or (v_refund.stripe_checkout_session_id is not null
           and v_refund.stripe_checkout_session_id <> p_checkout_session_id)
       or (v_refund.stripe_invoice_id is not null
           and v_refund.stripe_invoice_id <> p_invoice_id)
       or (v_refund.purchase_id is not null and v_refund.purchase_id <> p_purchase_id) then
      v_ambiguous := true;
    elsif v_refund.reversal_kind = 'refund' then
      if v_refund.charge_amount_cents <> p_amount_total_cents
         or v_refund.currency <> upper(p_currency) then v_ambiguous := true;
      elsif v_refund.amount_refunded_cents >= v_full_refund then
        v_full_refund := v_refund.amount_refunded_cents;
        v_latest_refund_at := v_refund.occurred_at;
        v_latest_refund_event_id := v_refund.stripe_event_id;
      end if;
    elsif v_latest_dispute_at is null or v_refund.occurred_at >= v_latest_dispute_at then
      v_latest_dispute := v_refund.dispute_status;
      v_latest_dispute_id := v_refund.stripe_dispute_id;
      v_latest_dispute_at := v_refund.occurred_at;
    end if;
  end loop;

  if v_ambiguous then
    update public.pending_payment_reversals set processing_status = 'requires_review',
      reason_code = 'conflicting_reversal_identity'
    where processing_status <> 'applied' and (
      stripe_payment_intent_id = p_payment_intent_id
      or stripe_charge_id = p_charge_id or stripe_checkout_session_id = p_checkout_session_id
      or stripe_invoice_id = p_invoice_id or purchase_id = p_purchase_id
    );
    perform public.record_payment_incident(
      p_provider_event_id, 'payment_reversal_ambiguous',
      jsonb_build_object('reason', 'conflicting_reversal_identity'),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'processed', processed_at = now(),
      reason_code = 'payment_reversal_requires_review'
    where provider_event_id = p_provider_event_id;
    return jsonb_build_object('ok', true, 'duplicate', false, 'processed', true,
      'reason', 'payment_reversal_requires_review', 'purchase_id', v_purchase.id,
      'license_id', null);
  end if;

  if v_full_refund >= p_amount_total_cents
     or v_latest_dispute in ('open', 'lost') then
    update public.purchases set
      stripe_payment_intent_id = p_payment_intent_id,
      stripe_charge_id = p_charge_id,
      amount_paid_cents = p_amount_total_cents,
      stripe_customer_id = p_customer_id, fiscal_country = 'ES',
      applied_stripe_tax_rate_id = p_tax_rate_id,
      tax_percentage = p_tax_percentage, tax_behavior = p_tax_behavior,
      subtotal_excluding_tax_cents = p_subtotal_excluding_tax_cents,
      tax_amount_cents = p_tax_amount_cents,
      total_including_tax_cents = p_total_including_tax_cents,
      stripe_invoice_id = p_invoice_id, stripe_invoice_number = p_invoice_number,
      payment_verified_at = p_event_created_at,
      payment_verification_event_id = p_provider_event_id,
      paid_at = p_event_created_at,
      amount_refunded_cents = greatest(amount_refunded_cents,
        least(v_full_refund, p_amount_total_cents)),
      refund_status = case when v_full_refund >= p_amount_total_cents
        then 'fully_refunded' when v_full_refund > 0 then 'partially_refunded'
        else refund_status end,
      last_refund_at = case when v_full_refund > 0
        then v_latest_refund_at else last_refund_at end,
      last_refund_event_created_at = case when v_full_refund > 0
        then v_latest_refund_at else last_refund_event_created_at end,
      refunded_at = case when v_full_refund >= p_amount_total_cents
        then v_latest_refund_at else refunded_at end,
      dispute_status = coalesce(v_latest_dispute, dispute_status),
      stripe_dispute_id = coalesce(v_latest_dispute_id, stripe_dispute_id),
      last_dispute_event_created_at = coalesce(v_latest_dispute_at, last_dispute_event_created_at),
      disputed_at = case when v_latest_dispute in ('open', 'lost')
        then v_latest_dispute_at else disputed_at end,
      status = case when v_full_refund >= p_amount_total_cents
        then 'refunded' else 'disputed' end,
      failure_reason = case when v_full_refund >= p_amount_total_cents
        then 'fully_refunded_before_activation' else 'dispute_before_activation' end
    where id = v_purchase.id;

    v_reason := case when v_full_refund >= p_amount_total_cents
      then 'fully_refunded_before_activation' else 'dispute_before_activation' end;
    update public.pending_payment_reversals set purchase_id = v_purchase.id,
      user_id = v_purchase.user_id, processing_status = 'applied', applied_at = now(),
      reason_code = v_reason,
      match_basis = case when stripe_payment_intent_id = p_payment_intent_id
        then 'payment_intent' when stripe_charge_id = p_charge_id then 'charge'
        when stripe_checkout_session_id = p_checkout_session_id
        then 'checkout_session' when stripe_invoice_id = p_invoice_id then 'invoice'
        else 'purchase' end
    where processing_status <> 'applied' and (
      stripe_payment_intent_id = p_payment_intent_id or stripe_charge_id = p_charge_id
      or stripe_checkout_session_id = p_checkout_session_id
      or stripe_invoice_id = p_invoice_id or purchase_id = p_purchase_id
    );
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'processed', processed_at = now(), reason_code = v_reason,
      last_error = null
    where provider_event_id = p_provider_event_id
       or provider_event_id in (
         select r.stripe_event_id from public.pending_payment_reversals r
         where r.purchase_id = v_purchase.id and r.reason_code = v_reason
       );
    perform public.record_payment_incident(
      p_provider_event_id,
      case when v_full_refund >= p_amount_total_cents
        then 'payment_fully_refunded_before_activation'
        else 'payment_dispute_before_activation' end,
      jsonb_build_object('reason', v_reason, 'amountRefundedCents', v_full_refund,
        'disputeStatus', v_latest_dispute, 'automaticallyApplied', true),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    if v_full_refund >= p_amount_total_cents then
      with resolved as (
        update public.payment_incidents set status = 'resolved', resolved_at = now(),
          resolution_reason = 'Full refund was automatically applied before activation'
        where stripe_event_id = p_provider_event_id
          and kind = 'payment_fully_refunded_before_activation'
        returning id
      )
      insert into public.payment_incident_events (incident_id, action, reason)
      select r.id, 'resolved', 'Automatically resolved: no paid licence was created'
      from resolved r
      where not exists (select 1 from public.payment_incident_events e
        where e.incident_id = r.id and e.action = 'resolved');
    end if;
    if v_full_refund > 0 and v_full_refund < p_amount_total_cents then
      perform public.record_payment_incident(
        v_latest_refund_event_id, 'partial_refund_review',
        jsonb_build_object('amountPaidCents', p_amount_total_cents,
          'amountRefundedCents', v_full_refund,
          'remainingCents', p_amount_total_cents - v_full_refund,
          'appliedBeforeActivation', true),
        v_purchase.user_id, v_purchase.id, p_checkout_session_id,
        p_payment_intent_id, p_customer_id
      );
    end if;
    return jsonb_build_object('ok', true, 'duplicate', false, 'processed', true,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null);
  end if;

  v_result := public.process_verified_taxed_staging_payment(
    p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
    p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_customer_id,
    p_price_id, p_amount_total_cents, p_currency, p_country, p_tax_rate_id,
    p_tax_percentage, p_tax_behavior, p_subtotal_excluding_tax_cents,
    p_tax_amount_cents, p_total_including_tax_cents, p_invoice_id,
    p_invoice_number, p_invoice_status, p_invoice_country, p_invoice_currency,
    p_invoice_tax_rate_id, p_invoice_tax_behavior,
    p_invoice_subtotal_excluding_tax_cents, p_invoice_tax_amount_cents,
    p_invoice_total_including_tax_cents
  );
  if coalesce((v_result->>'processed')::boolean, false) then
    update public.purchases set payment_verified_at = coalesce(payment_verified_at, p_event_created_at),
      payment_verification_event_id = coalesce(payment_verification_event_id, p_provider_event_id),
      stripe_charge_id = coalesce(stripe_charge_id, p_charge_id)
    where id = p_purchase_id;
    for v_refund in
      select r.* from public.pending_payment_reversals r
      where r.processing_status in ('pending_match', 'matched')
        and r.reversal_kind = 'refund'
        and (r.stripe_payment_intent_id = p_payment_intent_id
          or r.stripe_charge_id = p_charge_id or r.purchase_id = p_purchase_id)
      order by r.occurred_at, r.stripe_event_id for update
    loop
      perform public.process_verified_final_refund(
        v_refund.stripe_event_id, v_refund.event_type, v_refund.occurred_at,
        v_refund.payload_sha256, p_purchase_id, p_payment_intent_id,
        v_refund.amount_refunded_cents, v_refund.charge_amount_cents, v_refund.currency
      );
      update public.pending_payment_reversals set purchase_id = p_purchase_id,
        user_id = v_purchase.user_id, processing_status = 'applied', applied_at = now(),
        reason_code = 'payment_partially_refunded_before_activation',
        match_basis = case when v_refund.stripe_payment_intent_id = p_payment_intent_id
          then 'payment_intent' else 'charge' end
      where id = v_refund.id;
      update public.payment_events set reason_code = 'payment_partially_refunded_before_activation'
      where provider_event_id = v_refund.stripe_event_id
        and v_refund.amount_refunded_cents < v_refund.charge_amount_cents;
      update public.payment_incidents set details = details || jsonb_build_object(
        'reason', 'payment_partially_refunded_before_activation',
        'appliedBeforeActivation', true
      ) where stripe_event_id = v_refund.stripe_event_id
        and kind = 'partial_refund_review';
    end loop;
    for v_dispute in
      select r.* from public.pending_payment_reversals r
      where r.processing_status in ('pending_match', 'matched')
        and r.reversal_kind = 'dispute'
        and (r.stripe_payment_intent_id = p_payment_intent_id
          or r.stripe_charge_id = p_charge_id or r.purchase_id = p_purchase_id)
      order by r.occurred_at, r.stripe_event_id for update
    loop
      perform public.process_verified_staging_dispute(
        v_dispute.stripe_event_id, v_dispute.event_type, v_dispute.occurred_at,
        v_dispute.payload_sha256, p_purchase_id, p_payment_intent_id,
        v_dispute.stripe_dispute_id, v_dispute.dispute_status
      );
      update public.pending_payment_reversals set purchase_id = p_purchase_id,
        user_id = v_purchase.user_id, processing_status = 'applied', applied_at = now(),
        reason_code = 'applied_after_payment', match_basis = 'payment_intent'
      where id = v_dispute.id;
    end loop;
  end if;
  return v_result;
end;
$$;

create or replace function public.process_verified_order_independent_dispute(
  p_provider_event_id text, p_event_type text, p_event_created_at timestamptz,
  p_payload_sha256 text, p_purchase_id uuid, p_payment_intent_id text,
  p_dispute_id text, p_dispute_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_purchase public.purchases%rowtype; v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id for update;
  if v_purchase.id is null or v_purchase.stripe_payment_intent_id is distinct from p_payment_intent_id then
    return public.process_verified_staging_dispute(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_payment_intent_id, p_dispute_id, p_dispute_status
    );
  end if;
  if p_dispute_status = 'won' and v_purchase.resulting_license_id is null
     and v_purchase.payment_verified_at is not null
     and v_purchase.refund_status <> 'fully_refunded'
     and not exists (
       select 1 from public.pending_payment_reversals r
       where r.purchase_id = v_purchase.id and r.reversal_kind = 'dispute'
         and r.processing_status <> 'ignored_with_reason'
         and r.dispute_status in ('open', 'lost') and r.occurred_at > p_event_created_at
     ) then
    update public.purchases set status = 'pending', dispute_status = 'won',
      stripe_dispute_id = p_dispute_id,
      last_dispute_event_created_at = p_event_created_at,
      failure_reason = null where id = v_purchase.id;
    v_result := public.process_verified_taxed_staging_payment(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      v_purchase.id, v_purchase.stripe_checkout_session_id,
      v_purchase.stripe_payment_intent_id, v_purchase.stripe_customer_id,
      v_purchase.stripe_price_id, v_purchase.amount_paid_cents, v_purchase.currency,
      'ES', v_purchase.applied_stripe_tax_rate_id, v_purchase.tax_percentage,
      v_purchase.tax_behavior, v_purchase.subtotal_excluding_tax_cents,
      v_purchase.tax_amount_cents, v_purchase.total_including_tax_cents,
      v_purchase.stripe_invoice_id, v_purchase.stripe_invoice_number, 'paid', 'ES',
      v_purchase.currency, v_purchase.applied_stripe_tax_rate_id,
      v_purchase.tax_behavior, v_purchase.subtotal_excluding_tax_cents,
      v_purchase.tax_amount_cents, v_purchase.total_including_tax_cents
    );
    if coalesce((v_result->>'processed')::boolean, false) then
      update public.purchases set dispute_status = 'won', stripe_dispute_id = p_dispute_id,
        last_dispute_event_created_at = p_event_created_at where id = v_purchase.id;
      update public.pending_payment_reversals set processing_status = 'applied',
        applied_at = coalesce(applied_at, now()), purchase_id = v_purchase.id,
        user_id = v_purchase.user_id, reason_code = 'dispute_won_activation',
        match_basis = coalesce(match_basis, 'payment_intent')
      where stripe_event_id = p_provider_event_id;
      update public.payment_incidents set status = 'resolved', resolved_at = now(),
        resolution_reason = 'Stripe dispute won; verified payment activated'
      where purchase_id = v_purchase.id and kind = 'payment_dispute_before_activation'
        and status in ('open', 'retrying');
      return v_result || jsonb_build_object('reason', 'dispute_won_activated');
    end if;
    update public.purchases set status = 'disputed', dispute_status = 'won',
      failure_reason = 'dispute_won_activation_failed' where id = v_purchase.id;
    return v_result;
  end if;
  v_result := public.process_verified_staging_dispute(
    p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
    p_purchase_id, p_payment_intent_id, p_dispute_id, p_dispute_status
  );
  if coalesce((v_result->>'processed')::boolean, false) then
    update public.pending_payment_reversals set processing_status = 'applied',
      applied_at = coalesce(applied_at, now()), purchase_id = p_purchase_id,
      user_id = v_purchase.user_id, reason_code = 'applied_to_verified_payment',
      match_basis = coalesce(match_basis, 'payment_intent')
    where stripe_event_id = p_provider_event_id;
  end if;
  return v_result;
end;
$$;

create or replace function public.get_my_payment_activation_status(p_checkout_session_id text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select jsonb_build_object(
      'purchaseId', p.id,
      'status', case
        when p.status = 'paid' and p.resulting_license_id is not null then 'activated'
        when p.status = 'refunded' and p.failure_reason = 'fully_refunded_before_activation'
          then 'fully_refunded_before_activation'
        when p.status = 'disputed' and p.resulting_license_id is null
          then 'dispute_before_activation'
        when exists (select 1 from public.payment_incidents i
          where i.purchase_id = p.id and i.status in ('open', 'retrying')) then 'review'
        when p.status = 'pending' then 'pending'
        else 'failed'
      end
    ) from public.purchases p
    where p.user_id = auth.uid() and p.stripe_checkout_session_id = p_checkout_session_id
    limit 1
  ), jsonb_build_object('purchaseId', null, 'status', 'unknown'));
$$;

revoke all on function public.store_pending_payment_reversal(
  text, text, timestamptz, text, text, text, text, text, text, text, uuid,
  bigint, bigint, text, text, text
) from public, anon, authenticated;
grant execute on function public.store_pending_payment_reversal(
  text, text, timestamptz, text, text, text, text, text, text, text, uuid,
  bigint, bigint, text, text, text
) to service_role;
revoke all on function public.mark_pending_payment_reversal_applied(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_pending_payment_reversal_applied(text, uuid, text)
  to service_role;
revoke all on function public.process_verified_order_independent_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, text, bigint, text, text,
  text, numeric, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) from public, anon, authenticated;
grant execute on function public.process_verified_order_independent_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, text, bigint, text, text,
  text, numeric, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) to service_role;
revoke all on function public.process_verified_order_independent_dispute(
  text, text, timestamptz, text, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.process_verified_order_independent_dispute(
  text, text, timestamptz, text, uuid, text, text, text
) to service_role;
revoke all on function public.get_my_payment_activation_status(text) from public, anon;
grant execute on function public.get_my_payment_activation_status(text) to authenticated;

-- Only migration 011's guarded payment entry point remains callable by the backend.
revoke execute on function public.process_verified_taxed_staging_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, bigint, text, text,
  text, numeric, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) from service_role;
revoke execute on function public.process_verified_staging_dispute(
  text, text, timestamptz, text, uuid, text, text, text
) from service_role;

comment on table public.pending_payment_reversals is
  'Durable service-only Stripe reversals consumed before payment activation; Customer is never a primary match.';
comment on function public.process_verified_order_independent_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, text, bigint, text, text,
  text, numeric, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) is 'Validates fiscal payment evidence, locks the purchase and applies earlier reversals before any licence can become visible.';
