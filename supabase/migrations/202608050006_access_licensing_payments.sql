-- MatriculaPro launch access, one-time licences and Stripe test-mode ledger
-- Reviewed: 2026-08-05
-- Additive migration. Historical Founder objects are neutralised, not trusted.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Neutralise the historical entitlement projection. user_licenses is now the
-- only authority for access; profiles/access metadata are never consulted.
-- ---------------------------------------------------------------------------

drop view if exists public.founder_garage;
drop view if exists public.founder_garage_view;

alter table public.profiles drop constraint if exists profiles_access_level_valid;
alter table public.profiles alter column access_level set default 'free';
update public.profiles set access_level = 'free'
where access_level is distinct from 'free';
alter table public.profiles alter column access_level set not null;
alter table public.profiles
  add constraint profiles_access_level_valid
  check (access_level = 'free');

comment on column public.profiles.access_level is
  'Legacy compatibility projection fixed to free. Never use for authorization; query user_licenses.';

-- ---------------------------------------------------------------------------
-- Authoritative licences, purchases and append-only audit ledgers
-- ---------------------------------------------------------------------------

create table if not exists public.user_licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('free', 'particular', 'professional')),
  duration text check (duration is null or duration in ('one_month', 'six_months', 'twelve_months')),
  status text not null check (status in (
    'free', 'pending_payment', 'active', 'expired', 'revoked', 'refunded'
  )),
  starts_at timestamptz,
  expires_at timestamptz,
  original_purchase_id uuid,
  upgraded_from_license_id uuid references public.user_licenses(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  check (
    (
      tier = 'free'
      and duration is null
      and status = 'free'
      and starts_at is null
      and expires_at is null
      and original_purchase_id is null
      and upgraded_from_license_id is null
    )
    or (
      tier in ('particular', 'professional')
      and duration is not null
      and status <> 'free'
      and (status = 'pending_payment' or original_purchase_id is not null)
      and (
        status = 'pending_payment'
        or (starts_at is not null and expires_at is not null and expires_at > starts_at)
      )
    )
  )
);

create unique index if not exists user_licenses_one_free_per_user_idx
  on public.user_licenses (user_id) where tier = 'free';
create unique index if not exists user_licenses_one_active_paid_per_user_idx
  on public.user_licenses (user_id) where status = 'active' and tier <> 'free';
create index if not exists user_licenses_user_status_expiry_idx
  on public.user_licenses (user_id, status, expires_at desc);
create index if not exists user_licenses_upgrade_source_idx
  on public.user_licenses (upgraded_from_license_id)
  where upgraded_from_license_id is not null;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  tier text not null check (tier in ('particular', 'professional')),
  duration text not null check (duration in ('one_month', 'six_months', 'twelve_months')),
  status text not null default 'pending' check (status in (
    'pending', 'paid', 'failed', 'cancelled', 'refunded', 'disputed'
  )),
  provider text not null default 'stripe' check (provider = 'stripe'),
  livemode boolean not null default false check (not livemode),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  base_cents bigint not null check (base_cents >= 0),
  vat_cents bigint not null check (vat_cents >= 0),
  total_cents bigint not null check (total_cents > 0),
  upgrade_credit_cents bigint not null default 0 check (upgrade_credit_cents >= 0),
  amount_due_cents bigint not null check (amount_due_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  vat_rate_basis_points integer not null check (vat_rate_basis_points between 0 and 10000),
  amount_due_base_cents bigint generated always as (
    round(
      amount_due_cents::numeric * 10000::numeric
      / (10000::numeric + vat_rate_basis_points::numeric)
    )::bigint
  ) stored,
  amount_due_vat_cents bigint generated always as (
    amount_due_cents - round(
      amount_due_cents::numeric * 10000::numeric
      / (10000::numeric + vat_rate_basis_points::numeric)
    )::bigint
  ) stored,
  tax_country text not null check (tax_country ~ '^[A-Z]{2}$'),
  tax_included boolean not null default true check (tax_included),
  price_source text not null check (length(btrim(price_source)) > 0),
  price_effective_at timestamptz not null,
  stripe_price_id text not null check (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  source_license_id uuid references public.user_licenses(id) on delete restrict,
  resulting_license_id uuid references public.user_licenses(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  disputed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (user_id, idempotency_key),
  check (base_cents + vat_cents = total_cents),
  check (upgrade_credit_cents <= total_cents),
  check (amount_due_cents = total_cents - upgrade_credit_cents),
  check ((source_license_id is null and upgrade_credit_cents = 0) or source_license_id is not null)
);

create unique index if not exists purchases_checkout_session_unique_idx
  on public.purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists purchases_payment_intent_unique_idx
  on public.purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create unique index if not exists purchases_one_open_upgrade_per_source_idx
  on public.purchases (source_license_id)
  where source_license_id is not null and status = 'pending';
create unique index if not exists purchases_one_pending_per_user_idx
  on public.purchases (user_id)
  where status = 'pending';
create index if not exists purchases_user_created_idx
  on public.purchases (user_id, created_at desc);
create unique index if not exists purchases_id_user_id_key
  on public.purchases (id, user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_licenses'::regclass
      and conname = 'user_licenses_original_purchase_fk'
  ) then
    alter table public.user_licenses
      add constraint user_licenses_original_purchase_fk
      foreign key (original_purchase_id) references public.purchases(id) on delete restrict;
  end if;
end;
$$;

-- Ledgers are declared before their transition functions. The idempotent table
-- declarations later in this migration retain section-local readability.
create table if not exists public.license_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  license_id uuid not null references public.user_licenses(id) on delete restrict,
  purchase_id uuid references public.purchases(id) on delete restrict,
  event_type text not null check (event_type in (
    'free_assigned', 'activated', 'upgraded', 'expired', 'renewed',
    'revoked', 'refunded', 'disputed'
  )),
  previous_status text,
  new_status text not null,
  occurred_at timestamptz not null default now(),
  provider_event_id text,
  reason_code text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_event_id text not null unique,
  event_type text not null,
  livemode boolean not null default false check (not livemode),
  purchase_id uuid references public.purchases(id) on delete restrict,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  processing_status text not null check (processing_status in (
    'processing', 'processed', 'ignored', 'failed'
  )),
  attempts integer not null default 1 check (attempts > 0),
  reason_code text,
  event_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.upgrade_eligibility (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  source_license_id uuid not null unique references public.user_licenses(id) on delete restrict,
  source_purchase_id uuid not null references public.purchases(id) on delete restrict,
  tier text not null check (tier in ('particular', 'professional')),
  eligible_from timestamptz not null,
  eligible_until timestamptz not null,
  max_credit_cents bigint not null check (max_credit_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'eligible' check (status in (
    'eligible', 'reserved', 'consumed', 'invalidated', 'expired'
  )),
  reserved_purchase_id uuid references public.purchases(id) on delete restrict,
  consumed_purchase_id uuid references public.purchases(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz,
  invalidated_at timestamptz,
  invalidation_reason text,
  check (eligible_until = eligible_from + interval '15 days'),
  check (
    (status = 'eligible' and reserved_purchase_id is null and consumed_purchase_id is null)
    or (status = 'reserved' and reserved_purchase_id is not null and consumed_purchase_id is null)
    or (status = 'consumed' and consumed_purchase_id is not null)
    or status in ('invalidated', 'expired')
  )
);

create or replace function public.process_verified_access_reversal(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_sha256 text,
  p_purchase_id uuid,
  p_payment_intent_id text,
  p_kind text,
  p_reversed_amount_cents bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.payment_events%rowtype;
  v_purchase public.purchases%rowtype;
  v_license public.user_licenses%rowtype;
  v_eligibility public.upgrade_eligibility%rowtype;
  v_target_purchase public.purchases%rowtype;
  v_target_license public.user_licenses%rowtype;
  v_new_purchase_status text;
  v_new_license_status text;
begin
  if p_kind not in ('refund', 'dispute')
     or p_reversed_amount_cents <= 0
     or p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+' then
    raise exception 'Invalid verified reversal' using errcode = '22023';
  end if;
  v_new_purchase_status := case p_kind when 'refund' then 'refunded' else 'disputed' end;
  v_new_license_status := case p_kind when 'refund' then 'refunded' else 'revoked' end;

  perform pg_advisory_xact_lock(hashtextextended(p_provider_event_id, 0));
  select event.* into v_event
  from public.payment_events event
  where event.provider_event_id = p_provider_event_id
  for update;
  if v_event.id is not null and v_event.processing_status in ('processed', 'ignored') then
    return jsonb_build_object(
      'ok', true, 'duplicate', true,
      'processed', v_event.processing_status = 'processed',
      'reason', v_event.reason_code, 'purchase_id', v_event.purchase_id,
      'license_id', null
    );
  end if;
  if v_event.id is null then
    insert into public.payment_events (
      provider_event_id, event_type, livemode, purchase_id, payload_sha256,
      processing_status, event_created_at
    ) values (
      p_provider_event_id, p_event_type, false, null, p_payload_sha256,
      'processing', p_event_created_at
    ) returning * into v_event;
  else
    update public.payment_events
    set attempts = attempts + case when processing_status = 'failed' then 1 else 0 end,
        processing_status = 'processing',
        processed_at = null,
        reason_code = null,
        last_error = null
    where id = v_event.id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_purchase_id::text, 0));
  select purchase.* into v_purchase
  from public.purchases purchase
  where purchase.id = p_purchase_id
  for update;
  if v_purchase.id is not null then
    update public.payment_events
    set purchase_id = v_purchase.id
    where id = v_event.id;
  end if;
  if v_purchase.id is null then
    update public.payment_events
    set processing_status = 'ignored', processed_at = now(), reason_code = 'purchase_not_found'
    where id = v_event.id;
    return jsonb_build_object(
      'ok', false, 'duplicate', false, 'processed', false,
      'reason', 'purchase_not_found', 'purchase_id', null, 'license_id', null
    );
  end if;
  if v_purchase.stripe_payment_intent_id is not null
     and v_purchase.stripe_payment_intent_id <> p_payment_intent_id then
    update public.payment_events
    set processing_status = 'ignored', processed_at = now(), reason_code = 'payment_intent_mismatch'
    where id = v_event.id;
    return jsonb_build_object(
      'ok', false, 'duplicate', false, 'processed', false,
      'reason', 'payment_intent_mismatch', 'purchase_id', v_purchase.id, 'license_id', null
    );
  end if;
  if v_purchase.status in ('refunded', 'disputed') then
    update public.payment_events
    set processing_status = 'processed', processed_at = now(), reason_code = 'purchase_already_reversed'
    where id = v_event.id;
    return jsonb_build_object(
      'ok', true, 'duplicate', true, 'processed', true,
      'reason', 'purchase_already_reversed', 'purchase_id', v_purchase.id,
      'license_id', v_purchase.resulting_license_id
    );
  end if;

  if v_purchase.resulting_license_id is not null then
    select license.* into v_license
    from public.user_licenses license
    where license.id = v_purchase.resulting_license_id
    for update;
    if v_license.id is not null and v_license.status not in ('refunded', 'revoked') then
      update public.user_licenses
      set status = v_new_license_status,
          metadata = metadata || jsonb_build_object(
            'reversalReason', p_kind, 'reversalEventId', p_provider_event_id
          )
      where id = v_license.id;
      insert into public.license_events (
        user_id, license_id, purchase_id, event_type, previous_status,
        new_status, occurred_at, provider_event_id, reason_code
      ) values (
        v_license.user_id, v_license.id, v_purchase.id,
        case p_kind when 'refund' then 'refunded' else 'disputed' end,
        v_license.status, v_new_license_status, p_event_created_at,
        p_provider_event_id, 'verified_stripe_' || p_kind
      );
    end if;
  end if;

  -- A reversal of the original one-month payment invalidates its promotion.
  -- If it was already consumed, the upgraded access is revoked too; it is not
  -- silently restored or converted into store credit.
  for v_eligibility in
    select eligibility.*
    from public.upgrade_eligibility eligibility
    where eligibility.source_purchase_id = v_purchase.id
       or eligibility.reserved_purchase_id = v_purchase.id
       or eligibility.consumed_purchase_id = v_purchase.id
    for update
  loop
    if v_eligibility.consumed_purchase_id is not null
       and v_eligibility.source_purchase_id = v_purchase.id then
      select purchase.* into v_target_purchase
      from public.purchases purchase
      where purchase.id = v_eligibility.consumed_purchase_id
      for update;
      if v_target_purchase.resulting_license_id is not null then
        select license.* into v_target_license
        from public.user_licenses license
        where license.id = v_target_purchase.resulting_license_id
        for update;
        if v_target_license.id is not null
           and v_target_license.status not in ('refunded', 'revoked') then
          update public.user_licenses
          set status = 'revoked',
              metadata = metadata || jsonb_build_object(
                'revocationReason', 'source_purchase_reversed',
                'reversalEventId', p_provider_event_id
              )
          where id = v_target_license.id;
          insert into public.license_events (
            user_id, license_id, purchase_id, event_type, previous_status,
            new_status, occurred_at, provider_event_id, reason_code
          ) values (
            v_target_license.user_id, v_target_license.id, v_target_purchase.id,
            'revoked', v_target_license.status, 'revoked', p_event_created_at,
            p_provider_event_id, 'source_purchase_reversed'
          );
        end if;
      end if;
    end if;
    update public.upgrade_eligibility
    set status = 'invalidated', invalidated_at = p_event_created_at,
        invalidation_reason = p_kind,
        reserved_purchase_id = case when status = 'reserved' then null else reserved_purchase_id end
    where id = v_eligibility.id;
  end loop;

  update public.purchases
  set status = v_new_purchase_status,
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id),
      paid_at = coalesce(paid_at, p_event_created_at),
      refunded_at = case when p_kind = 'refund' then p_event_created_at else refunded_at end,
      disputed_at = case when p_kind = 'dispute' then p_event_created_at else disputed_at end,
      metadata = metadata || jsonb_build_object(
        'reversedAmountCents', p_reversed_amount_cents,
        'reversalKind', p_kind
      )
  where id = v_purchase.id;
  update public.payment_events
  set processing_status = 'processed', processed_at = now(), reason_code = null
  where id = v_event.id;

  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'processed', true,
    'reason', null, 'purchase_id', v_purchase.id,
    'license_id', v_purchase.resulting_license_id
  );
end;
$$;

create or replace function public.expire_due_user_licenses(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_license public.user_licenses%rowtype;
  v_count integer := 0;
begin
  for v_license in
    select license.*
    from public.user_licenses license
    where license.status = 'active'
      and license.tier in ('particular', 'professional')
      and license.expires_at <= p_now
    for update skip locked
  loop
    update public.user_licenses set status = 'expired' where id = v_license.id;
    insert into public.license_events (
      user_id, license_id, event_type, previous_status, new_status,
      occurred_at, reason_code
    ) values (
      v_license.user_id, v_license.id, 'expired', 'active', 'expired',
      v_license.expires_at, 'calendar_expiry'
    );
    v_count := v_count + 1;
  end loop;

  update public.upgrade_eligibility
  set status = 'expired'
  where status = 'eligible' and eligible_until < p_now;
  return v_count;
end;
$$;

create unique index if not exists license_events_provider_event_unique_idx
  on public.license_events (provider_event_id, license_id, event_type)
  where provider_event_id is not null;
create index if not exists license_events_user_occurred_idx
  on public.license_events (user_id, occurred_at desc);
create index if not exists license_events_license_occurred_idx
  on public.license_events (license_id, occurred_at desc);

create index if not exists payment_events_purchase_received_idx
  on public.payment_events (purchase_id, received_at desc);
create index if not exists payment_events_status_received_idx
  on public.payment_events (processing_status, received_at);

create index if not exists upgrade_eligibility_user_status_idx
  on public.upgrade_eligibility (user_id, status, eligible_until);

-- ---------------------------------------------------------------------------
-- Free and professional product data
-- ---------------------------------------------------------------------------

create table if not exists public.free_vehicle_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text check (title is null or length(title) <= 160),
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'blocked')),
  rule_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (id, user_id)
);

create index if not exists free_vehicle_checks_user_updated_idx
  on public.free_vehicle_checks (user_id, updated_at desc) where deleted_at is null;

create table if not exists public.professional_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_display_name text,
  tax_identifier text,
  business_address text,
  contact_email text,
  contact_phone text,
  logo_url text,
  report_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (business_display_name is null or length(business_display_name) <= 160),
  check (report_footer is null or length(report_footer) <= 500)
);

create table if not exists public.professional_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reference text,
  display_name text not null check (length(btrim(display_name)) between 1 and 160),
  email text,
  phone text,
  tax_identifier text,
  address text,
  notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  unique (user_id, reference)
);

create index if not exists professional_clients_user_updated_idx
  on public.professional_clients (user_id, updated_at desc) where deleted_at is null;

create table if not exists public.professional_case_financials (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  client_id uuid,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  purchase_cost numeric(14,2) not null default 0 check (purchase_cost >= 0),
  transport_cost numeric(14,2) not null default 0 check (transport_cost >= 0),
  repair_cost numeric(14,2) not null default 0 check (repair_cost >= 0),
  itv_cost numeric(14,2) not null default 0 check (itv_cost >= 0),
  homologation_cost numeric(14,2) not null default 0 check (homologation_cost >= 0),
  taxes_cost numeric(14,2) not null default 0 check (taxes_cost >= 0),
  dgt_cost numeric(14,2) not null default 0 check (dgt_cost >= 0),
  plates_cost numeric(14,2) not null default 0 check (plates_cost >= 0),
  other_cost numeric(14,2) not null default 0 check (other_cost >= 0),
  target_sale_price numeric(14,2) check (target_sale_price is null or target_sale_price >= 0),
  actual_sale_price numeric(14,2) check (actual_sale_price is null or actual_sale_price >= 0),
  total_cost numeric(14,2) generated always as (
    purchase_cost + transport_cost + repair_cost + itv_cost + homologation_cost
    + taxes_cost + dgt_cost + plates_cost + other_cost
  ) stored,
  planned_margin numeric(14,2) generated always as (
    case when target_sale_price is null then null else target_sale_price - (
      purchase_cost + transport_cost + repair_cost + itv_cost + homologation_cost
      + taxes_cost + dgt_cost + plates_cost + other_cost
    ) end
  ) stored,
  actual_margin numeric(14,2) generated always as (
    case when actual_sale_price is null then null else actual_sale_price - (
      purchase_cost + transport_cost + repair_cost + itv_cost + homologation_cost
      + taxes_cost + dgt_cost + plates_cost + other_cost
    ) end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text,
  unique (case_id),
  unique (id, user_id),
  constraint professional_case_financials_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  constraint professional_case_financials_client_owner_fk
    foreign key (client_id, user_id)
    references public.professional_clients(id, user_id)
    on delete restrict
);

create index if not exists professional_financials_user_updated_idx
  on public.professional_case_financials (user_id, updated_at desc);
create index if not exists professional_financials_client_idx
  on public.professional_case_financials (client_id) where client_id is not null;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  status text not null default 'requested' check (status in (
    'requested', 'in_review', 'fulfilled', 'rejected', 'cancelled'
  )),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  reason text,
  retention_note text,
  resolution_note text,
  check (reason is null or length(reason) <= 1000)
);

create unique index if not exists account_deletion_one_open_per_user_idx
  on public.account_deletion_requests (user_id)
  where status in ('requested', 'in_review');

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  purchase_id uuid,
  document_type text not null check (document_type in (
    'terms', 'privacy_notice', 'contract_terms', 'immediate_performance', 'withdrawal_acknowledgement'
  )),
  document_version text not null check (length(btrim(document_version)) between 1 and 80),
  accepted_at timestamptz not null default now(),
  evidence_source text not null default 'authenticated_form' check (evidence_source in (
    'registration_form', 'authenticated_form', 'checkout_confirmation'
  )),
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, document_type, document_version, purchase_id),
  constraint legal_acceptances_purchase_owner_fk
    foreign key (purchase_id, user_id)
    references public.purchases(id, user_id)
    on delete restrict,
  check (
    (
      purchase_id is null
      and document_type in ('terms', 'privacy_notice')
      and evidence_source in ('registration_form', 'authenticated_form')
    )
    or (
      purchase_id is not null
      and document_type in (
        'contract_terms', 'immediate_performance', 'withdrawal_acknowledgement'
      )
      and evidence_source = 'checkout_confirmation'
    )
  )
);

create table if not exists public.registration_authorizations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  token_sha256 text not null unique check (token_sha256 ~ '^[0-9a-f]{64}$'),
  display_name text not null check (length(btrim(display_name)) between 2 and 120),
  terms_version text not null check (terms_version = '2026-08-v1'),
  privacy_version text not null check (privacy_version = '2026-08-v1'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists registration_authorizations_expiry_idx
  on public.registration_authorizations (expires_at);

create index if not exists legal_acceptances_user_date_idx
  on public.legal_acceptances (user_id, accepted_at desc);

comment on table public.payment_events is
  'Minimal Stripe test event ledger. Raw payloads are not retained; only SHA-256 and transition state.';
comment on table public.legal_acceptances is
  'Append-only document-version acceptance. IP and user agent are intentionally not collected.';
comment on table public.account_deletion_requests is
  'Requests are reviewed before deletion so contractual and tax retention duties can be applied.';

-- ---------------------------------------------------------------------------
-- Calendar and access helpers. All calendar arithmetic is anchored in UTC.
-- Paid licences are active on [starts_at, expires_at).
-- ---------------------------------------------------------------------------

create or replace function public.access_duration_months(p_duration text)
returns integer
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case p_duration
    when 'one_month' then 1
    when 'six_months' then 6
    when 'twelve_months' then 12
    else null
  end;
$$;

create or replace function public.calculate_license_expiry(
  p_starts_at timestamptz,
  p_duration text
)
returns timestamptz
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_months integer := public.access_duration_months(p_duration);
begin
  if p_starts_at is null or v_months is null then
    raise exception 'Invalid licence start or duration' using errcode = '22023';
  end if;
  return (
    (p_starts_at at time zone 'UTC') + make_interval(months => v_months)
  ) at time zone 'UTC';
end;
$$;

create or replace function public.enforce_license_calendar()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.tier = 'free' then return new; end if;
  if new.status <> 'pending_payment' and (
    new.starts_at is null
    or new.expires_at is distinct from public.calculate_license_expiry(new.starts_at, new.duration)
  ) then
    raise exception 'Licence expiry must be derived from its original start and duration'
      using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_license_calendar() from public, anon, authenticated;
drop trigger if exists user_licenses_enforce_calendar on public.user_licenses;
create trigger user_licenses_enforce_calendar
  before insert or update of tier, duration, status, starts_at, expires_at
  on public.user_licenses
  for each row execute function public.enforce_license_calendar();

create or replace function public.has_active_access(p_required_tier text default 'particular')
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with latest_paid as (
    select license.*
    from public.user_licenses license
    where license.user_id = auth.uid()
      and license.tier in ('particular', 'professional')
    order by license.starts_at desc nulls last,
             license.created_at desc,
             license.updated_at desc,
             license.id desc
    limit 1
  )
  select case p_required_tier
    when 'particular' then exists (
      select 1 from latest_paid license
      where license.status = 'active'
        and license.tier in ('particular', 'professional')
        and license.starts_at <= now()
        and license.expires_at > now()
    )
    when 'professional' then exists (
      select 1 from latest_paid license
      where license.status = 'active'
        and license.tier = 'professional'
        and license.starts_at <= now()
        and license.expires_at > now()
    )
    when 'free' then exists (
      select 1 from public.user_licenses license
      where license.user_id = auth.uid()
        and license.tier = 'free'
        and license.status = 'free'
    )
    else false
  end;
$$;

create or replace function public.can_manage_real_cases()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_active_access('particular');
$$;

create or replace function public.can_view_real_cases()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select license.status = 'expired'
      or (
        license.status = 'active'
        and license.starts_at <= now()
      )
    from public.user_licenses license
    where license.user_id = auth.uid()
      and license.tier in ('particular', 'professional')
    order by license.starts_at desc nulls last,
             license.created_at desc,
             license.updated_at desc,
             license.id desc
    limit 1
  ), false);
$$;

create or replace function public.can_view_professional_history()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select license.tier = 'professional'
      and (
        license.status = 'expired'
        or (
          license.status = 'active'
          and license.starts_at <= now()
        )
      )
    from public.user_licenses license
    where license.user_id = auth.uid()
      and license.tier in ('particular', 'professional')
    order by license.starts_at desc nulls last,
             license.created_at desc,
             license.updated_at desc,
             license.id desc
    limit 1
  ), false);
$$;

create or replace function public.get_my_access_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_license public.user_licenses%rowtype;
  v_mode text := 'free';
  v_tier text := 'free';
  v_license_json jsonb := null;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select license.* into v_license
  from public.user_licenses license
  where license.user_id = v_user_id
    and license.tier in ('particular', 'professional')
  order by license.starts_at desc nulls last,
           license.created_at desc,
           license.updated_at desc,
           license.id desc
  limit 1;

  if v_license.id is not null
     and v_license.status = 'active'
     and v_license.starts_at <= now()
     and v_license.expires_at > now() then
    v_mode := 'full';
    v_tier := v_license.tier;
  elsif v_license.id is not null
     and (
       v_license.status = 'expired'
       or (
         v_license.status = 'active'
         and v_license.starts_at <= now()
         and v_license.expires_at <= now()
       )
     ) then
    v_mode := 'read_only';
    v_tier := v_license.tier;
  end if;

  if v_license.id is not null and v_mode <> 'free' then
    v_license_json := jsonb_build_object(
      'id', v_license.id,
      'userId', v_license.user_id,
      'tier', v_license.tier,
      'duration', v_license.duration,
      'status', v_license.status,
      'startsAt', v_license.starts_at,
      'expiresAt', v_license.expires_at,
      'originalPurchaseId', v_license.original_purchase_id,
      'upgradedFromLicenseId', v_license.upgraded_from_license_id,
      'createdAt', v_license.created_at,
      'updatedAt', v_license.updated_at
    );
  end if;

  return jsonb_build_object(
    'userId', v_user_id,
    'tier', v_tier,
    'mode', v_mode,
    'license', v_license_json,
    'expiredAt', case when v_mode = 'read_only' then v_license.expires_at else null end,
    'canUseFreeChecker', true,
    'canViewPaidCases', v_mode in ('full', 'read_only'),
    'canManageFullCases', v_mode = 'full',
    'canUseProfessional', v_mode = 'full' and v_tier = 'professional'
  );
end;
$$;

-- Paid case history is visible only while a paid licence is active or after a
-- genuine calendar expiry. A refund or revocation removes that retained view.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'registration_cases',
    'vehicles',
    'case_parties',
    'case_documents',
    'case_tasks',
    'case_checklist_items',
    'case_tax_calculations',
    'case_costs',
    'case_appointments',
    'case_incidents',
    'case_notes'
  ] loop
    execute format('drop policy if exists %I on public.%I', v_table || '_select_own', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id and public.can_view_real_cases())',
      v_table || '_select_own',
      v_table
    );
  end loop;
end;
$$;

drop policy if exists case_decision_runs_select_own on public.case_decision_runs;
create policy case_decision_runs_select_own
  on public.case_decision_runs for select to authenticated
  using ((select auth.uid()) = user_id and public.can_view_real_cases());
drop policy if exists case_activity_log_select_own on public.case_activity_log;
create policy case_activity_log_select_own
  on public.case_activity_log for select to authenticated
  using ((select auth.uid()) = user_id and public.can_view_real_cases());

revoke all on function public.access_duration_months(text) from public, anon, authenticated;
revoke all on function public.calculate_license_expiry(timestamptz, text) from public, anon, authenticated;
revoke all on function public.has_active_access(text) from public, anon;
revoke all on function public.can_manage_real_cases() from public, anon;
revoke all on function public.can_view_real_cases() from public, anon;
revoke all on function public.can_view_professional_history() from public, anon;
revoke all on function public.get_my_access_context() from public, anon;
grant execute on function public.has_active_access(text) to authenticated;
grant execute on function public.can_manage_real_cases() to authenticated;
grant execute on function public.can_view_real_cases() to authenticated;
grant execute on function public.can_view_professional_history() to authenticated;
grant execute on function public.get_my_access_context() to authenticated;

-- ---------------------------------------------------------------------------
-- New users always receive free access. No app/user metadata can grant a tier.
-- ---------------------------------------------------------------------------

create or replace function public.assign_free_license(
  p_user_id uuid,
  p_reason_code text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_license_id uuid;
begin
  insert into public.user_licenses (user_id, tier, duration, status)
  values (p_user_id, 'free', null, 'free')
  on conflict (user_id) where tier = 'free' do nothing
  returning id into v_license_id;

  if v_license_id is null then
    select license.id into v_license_id
    from public.user_licenses license
    where license.user_id = p_user_id and license.tier = 'free';
  elsif v_license_id is not null then
    insert into public.license_events (
      user_id, license_id, event_type, previous_status, new_status, reason_code
    ) values (
      p_user_id, v_license_id, 'free_assigned', null, 'free', p_reason_code
    );
  end if;
  return v_license_id;
end;
$$;
revoke all on function public.assign_free_license(uuid, text)
  from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(btrim(new.email));
  v_registration_token text := new.raw_user_meta_data ->> 'registration_token';
  v_authorization public.registration_authorizations%rowtype;
begin
  if v_email is null or v_email = '' then
    raise exception 'MatriculaPro requires an email address';
  end if;
  if v_registration_token is null
     or length(v_registration_token) not between 32 and 128 then
    raise exception 'A trusted registration authorization is required'
      using errcode = '22023';
  end if;

  select ra.* into v_authorization
  from public.registration_authorizations as ra
  where ra.email = v_email
    and ra.token_sha256 = encode(
      extensions.digest(v_registration_token, 'sha256'),
      'hex'
    )
    and ra.expires_at > now()
  for update;

  if v_authorization.id is null then
    raise exception 'Registration authorization is invalid or expired'
      using errcode = '22023';
  end if;

  delete from public.registration_authorizations
  where id = v_authorization.id;

  insert into public.profiles (id, email, display_name, access_level)
  values (new.id, v_email, btrim(v_authorization.display_name), 'free')
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      access_level = 'free';

  insert into public.legal_acceptances (
    user_id, document_type, document_version, accepted_at, evidence_source
  ) values
    (new.id, 'terms', v_authorization.terms_version, now(), 'registration_form'),
    (new.id, 'privacy_notice', v_authorization.privacy_version, now(), 'registration_form')
  on conflict (user_id, document_type, document_version, purchase_id) do nothing;

  if new.email_confirmed_at is not null then
    perform public.assign_free_license(new.id, 'email_confirmed_account');
  end if;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.handle_auth_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.assign_free_license(new.id, 'email_confirmation');
  end if;
  return new;
end;
$$;
revoke all on function public.handle_auth_user_email_confirmed()
  from public, anon, authenticated;
drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_auth_user_email_confirmed();

drop function if exists public.activate_founder_by_email(text);
drop function if exists public.next_founder_number();
drop function if exists public.founder_purchase_is_eligible(uuid);
drop sequence if exists public.founder_number_seq;
revoke all on table public.pending_founder_purchases from service_role;
revoke all on table public.stripe_webhook_events from service_role;
comment on table public.pending_founder_purchases is
  'Retired historical ledger. It cannot grant access and no application role has privileges.';
comment on table public.stripe_webhook_events is
  'Retired historical Founder webhook ledger. Replaced by payment_events.';

drop function if exists public.update_my_profile(text, text, text);
create or replace function public.update_my_profile(p_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(coalesce(p_display_name, '')) > 120 then
    raise exception 'Profile value is too long' using errcode = '22001';
  end if;
  update public.profiles
  set display_name = nullif(btrim(p_display_name), ''), access_level = 'free'
  where id = auth.uid()
  returning * into v_profile;
  if v_profile.id is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;
revoke all on function public.update_my_profile(text) from public, anon;
grant execute on function public.update_my_profile(text) to authenticated;

-- Backfill without upgrading any historical account.
update public.profiles set access_level = 'free'
where access_level is distinct from 'free';
insert into public.user_licenses (user_id, tier, duration, status)
select user_record.id, 'free', null, 'free'
from auth.users user_record
where user_record.email_confirmed_at is not null
on conflict (user_id) where tier = 'free' do nothing;

insert into public.license_events (
  user_id, license_id, event_type, previous_status, new_status, reason_code
)
select license.user_id, license.id, 'free_assigned', null, 'free', 'launch_backfill'
from public.user_licenses license
where license.tier = 'free'
  and not exists (
    select 1 from public.license_events event
    where event.license_id = license.id and event.event_type = 'free_assigned'
  );

-- ---------------------------------------------------------------------------
-- Timestamp and immutability triggers
-- ---------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'user_licenses', 'purchases', 'upgrade_eligibility', 'free_vehicle_checks',
    'professional_profiles', 'professional_clients',
    'professional_case_financials', 'account_deletion_requests'
  ] loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_set_updated_at', v_table);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      v_table || '_set_updated_at', v_table
    );
  end loop;
end;
$$;

create or replace function public.reject_immutable_row_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;
revoke all on function public.reject_immutable_row_change() from public, anon, authenticated;

drop trigger if exists license_events_immutable on public.license_events;
create trigger license_events_immutable
  before update or delete on public.license_events
  for each row execute function public.reject_immutable_row_change();
drop trigger if exists legal_acceptances_immutable on public.legal_acceptances;
create trigger legal_acceptances_immutable
  before update or delete on public.legal_acceptances
  for each row execute function public.reject_immutable_row_change();

-- ---------------------------------------------------------------------------
-- Controlled user RPCs for append-only legal/deletion records
-- ---------------------------------------------------------------------------

create or replace function public.record_legal_acceptance(
  p_document_type text,
  p_document_version text
)
returns public.legal_acceptances
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_record public.legal_acceptances%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Checkout-specific declarations are recorded only by the trusted backend.
  -- Letting the authenticated role pre-create those unique keys would replace
  -- the required checkout evidence with a generic form acceptance.
  if p_document_type not in ('terms', 'privacy_notice') then
    raise exception 'Invalid legal document type' using errcode = '22023';
  end if;
  if btrim(coalesce(p_document_version, '')) <> '2026-08-v1' then
    raise exception 'Invalid legal document version' using errcode = '22023';
  end if;

  insert into public.legal_acceptances (
    user_id, document_type, document_version, accepted_at, evidence_source
  ) values (
    auth.uid(), p_document_type, btrim(p_document_version), now(), 'authenticated_form'
  )
  on conflict (user_id, document_type, document_version, purchase_id) do nothing
  returning * into v_record;
  if v_record.id is null then
    select acceptance.* into v_record
    from public.legal_acceptances acceptance
    where acceptance.user_id = auth.uid()
      and acceptance.document_type = p_document_type
      and acceptance.document_version = btrim(p_document_version);
  end if;
  return v_record;
end;
$$;

create or replace function public.request_account_deletion(p_reason text default null)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_record public.account_deletion_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(coalesce(p_reason, '')) > 1000 then
    raise exception 'Deletion reason is too long' using errcode = '22001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('account-deletion:' || auth.uid()::text, 0));

  select request.* into v_record
  from public.account_deletion_requests request
  where request.user_id = auth.uid()
    and request.status in ('requested', 'in_review')
  order by request.requested_at desc
  limit 1;
  if v_record.id is not null then return v_record; end if;

  insert into public.account_deletion_requests (
    user_id, status, requested_at, reason
  ) values (
    auth.uid(), 'requested', now(), nullif(btrim(p_reason), '')
  ) returning * into v_record;
  return v_record;
end;
$$;

revoke all on function public.record_legal_acceptance(text, text) from public, anon;
revoke all on function public.request_account_deletion(text) from public, anon;
grant execute on function public.record_legal_acceptance(text, text) to authenticated;
grant execute on function public.request_account_deletion(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: server-managed entitlements/payments; owner-only product records.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_licenses enable row level security;
alter table public.license_events enable row level security;
alter table public.purchases enable row level security;
alter table public.payment_events enable row level security;
alter table public.upgrade_eligibility enable row level security;
alter table public.free_vehicle_checks enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.professional_clients enable row level security;
alter table public.professional_case_financials enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.registration_authorizations enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists user_licenses_select_own on public.user_licenses;
create policy user_licenses_select_own on public.user_licenses
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists license_events_select_own on public.license_events;
create policy license_events_select_own on public.license_events
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists purchases_select_own on public.purchases;
create policy purchases_select_own on public.purchases
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists upgrade_eligibility_select_own on public.upgrade_eligibility;
create policy upgrade_eligibility_select_own on public.upgrade_eligibility
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists free_vehicle_checks_select_own on public.free_vehicle_checks;
drop policy if exists free_vehicle_checks_insert_own on public.free_vehicle_checks;
drop policy if exists free_vehicle_checks_update_own on public.free_vehicle_checks;
drop policy if exists free_vehicle_checks_delete_own on public.free_vehicle_checks;
create policy free_vehicle_checks_select_own on public.free_vehicle_checks
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists professional_profiles_select_own on public.professional_profiles;
drop policy if exists professional_profiles_insert_active on public.professional_profiles;
drop policy if exists professional_profiles_update_active on public.professional_profiles;
create policy professional_profiles_select_own on public.professional_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id and public.can_view_professional_history());

drop policy if exists professional_clients_select_own on public.professional_clients;
drop policy if exists professional_clients_insert_active on public.professional_clients;
drop policy if exists professional_clients_update_active on public.professional_clients;
drop policy if exists professional_clients_delete_active on public.professional_clients;
create policy professional_clients_select_own on public.professional_clients
  for select to authenticated
  using ((select auth.uid()) = user_id and public.can_view_professional_history());

drop policy if exists professional_financials_select_own on public.professional_case_financials;
drop policy if exists professional_financials_insert_active on public.professional_case_financials;
drop policy if exists professional_financials_update_active on public.professional_case_financials;
drop policy if exists professional_financials_delete_active on public.professional_case_financials;
create policy professional_financials_select_own on public.professional_case_financials
  for select to authenticated
  using ((select auth.uid()) = user_id and public.can_view_professional_history());

drop policy if exists deletion_requests_select_own on public.account_deletion_requests;
create policy deletion_requests_select_own on public.account_deletion_requests
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists legal_acceptances_select_own on public.legal_acceptances;
create policy legal_acceptances_select_own on public.legal_acceptances
  for select to authenticated using ((select auth.uid()) = user_id);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'user_licenses', 'license_events', 'purchases', 'payment_events',
    'upgrade_eligibility', 'free_vehicle_checks', 'professional_profiles',
    'professional_clients', 'professional_case_financials',
    'account_deletion_requests', 'legal_acceptances', 'registration_authorizations'
  ] loop
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', v_table);
  end loop;
end;
$$;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
revoke all on table public.profiles from service_role;
grant select, insert, update on table public.profiles to service_role;

grant select on table public.user_licenses to authenticated;
grant select on table public.license_events to authenticated;
grant select on table public.purchases to authenticated;
grant select on table public.upgrade_eligibility to authenticated;
grant select on table public.free_vehicle_checks to authenticated;
grant select on table public.professional_profiles to authenticated;
grant select on table public.professional_clients to authenticated;
grant select on table public.professional_case_financials to authenticated;
grant select on table public.account_deletion_requests to authenticated;
grant select on table public.legal_acceptances to authenticated;

grant select on table public.user_licenses to service_role;
grant select on table public.license_events to service_role;
grant select on table public.purchases to service_role;
grant select, insert, update on table public.payment_events to service_role;
grant select on table public.upgrade_eligibility to service_role;
grant select, insert, update, delete on table public.free_vehicle_checks to service_role;
grant select, insert, update, delete on table public.professional_profiles to service_role;
grant select, insert, update, delete on table public.professional_clients to service_role;
grant select, insert, update, delete on table public.professional_case_financials to service_role;
grant select, insert, update on table public.account_deletion_requests to service_role;
grant select, insert on table public.legal_acceptances to service_role;
grant select, insert, delete on table public.registration_authorizations to service_role;

-- ---------------------------------------------------------------------------
-- Service-role-only purchase reservation. The browser never supplies or
-- persists an amount; the server resolves the catalog price before this call.
-- ---------------------------------------------------------------------------

create or replace function public.reserve_access_purchase(
  p_user_id uuid,
  p_idempotency_key text,
  p_tier text,
  p_duration text,
  p_base_cents bigint,
  p_vat_cents bigint,
  p_total_cents bigint,
  p_currency text,
  p_vat_rate_basis_points integer,
  p_tax_country text,
  p_price_source text,
  p_price_effective_at timestamptz,
  p_stripe_price_id text,
  p_upgrade_credit_cents bigint,
  p_amount_due_cents bigint,
  p_source_license_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_source public.user_licenses%rowtype;
  v_initial public.purchases%rowtype;
  v_eligibility public.upgrade_eligibility%rowtype;
  v_expected_credit bigint;
begin
  if not exists (select 1 from auth.users user_record where user_record.id = p_user_id) then
    raise exception 'Unknown purchase user' using errcode = '23503';
  end if;
  if p_tier not in ('particular', 'professional')
     or p_duration not in ('one_month', 'six_months', 'twelve_months')
     or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
     or p_stripe_price_id !~ '^price_[A-Za-z0-9]+$'
     or upper(p_currency) <> 'EUR'
     or upper(p_tax_country) <> 'ES'
     or p_base_cents < 0
     or p_vat_cents < 0
     or p_base_cents + p_vat_cents <> p_total_cents
     or p_total_cents <= 0
     or p_upgrade_credit_cents < 0
     or p_upgrade_credit_cents > p_total_cents
     or p_amount_due_cents <> p_total_cents - p_upgrade_credit_cents
     or p_vat_rate_basis_points < 0
     or p_price_effective_at is null
     or length(btrim(coalesce(p_price_source, ''))) = 0 then
    raise exception 'Invalid authoritative purchase terms' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_idempotency_key, 0));
  select purchase.* into v_purchase
  from public.purchases purchase
  where purchase.user_id = p_user_id
    and purchase.idempotency_key = p_idempotency_key
  for update;
  if v_purchase.id is not null then
    if v_purchase.tier <> p_tier
       or v_purchase.duration <> p_duration
       or v_purchase.base_cents <> p_base_cents
       or v_purchase.vat_cents <> p_vat_cents
       or v_purchase.total_cents <> p_total_cents
       or v_purchase.amount_due_cents <> p_amount_due_cents
       or v_purchase.upgrade_credit_cents <> p_upgrade_credit_cents
       or v_purchase.stripe_price_id <> p_stripe_price_id
       or v_purchase.source_license_id is distinct from p_source_license_id then
      raise exception 'Idempotency key was already used with different terms' using errcode = '22023';
    end if;
    return to_jsonb(v_purchase);
  end if;

  if p_source_license_id is null then
    if p_upgrade_credit_cents <> 0 or p_amount_due_cents <> p_total_cents then
      raise exception 'A normal purchase cannot apply upgrade credit' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.user_licenses license
      where license.user_id = p_user_id
        and license.tier in ('particular', 'professional')
        and license.status = 'active'
        and license.starts_at <= now()
        and license.expires_at > now()
    ) then
      raise exception 'An active licence must use the reviewed upgrade flow' using errcode = '55000';
    end if;
  else
    if p_duration = 'one_month' then
      raise exception 'Upgrade target must be six or twelve months' using errcode = '22023';
    end if;
    select license.* into v_source
    from public.user_licenses license
    where license.id = p_source_license_id
      and license.user_id = p_user_id
    for update;
    if v_source.id is null
       or v_source.tier <> p_tier
       or v_source.duration <> 'one_month'
       or v_source.status <> 'active'
       or v_source.starts_at is null
       or v_source.expires_at <= now()
       or now() > v_source.starts_at + interval '15 days'
       or v_source.original_purchase_id is null then
      raise exception 'Source licence is not eligible for promotional upgrade' using errcode = '55000';
    end if;

    select purchase.* into v_initial
    from public.purchases purchase
    where purchase.id = v_source.original_purchase_id
      and purchase.user_id = p_user_id
    for update;
    select eligibility.* into v_eligibility
    from public.upgrade_eligibility eligibility
    where eligibility.source_license_id = v_source.id
    for update;

    if v_initial.id is null or v_initial.status <> 'paid'
       or v_eligibility.id is null or v_eligibility.status <> 'eligible'
       or now() > v_eligibility.eligible_until then
      raise exception 'Promotional upgrade is no longer available' using errcode = '55000';
    end if;
    v_expected_credit := least(v_initial.amount_due_cents, p_total_cents);
    if p_upgrade_credit_cents <> v_expected_credit
       or p_amount_due_cents <> p_total_cents - v_expected_credit then
      raise exception 'Upgrade amount does not match the server credit' using errcode = '22023';
    end if;
  end if;

  insert into public.purchases (
    user_id, tier, duration, status, provider, livemode, idempotency_key,
    base_cents, vat_cents, total_cents, upgrade_credit_cents, amount_due_cents,
    currency, vat_rate_basis_points, tax_country, tax_included,
    price_source, price_effective_at, stripe_price_id, source_license_id
  ) values (
    p_user_id, p_tier, p_duration, 'pending', 'stripe', false, p_idempotency_key,
    p_base_cents, p_vat_cents, p_total_cents, p_upgrade_credit_cents, p_amount_due_cents,
    upper(p_currency), p_vat_rate_basis_points, upper(p_tax_country), true,
    btrim(p_price_source), p_price_effective_at, p_stripe_price_id, p_source_license_id
  ) returning * into v_purchase;

  if v_eligibility.id is not null then
    update public.upgrade_eligibility
    set status = 'reserved', reserved_purchase_id = v_purchase.id
    where id = v_eligibility.id;
  end if;
  return to_jsonb(v_purchase);
end;
$$;

create or replace function public.bind_access_checkout_session(
  p_purchase_id uuid,
  p_checkout_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  if p_checkout_session_id !~ '^cs_test_[A-Za-z0-9_]+' then
    raise exception 'Only a Stripe test Checkout Session is accepted' using errcode = '22023';
  end if;
  select purchase.* into v_purchase
  from public.purchases purchase
  where purchase.id = p_purchase_id
  for update;
  if v_purchase.id is null or v_purchase.status <> 'pending' then
    raise exception 'Pending purchase not found' using errcode = 'P0002';
  end if;
  if v_purchase.stripe_checkout_session_id is not null
     and v_purchase.stripe_checkout_session_id <> p_checkout_session_id then
    raise exception 'Purchase is already bound to another Checkout Session' using errcode = '23505';
  end if;
  if (
    select count(distinct acceptance.document_type)
    from public.legal_acceptances acceptance
    where acceptance.purchase_id = v_purchase.id
      and acceptance.user_id = v_purchase.user_id
      and acceptance.document_version = '2026-08-v1'
      and acceptance.evidence_source = 'checkout_confirmation'
      and acceptance.document_type in (
        'contract_terms', 'immediate_performance', 'withdrawal_acknowledgement'
      )
  ) <> 3 then
    raise exception 'Purchase is missing required checkout legal evidence'
      using errcode = '23514';
  end if;
  update public.purchases
  set stripe_checkout_session_id = p_checkout_session_id
  where id = p_purchase_id
  returning * into v_purchase;
  return to_jsonb(v_purchase);
end;
$$;

create or replace function public.cancel_access_purchase(
  p_purchase_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_source_id uuid;
begin
  update public.purchases
  set status = 'failed', failure_reason = left(coalesce(p_reason, 'checkout_failed'), 300)
  where id = p_purchase_id and status = 'pending'
  returning source_license_id into v_source_id;
  if not found then return false; end if;
  if v_source_id is not null then
    update public.upgrade_eligibility
    set status = case when eligible_until >= now() then 'eligible' else 'expired' end,
        reserved_purchase_id = null
    where source_license_id = v_source_id
      and status = 'reserved'
      and reserved_purchase_id = p_purchase_id;
  end if;
  return true;
end;
$$;

create or replace function public.record_ignored_access_payment_event(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_sha256 text,
  p_reason text,
  p_purchase_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.payment_events%rowtype;
  v_purchase_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_provider_event_id, 0));
  select event.* into v_existing
  from public.payment_events event
  where event.provider_event_id = p_provider_event_id
  for update;
  if v_existing.id is not null
     and v_existing.processing_status in ('processed', 'ignored') then
    return jsonb_build_object(
      'ok', true, 'duplicate', true, 'processed', false,
      'reason', v_existing.reason_code, 'purchase_id', v_existing.purchase_id,
      'license_id', null
    );
  end if;

  select purchase.id into v_purchase_id
  from public.purchases purchase
  where purchase.id = p_purchase_id;

  if v_existing.id is null then
    insert into public.payment_events (
      provider_event_id, event_type, livemode, purchase_id, payload_sha256,
      processing_status, reason_code, event_created_at, processed_at
    ) values (
      p_provider_event_id, p_event_type, false, v_purchase_id, p_payload_sha256,
      'ignored', left(p_reason, 200), p_event_created_at, now()
    );
  else
    update public.payment_events
    set purchase_id = coalesce(v_purchase_id, purchase_id),
        processing_status = 'ignored',
        reason_code = left(p_reason, 200),
        processed_at = now(),
        last_error = null
    where id = v_existing.id;
  end if;
  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'processed', false,
    'reason', left(p_reason, 200), 'purchase_id', v_purchase_id,
    'license_id', null
  );
end;
$$;

create or replace function public.process_verified_access_payment(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_sha256 text,
  p_purchase_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_price_id text,
  p_amount_total_cents bigint,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.payment_events%rowtype;
  v_purchase public.purchases%rowtype;
  v_source public.user_licenses%rowtype;
  v_initial public.purchases%rowtype;
  v_eligibility public.upgrade_eligibility%rowtype;
  v_existing_active public.user_licenses%rowtype;
  v_license public.user_licenses%rowtype;
  v_reason text;
  v_activation_at timestamptz := greatest(p_event_created_at, now());
  v_is_renewal boolean := false;
begin
  if p_event_type not in (
    'checkout.session.completed', 'checkout.session.async_payment_succeeded'
  ) then
    raise exception 'Unsupported activation event type' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_provider_event_id, 0));
  select event.* into v_event
  from public.payment_events event
  where event.provider_event_id = p_provider_event_id
  for update;
  if v_event.id is not null and v_event.processing_status in ('processed', 'ignored') then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'processed', v_event.processing_status = 'processed',
      'reason', v_event.reason_code,
      'purchase_id', v_event.purchase_id,
      'license_id', null
    );
  end if;
  if v_event.id is null then
    insert into public.payment_events (
      provider_event_id, event_type, livemode, purchase_id, payload_sha256,
      processing_status, event_created_at
    ) values (
      p_provider_event_id, p_event_type, false, null, p_payload_sha256,
      'processing', p_event_created_at
    ) returning * into v_event;
  else
    update public.payment_events
    set attempts = attempts + case when processing_status = 'failed' then 1 else 0 end,
        processing_status = 'processing',
        processed_at = null,
        reason_code = null,
        last_error = null
    where id = v_event.id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_purchase_id::text, 0));
  select purchase.* into v_purchase
  from public.purchases purchase
  where purchase.id = p_purchase_id
  for update;

  if v_purchase.id is not null then
    update public.payment_events
    set purchase_id = v_purchase.id
    where id = v_event.id;

    if (
      select count(distinct acceptance.document_type)
      from public.legal_acceptances acceptance
      where acceptance.purchase_id = v_purchase.id
        and acceptance.user_id = v_purchase.user_id
        and acceptance.document_version = '2026-08-v1'
        and acceptance.evidence_source = 'checkout_confirmation'
        and acceptance.document_type in (
          'contract_terms', 'immediate_performance', 'withdrawal_acknowledgement'
        )
    ) <> 3 then
      raise exception 'Purchase is missing required checkout legal evidence'
        using errcode = '23514';
    end if;
  end if;

  if v_purchase.id is null then
    v_reason := 'purchase_not_found';
  elsif v_purchase.livemode then
    v_reason := 'live_purchase_not_allowed';
  elsif v_purchase.stripe_checkout_session_id is distinct from p_checkout_session_id then
    v_reason := 'checkout_session_mismatch';
  elsif v_purchase.stripe_price_id is distinct from p_price_id then
    v_reason := 'price_mismatch';
  elsif v_purchase.amount_due_cents is distinct from p_amount_total_cents then
    v_reason := 'amount_mismatch';
  elsif v_purchase.currency is distinct from upper(p_currency) then
    v_reason := 'currency_mismatch';
  elsif p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+' then
    v_reason := 'invalid_payment_intent';
  elsif v_purchase.status = 'paid' then
    if v_purchase.stripe_payment_intent_id is distinct from p_payment_intent_id then
      v_reason := 'payment_intent_mismatch';
    else
      update public.payment_events
      set processing_status = 'processed', processed_at = now(),
          reason_code = 'purchase_already_paid'
      where id = v_event.id;
      return jsonb_build_object(
        'ok', true, 'duplicate', true, 'processed', true,
        'reason', 'purchase_already_paid', 'purchase_id', v_purchase.id,
        'license_id', v_purchase.resulting_license_id
      );
    end if;
  elsif v_purchase.status <> 'pending' then
    v_reason := 'purchase_not_pending_' || v_purchase.status;
  end if;

  if v_reason is not null then
    update public.payment_events
    set processing_status = 'ignored', processed_at = now(), reason_code = v_reason
    where id = v_event.id;
    return jsonb_build_object(
      'ok', false, 'duplicate', false, 'processed', false,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null
    );
  end if;

  if v_purchase.source_license_id is not null then
    select license.* into v_source
    from public.user_licenses license
    where license.id = v_purchase.source_license_id
      and license.user_id = v_purchase.user_id
    for update;
    select eligibility.* into v_eligibility
    from public.upgrade_eligibility eligibility
    where eligibility.source_license_id = v_purchase.source_license_id
    for update;
    if v_source.original_purchase_id is not null then
      select purchase.* into v_initial
      from public.purchases purchase
      where purchase.id = v_source.original_purchase_id
      for update;
    end if;

    -- reserve_access_purchase made the exact inclusive day-15 decision under
    -- row locks. A later verified payment for that reserved Checkout remains
    -- valid; otherwise a user could be charged moments after the boundary and
    -- receive no access. checkout.session.expired releases the reservation.
    if v_source.id is null
       or v_source.tier <> v_purchase.tier
       or v_source.duration <> 'one_month'
       or v_source.status <> 'active'
       or v_source.starts_at is null
       or v_initial.status <> 'paid'
       or v_eligibility.status <> 'reserved'
       or v_eligibility.reserved_purchase_id <> v_purchase.id
       or v_purchase.upgrade_credit_cents <> least(v_initial.amount_due_cents, v_purchase.total_cents)
       or v_purchase.duration = 'one_month' then
      v_reason := 'upgrade_eligibility_invalid_at_payment';
    end if;

    if v_reason is null then
      update public.user_licenses
      set status = 'revoked', metadata = metadata || jsonb_build_object(
        'revocationReason', 'promotional_upgrade', 'replacementPurchaseId', v_purchase.id
      )
      where id = v_source.id;

      insert into public.user_licenses (
        user_id, tier, duration, status, starts_at, expires_at,
        original_purchase_id, upgraded_from_license_id
      ) values (
        v_purchase.user_id, v_purchase.tier, v_purchase.duration, 'active',
        v_source.starts_at,
        public.calculate_license_expiry(v_source.starts_at, v_purchase.duration),
        v_purchase.id, v_source.id
      ) returning * into v_license;

      update public.upgrade_eligibility
      set status = 'consumed', consumed_purchase_id = v_purchase.id,
          consumed_at = p_event_created_at
      where id = v_eligibility.id;

      insert into public.license_events (
        user_id, license_id, purchase_id, event_type, previous_status,
        new_status, occurred_at, provider_event_id, reason_code
      ) values
        (
          v_source.user_id, v_source.id, v_purchase.id, 'revoked', 'active',
          'revoked', p_event_created_at, p_provider_event_id, 'promotional_upgrade'
        ),
        (
          v_purchase.user_id, v_license.id, v_purchase.id, 'upgraded', null,
          'active', p_event_created_at, p_provider_event_id, 'fifteen_day_full_credit'
        );
    end if;
  else
    -- Expiration is enforced by timestamp even before a maintenance job updates
    -- the material status. Mark stale rows here so renewal remains possible.
    for v_existing_active in
      select license.*
      from public.user_licenses license
      where license.user_id = v_purchase.user_id
        and license.status = 'active'
        and license.tier in ('particular', 'professional')
      for update
    loop
      if v_existing_active.expires_at <= now() then
        update public.user_licenses set status = 'expired'
        where id = v_existing_active.id;
        insert into public.license_events (
          user_id, license_id, event_type, previous_status, new_status,
          occurred_at, reason_code
        ) values (
          v_existing_active.user_id, v_existing_active.id, 'expired', 'active',
          'expired', v_existing_active.expires_at, 'calendar_expiry'
        );
      else
        v_reason := 'another_paid_license_is_active';
      end if;
    end loop;

    if v_reason is null then
      select exists (
        select 1
        from public.user_licenses prior_license
        where prior_license.user_id = v_purchase.user_id
          and prior_license.tier in ('particular', 'professional')
          and prior_license.status = 'expired'
      ) into v_is_renewal;

      insert into public.user_licenses (
        user_id, tier, duration, status, starts_at, expires_at, original_purchase_id
      ) values (
        v_purchase.user_id, v_purchase.tier, v_purchase.duration, 'active',
        v_activation_at,
        public.calculate_license_expiry(v_activation_at, v_purchase.duration),
        v_purchase.id
      ) returning * into v_license;

      insert into public.license_events (
        user_id, license_id, purchase_id, event_type, previous_status,
        new_status, occurred_at, provider_event_id, reason_code
      ) values (
        v_purchase.user_id, v_license.id, v_purchase.id,
        case when v_is_renewal then 'renewed' else 'activated' end,
        null, 'active', v_activation_at, p_provider_event_id,
        case when v_is_renewal then 'manual_renewal' else 'verified_stripe_test_payment' end
      );

      if v_purchase.duration = 'one_month' then
        insert into public.upgrade_eligibility (
          user_id, source_license_id, source_purchase_id, tier,
          eligible_from, eligible_until, max_credit_cents, currency, status
        ) values (
          v_purchase.user_id, v_license.id, v_purchase.id, v_purchase.tier,
          v_activation_at, v_activation_at + interval '15 days',
          least(v_purchase.amount_due_cents, v_purchase.total_cents),
          v_purchase.currency, 'eligible'
        );
      end if;
    end if;
  end if;

  if v_reason is not null then
    update public.payment_events
    set processing_status = 'ignored', processed_at = now(), reason_code = v_reason
    where id = v_event.id;
    return jsonb_build_object(
      'ok', false, 'duplicate', false, 'processed', false,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null
    );
  end if;

  update public.purchases
  set status = 'paid', stripe_payment_intent_id = p_payment_intent_id,
      resulting_license_id = v_license.id, paid_at = p_event_created_at,
      failure_reason = null
  where id = v_purchase.id;
  update public.payment_events
  set processing_status = 'processed', processed_at = now(), reason_code = null
  where id = v_event.id;

  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'processed', true,
    'reason', null, 'purchase_id', v_purchase.id, 'license_id', v_license.id
  );
end;
$$;

create or replace function public.process_access_checkout_expired(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_sha256 text,
  p_purchase_id uuid,
  p_checkout_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.payment_events%rowtype;
  v_purchase public.purchases%rowtype;
begin
  if p_event_type <> 'checkout.session.expired' then
    raise exception 'Unsupported checkout expiration event type' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_provider_event_id, 0));
  select event.* into v_event
  from public.payment_events event
  where event.provider_event_id = p_provider_event_id
  for update;
  if v_event.id is not null
     and v_event.processing_status in ('processed', 'ignored') then
    return jsonb_build_object(
      'ok', true, 'duplicate', true,
      'processed', v_event.processing_status = 'processed',
      'reason', v_event.reason_code, 'purchase_id', v_event.purchase_id,
      'license_id', null
    );
  end if;

  if v_event.id is not null then
    update public.payment_events
    set attempts = attempts + case when processing_status = 'failed' then 1 else 0 end,
        processing_status = 'processing',
        processed_at = null,
        reason_code = null,
        last_error = null
    where id = v_event.id;
  end if;

  select purchase.* into v_purchase
  from public.purchases purchase
  where purchase.id = p_purchase_id
  for update;
  if v_purchase.id is not null and v_event.id is not null then
    update public.payment_events
    set purchase_id = v_purchase.id
    where id = v_event.id;
  end if;
  if v_purchase.id is null
     or v_purchase.stripe_checkout_session_id is distinct from p_checkout_session_id then
    insert into public.payment_events (
      provider_event_id, event_type, livemode, purchase_id, payload_sha256,
      processing_status, reason_code, event_created_at, processed_at
    ) values (
      p_provider_event_id, p_event_type, false, v_purchase.id, p_payload_sha256,
      'ignored', 'checkout_session_mismatch', p_event_created_at, now()
    )
    on conflict (provider_event_id) do update
    set purchase_id = excluded.purchase_id,
        processing_status = excluded.processing_status,
        reason_code = excluded.reason_code,
        processed_at = excluded.processed_at,
        last_error = null;
    return jsonb_build_object(
      'ok', false, 'duplicate', false, 'processed', false,
      'reason', 'checkout_session_mismatch', 'purchase_id', p_purchase_id,
      'license_id', null
    );
  end if;

  if v_purchase.status = 'pending' then
    update public.purchases
    set status = 'cancelled', failure_reason = 'checkout_session_expired'
    where id = v_purchase.id;
    if v_purchase.source_license_id is not null then
      update public.upgrade_eligibility
      set status = case when eligible_until >= now() then 'eligible' else 'expired' end,
          reserved_purchase_id = null
      where source_license_id = v_purchase.source_license_id
        and status = 'reserved'
        and reserved_purchase_id = v_purchase.id;
    end if;
  end if;

  insert into public.payment_events (
    provider_event_id, event_type, livemode, purchase_id, payload_sha256,
    processing_status, reason_code, event_created_at, processed_at
  ) values (
    p_provider_event_id, p_event_type, false, v_purchase.id, p_payload_sha256,
    'processed', case when v_purchase.status = 'pending' then null else 'purchase_not_pending' end,
    p_event_created_at, now()
  )
  on conflict (provider_event_id) do update
  set purchase_id = excluded.purchase_id,
      processing_status = excluded.processing_status,
      reason_code = excluded.reason_code,
      processed_at = excluded.processed_at,
      last_error = null;
  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'processed', true,
    'reason', case when v_purchase.status = 'pending' then null else 'purchase_not_pending' end,
    'purchase_id', v_purchase.id, 'license_id', v_purchase.resulting_license_id
  );
end;
$$;

create or replace function public.mark_access_payment_event_failed(
  p_provider_event_id text,
  p_last_error text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempts integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_provider_event_id, 0));
  update public.payment_events
  set attempts = attempts + case when processing_status = 'failed' then 1 else 0 end,
      processing_status = 'failed',
      processed_at = null,
      last_error = left(coalesce(nullif(btrim(p_last_error), ''), 'processing_failed'), 500)
  where provider_event_id = p_provider_event_id
    and processing_status in ('processing', 'failed')
  returning attempts into v_attempts;
  if v_attempts is null then
    raise exception 'Processable payment event receipt not found' using errcode = 'P0002';
  end if;
  return v_attempts;
end;
$$;

-- Every payment mutation is callable only by the trusted backend role.
revoke all on function public.reserve_access_purchase(
  uuid, text, text, text, bigint, bigint, bigint, text, integer, text,
  text, timestamptz, text, bigint, bigint, uuid
) from public, anon, authenticated;
revoke all on function public.bind_access_checkout_session(uuid, text)
  from public, anon, authenticated;
revoke all on function public.cancel_access_purchase(uuid, text)
  from public, anon, authenticated;
revoke all on function public.record_ignored_access_payment_event(
  text, text, timestamptz, text, text, uuid
) from public, anon, authenticated;
revoke all on function public.process_verified_access_payment(
  text, text, timestamptz, text, uuid, text, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function public.process_verified_access_reversal(
  text, text, timestamptz, text, uuid, text, text, bigint
) from public, anon, authenticated;
revoke all on function public.process_access_checkout_expired(
  text, text, timestamptz, text, uuid, text
) from public, anon, authenticated;
revoke all on function public.expire_due_user_licenses(timestamptz)
  from public, anon, authenticated;
revoke all on function public.mark_access_payment_event_failed(text, text)
  from public, anon, authenticated;

grant execute on function public.reserve_access_purchase(
  uuid, text, text, text, bigint, bigint, bigint, text, integer, text,
  text, timestamptz, text, bigint, bigint, uuid
) to service_role;
grant execute on function public.bind_access_checkout_session(uuid, text) to service_role;
grant execute on function public.cancel_access_purchase(uuid, text) to service_role;
grant execute on function public.record_ignored_access_payment_event(
  text, text, timestamptz, text, text, uuid
) to service_role;
grant execute on function public.process_verified_access_payment(
  text, text, timestamptz, text, uuid, text, text, text, bigint, text
) to service_role;
grant execute on function public.process_verified_access_reversal(
  text, text, timestamptz, text, uuid, text, text, bigint
) to service_role;
grant execute on function public.process_access_checkout_expired(
  text, text, timestamptz, text, uuid, text
) to service_role;
grant execute on function public.expire_due_user_licenses(timestamptz) to service_role;
grant execute on function public.mark_access_payment_event_failed(text, text) to service_role;

comment on function public.process_verified_access_payment(
  text, text, timestamptz, text, uuid, text, text, text, bigint, text
) is 'Atomic Stripe test payment activation. Server-side verified values only; idempotent by provider event.';
