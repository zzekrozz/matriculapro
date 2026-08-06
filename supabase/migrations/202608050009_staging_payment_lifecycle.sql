-- MatriculaPro staging payment lifecycle hardening
-- Additive migration; migrations 001-008 remain immutable.
-- Reviewed: 2026-08-05

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Explicit scheduled/suspended periods and impossible-overlap prevention.
-- ---------------------------------------------------------------------------

alter table public.user_licenses drop constraint if exists user_licenses_status_check;
alter table public.user_licenses add constraint user_licenses_status_check
  check (status in (
    'free', 'pending_payment', 'scheduled', 'active', 'suspended',
    'expired', 'revoked', 'refunded'
  ));

alter table public.license_events drop constraint if exists license_events_event_type_check;
alter table public.license_events add constraint license_events_event_type_check
  check (event_type in (
    'free_assigned', 'activated', 'scheduled', 'upgraded', 'expired', 'renewed',
    'suspended', 'restored', 'revoked', 'refunded', 'disputed'
  ));

alter table public.user_licenses
  add constraint user_licenses_no_paid_period_overlap
  exclude using gist (
    user_id with =,
    tstzrange(starts_at, expires_at, '[)') with &&
  )
  where (tier <> 'free' and status in ('active', 'scheduled'))
  deferrable initially immediate;

create index user_licenses_future_period_idx
  on public.user_licenses (user_id, starts_at, expires_at)
  where status = 'scheduled';

-- ---------------------------------------------------------------------------
-- Refund/dispute ledger fields and purchase intent.
-- ---------------------------------------------------------------------------

alter table public.purchases
  add column purchase_kind text not null default 'new',
  add column renewal_of_license_id uuid references public.user_licenses(id) on delete restrict,
  add column gross_amount_cents bigint generated always as (amount_due_cents) stored,
  add column amount_paid_cents bigint not null default 0,
  add column amount_refunded_cents bigint not null default 0,
  add column refundable_remaining_cents bigint generated always as (
    greatest(amount_paid_cents - amount_refunded_cents, 0)
  ) stored,
  add column refund_status text not null default 'not_refunded',
  add column last_refund_at timestamptz,
  add column last_refund_event_created_at timestamptz,
  add column dispute_status text not null default 'none',
  add column stripe_dispute_id text,
  add column last_dispute_event_created_at timestamptz,
  add column fiscal_country text;

update public.purchases
set purchase_kind = case when source_license_id is null then 'new' else 'upgrade' end,
    amount_paid_cents = case when status in ('paid', 'refunded', 'disputed') then amount_due_cents else 0 end,
    amount_refunded_cents = case when status = 'refunded' then amount_due_cents else 0 end,
    refund_status = case when status = 'refunded' then 'fully_refunded' else 'not_refunded' end,
    fiscal_country = tax_country;

alter table public.purchases
  add constraint purchases_purchase_kind_check
    check (purchase_kind in ('new', 'upgrade', 'renewal')),
  add constraint purchases_refund_status_check
    check (refund_status in ('not_refunded', 'partially_refunded', 'fully_refunded')),
  add constraint purchases_dispute_status_check
    check (dispute_status in ('none', 'warning', 'open', 'won', 'lost')),
  add constraint purchases_refund_amounts_check
    check (
      amount_paid_cents >= 0
      and amount_refunded_cents >= 0
      and amount_refunded_cents <= amount_paid_cents
    ),
  add constraint purchases_kind_links_check
    check (
      -- reserve_access_purchase from migration 006 inserts upgrades with the
      -- column default before this migration's wrapper labels the row. The
      -- transaction immediately changes it to upgrade under the user lock.
      (purchase_kind = 'new' and renewal_of_license_id is null)
      or (purchase_kind = 'upgrade' and source_license_id is not null and renewal_of_license_id is null)
      or (purchase_kind = 'renewal' and source_license_id is null and renewal_of_license_id is not null)
    );

create or replace function public.enforce_purchase_kind_links_at_commit()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_valid boolean;
begin
  select (
    (p.purchase_kind = 'new' and p.source_license_id is null and p.renewal_of_license_id is null)
    or (p.purchase_kind = 'upgrade' and p.source_license_id is not null and p.renewal_of_license_id is null)
    or (p.purchase_kind = 'renewal' and p.source_license_id is null and p.renewal_of_license_id is not null)
  ) into v_valid
  from public.purchases p
  where p.id = new.id;
  if not coalesce(v_valid, false) then
    raise exception 'Purchase kind links are inconsistent' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function public.enforce_purchase_kind_links_at_commit()
  from public, anon, authenticated;
create constraint trigger purchases_kind_links_at_commit
  after insert or update of purchase_kind, source_license_id, renewal_of_license_id
  on public.purchases deferrable initially deferred
  for each row execute function public.enforce_purchase_kind_links_at_commit();

create unique index purchases_one_open_renewal_per_source_idx
  on public.purchases (renewal_of_license_id)
  where renewal_of_license_id is not null and status = 'pending';

-- ---------------------------------------------------------------------------
-- One persistent Stripe Customer per user. Browser writes are never granted.
-- ---------------------------------------------------------------------------

create table public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete restrict,
  stripe_customer_id text not null unique check (stripe_customer_id ~ '^cus_[A-Za-z0-9_]+$'),
  email_at_creation text not null check (position('@' in email_at_creation) > 1),
  email_current text not null check (position('@' in email_current) > 1),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

alter table public.billing_customers enable row level security;
create policy billing_customers_select_own on public.billing_customers
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.billing_customers from public, anon, authenticated, service_role;
grant select on table public.billing_customers to authenticated;
grant select, insert, update on table public.billing_customers to service_role;

create trigger billing_customers_set_updated_at
  before update on public.billing_customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Paid-without-access incidents and immutable administrative audit.
-- ---------------------------------------------------------------------------

create table public.payment_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete restrict,
  purchase_id uuid references public.purchases(id) on delete restrict,
  stripe_event_id text not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  kind text not null check (kind in (
    'paid_without_license', 'amount_mismatch', 'currency_mismatch',
    'country_mismatch', 'customer_mismatch', 'unknown_price',
    'overlapping_license', 'webhook_processing_failure',
    'refund_inconsistency', 'partial_refund_review', 'dispute_review'
  )),
  status text not null default 'open' check (status in (
    'open', 'retrying', 'resolved', 'refunded', 'ignored_with_reason'
  )),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  retry_count integer not null default 0 check (retry_count >= 0),
  resolution_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (stripe_event_id, kind)
);

create table public.payment_incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.payment_incidents(id) on delete restrict,
  action text not null check (action in (
    'created', 'retry_started', 'retry_succeeded', 'retry_failed',
    'resolved', 'refunded', 'ignored_with_reason', 'alerted'
  )),
  reason text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  occurred_at timestamptz not null default now()
);

alter table public.payment_incidents enable row level security;
alter table public.payment_incident_events enable row level security;
revoke all on table public.payment_incidents from public, anon, authenticated, service_role;
revoke all on table public.payment_incident_events from public, anon, authenticated, service_role;
grant select, insert, update on table public.payment_incidents to service_role;
grant select, insert on table public.payment_incident_events to service_role;

create trigger payment_incidents_set_updated_at
  before update on public.payment_incidents
  for each row execute function public.set_updated_at();
create trigger payment_incident_events_immutable
  before update or delete on public.payment_incident_events
  for each row execute function public.reject_immutable_row_change();

create or replace function public.claim_billing_customer(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_email text,
  p_country text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_customer public.billing_customers%rowtype;
begin
  if p_stripe_customer_id !~ '^cus_[A-Za-z0-9_]+$'
     or position('@' in btrim(lower(p_email))) <= 1
     or (p_country is not null and upper(p_country) <> 'ES') then
    raise exception 'Invalid billing customer' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('billing-customer:' || p_user_id::text, 0));
  select customer.* into v_customer
  from public.billing_customers customer
  where customer.user_id = p_user_id
  for update;
  if v_customer.user_id is null then
    insert into public.billing_customers (
      user_id, stripe_customer_id, email_at_creation, email_current, country
    ) values (
      p_user_id, p_stripe_customer_id, lower(btrim(p_email)), lower(btrim(p_email)),
      case when p_country is null then null else upper(p_country) end
    ) returning * into v_customer;
  else
    update public.billing_customers
    set stripe_customer_id = p_stripe_customer_id,
        email_current = lower(btrim(p_email)),
        country = coalesce(case when p_country is null then null else upper(p_country) end, country)
    where user_id = p_user_id
    returning * into v_customer;
  end if;
  return to_jsonb(v_customer);
end;
$$;

create or replace function public.record_payment_incident(
  p_stripe_event_id text,
  p_kind text,
  p_details jsonb,
  p_user_id uuid default null,
  p_purchase_id uuid default null,
  p_checkout_session_id text default null,
  p_payment_intent_id text default null,
  p_customer_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_incident public.payment_incidents%rowtype;
begin
  if length(btrim(coalesce(p_stripe_event_id, ''))) = 0
     or jsonb_typeof(coalesce(p_details, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid payment incident' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('incident:' || p_stripe_event_id || ':' || p_kind, 0));
  insert into public.payment_incidents (
    user_id, purchase_id, stripe_event_id, stripe_checkout_session_id,
    stripe_payment_intent_id, stripe_customer_id, kind, details
  ) values (
    p_user_id, p_purchase_id, p_stripe_event_id, p_checkout_session_id,
    p_payment_intent_id, p_customer_id, p_kind, coalesce(p_details, '{}'::jsonb)
  )
  on conflict (stripe_event_id, kind) do update
  set details = public.payment_incidents.details || excluded.details
  returning * into v_incident;
  if not exists (
    select 1 from public.payment_incident_events e
    where e.incident_id = v_incident.id and e.action = 'created'
  ) then
    insert into public.payment_incident_events (incident_id, action, reason)
    values (v_incident.id, 'created', p_kind);
  end if;
  return to_jsonb(v_incident);
end;
$$;

revoke all on function public.claim_billing_customer(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.record_payment_incident(text, text, jsonb, uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_billing_customer(uuid, text, text, text) to service_role;
grant execute on function public.record_payment_incident(text, text, jsonb, uuid, uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Reservation wrapper. Upgrade keeps the reviewed 15-day RPC; renewal uses a
-- separate row-locked path and can only schedule the same tier at full price.
-- ---------------------------------------------------------------------------

create or replace function public.reserve_staging_access_purchase(
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
  p_purchase_kind text,
  p_stripe_customer_id text,
  p_source_license_id uuid default null,
  p_renewal_of_license_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_source public.user_licenses%rowtype;
begin
  if p_purchase_kind not in ('new', 'upgrade', 'renewal')
     or p_stripe_customer_id !~ '^cus_[A-Za-z0-9_]+$'
     or not exists (
       select 1 from public.billing_customers customer
       where customer.user_id = p_user_id
         and customer.stripe_customer_id = p_stripe_customer_id
     ) then
    raise exception 'Invalid staging purchase identity' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('purchase-user:' || p_user_id::text, 0));
  select purchase.* into v_purchase
  from public.purchases purchase
  where purchase.user_id = p_user_id
    and purchase.idempotency_key = p_idempotency_key
  for update;
  if v_purchase.id is not null then
    if v_purchase.purchase_kind <> p_purchase_kind
       or v_purchase.tier <> p_tier
       or v_purchase.duration <> p_duration
       or v_purchase.stripe_price_id <> p_stripe_price_id
       or v_purchase.amount_due_cents <> p_amount_due_cents
       or v_purchase.stripe_customer_id is distinct from p_stripe_customer_id
       or v_purchase.source_license_id is distinct from p_source_license_id
       or v_purchase.renewal_of_license_id is distinct from p_renewal_of_license_id then
      raise exception 'Idempotency key was already used with different terms' using errcode = '22023';
    end if;
    return to_jsonb(v_purchase);
  end if;

  -- A second browser tab may legitimately generate another client key before
  -- the first tab receives its Session. Reuse the single equivalent pending
  -- purchase; different terms remain a conflict.
  select purchase.* into v_purchase
  from public.purchases purchase
  where purchase.user_id = p_user_id and purchase.status = 'pending'
  order by purchase.created_at desc limit 1 for update;
  if v_purchase.id is not null then
    if v_purchase.purchase_kind = p_purchase_kind
       and v_purchase.tier = p_tier
       and v_purchase.duration = p_duration
       and v_purchase.stripe_price_id = p_stripe_price_id
       and v_purchase.amount_due_cents = p_amount_due_cents
       and v_purchase.stripe_customer_id = p_stripe_customer_id
       and v_purchase.source_license_id is not distinct from p_source_license_id
       and v_purchase.renewal_of_license_id is not distinct from p_renewal_of_license_id then
      return to_jsonb(v_purchase);
    end if;
    raise exception 'Another Checkout with different terms is already pending' using errcode = '23505';
  end if;

  if p_purchase_kind in ('new', 'upgrade') then
    if (p_purchase_kind = 'new' and (p_source_license_id is not null or p_renewal_of_license_id is not null))
       or (p_purchase_kind = 'upgrade' and (p_source_license_id is null or p_renewal_of_license_id is not null)) then
      raise exception 'Invalid purchase links' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.user_licenses future
      where future.user_id = p_user_id
        and future.status = 'scheduled'
        and future.starts_at > now()
        and future.expires_at > now()
    ) then
      raise exception 'A future renewal already exists' using errcode = '23505';
    end if;
    v_purchase := jsonb_populate_record(
      null::public.purchases,
      public.reserve_access_purchase(
        p_user_id, p_idempotency_key, p_tier, p_duration,
        p_base_cents, p_vat_cents, p_total_cents, p_currency,
        p_vat_rate_basis_points, p_tax_country, p_price_source,
        p_price_effective_at, p_stripe_price_id, p_upgrade_credit_cents,
        p_amount_due_cents, p_source_license_id
      )
    );
    update public.purchases
    set purchase_kind = p_purchase_kind,
        stripe_customer_id = p_stripe_customer_id,
        fiscal_country = upper(p_tax_country)
    where id = v_purchase.id
    returning * into v_purchase;
    return to_jsonb(v_purchase);
  end if;

  if p_source_license_id is not null
     or p_renewal_of_license_id is null
     or p_upgrade_credit_cents <> 0
     or p_amount_due_cents <> p_total_cents
     or upper(p_currency) <> 'EUR'
     or upper(p_tax_country) <> 'ES'
     or p_tier not in ('particular', 'professional')
     or p_duration not in ('one_month', 'six_months', 'twelve_months')
     or p_base_cents + p_vat_cents <> p_total_cents
     or p_total_cents <= 0
     or p_stripe_price_id !~ '^price_[A-Za-z0-9]+$'
     or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid renewal terms' using errcode = '22023';
  end if;

  select license.* into v_source
  from public.user_licenses license
  where license.id = p_renewal_of_license_id
    and license.user_id = p_user_id
  for update;
  if v_source.id is null
     or v_source.tier <> p_tier
     or v_source.status not in ('active', 'expired')
     or v_source.expires_at is null then
    raise exception 'Licence cannot be renewed' using errcode = '55000';
  end if;
  if v_source.status = 'active'
     and v_source.expires_at > now()
     and now() < v_source.expires_at - interval '30 days' then
    raise exception 'Renewal window is not open' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.user_licenses future
    where future.user_id = p_user_id
      and future.status = 'scheduled'
      and future.expires_at > now()
  ) then
    raise exception 'A future renewal already exists' using errcode = '23505';
  end if;

  insert into public.purchases (
    user_id, tier, duration, status, provider, livemode, idempotency_key,
    base_cents, vat_cents, total_cents, upgrade_credit_cents, amount_due_cents,
    currency, vat_rate_basis_points, tax_country, tax_included,
    price_source, price_effective_at, stripe_price_id, stripe_customer_id,
    purchase_kind, renewal_of_license_id, fiscal_country
  ) values (
    p_user_id, p_tier, p_duration, 'pending', 'stripe', false, p_idempotency_key,
    p_base_cents, p_vat_cents, p_total_cents, 0, p_total_cents,
    'EUR', p_vat_rate_basis_points, 'ES', true,
    btrim(p_price_source), p_price_effective_at, p_stripe_price_id, p_stripe_customer_id,
    'renewal', p_renewal_of_license_id, 'ES'
  ) returning * into v_purchase;
  return to_jsonb(v_purchase);
end;
$$;

revoke all on function public.reserve_staging_access_purchase(
  uuid, text, text, text, bigint, bigint, bigint, text, integer, text,
  text, timestamptz, text, bigint, bigint, text, text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.reserve_staging_access_purchase(
  uuid, text, text, text, bigint, bigint, bigint, text, integer, text,
  text, timestamptz, text, bigint, bigint, text, text, uuid, uuid
) to service_role;

-- ---------------------------------------------------------------------------
-- Access is resolved from time ranges, not a daily cron or the latest row.
-- A started refunded/revoked/suspended period retains read-only history.
-- ---------------------------------------------------------------------------

create or replace function public.has_active_access(p_required_tier text default 'particular')
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case p_required_tier
    when 'free' then exists (
      select 1 from public.user_licenses l
      where l.user_id = auth.uid() and l.tier = 'free' and l.status = 'free'
    )
    when 'particular' then exists (
      select 1 from public.user_licenses l
      where l.user_id = auth.uid()
        and l.tier in ('particular', 'professional')
        and l.status in ('active', 'scheduled')
        and l.starts_at <= now() and l.expires_at > now()
    )
    when 'professional' then exists (
      select 1 from public.user_licenses l
      where l.user_id = auth.uid()
        and l.tier = 'professional'
        and l.status in ('active', 'scheduled')
        and l.starts_at <= now() and l.expires_at > now()
    )
    else false
  end;
$$;

create or replace function public.can_view_real_cases()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.user_licenses l
    where l.user_id = auth.uid()
      and l.tier in ('particular', 'professional')
      and l.starts_at <= now()
      and (
        (l.status in ('active', 'scheduled') and l.expires_at is not null)
        or l.status in ('expired', 'suspended', 'refunded', 'revoked')
      )
  );
$$;

create or replace function public.can_view_professional_history()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.user_licenses l
    where l.user_id = auth.uid()
      and l.tier = 'professional'
      and l.starts_at <= now()
      and (
        (l.status in ('active', 'scheduled') and l.expires_at is not null)
        or l.status in ('expired', 'suspended', 'refunded', 'revoked')
      )
  );
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
  v_current public.user_licenses%rowtype;
  v_history public.user_licenses%rowtype;
  v_scheduled public.user_licenses%rowtype;
  v_effective public.user_licenses%rowtype;
  v_mode text := 'free';
  v_tier text := 'free';
  v_license_json jsonb := null;
  v_scheduled_json jsonb := null;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select l.* into v_current from public.user_licenses l
  where l.user_id = v_user_id and l.tier <> 'free'
    and l.status in ('active', 'scheduled')
    and l.starts_at <= now() and l.expires_at > now()
  order by l.starts_at desc, l.created_at desc limit 1;
  select l.* into v_scheduled from public.user_licenses l
  where l.user_id = v_user_id and l.tier <> 'free'
    and l.status = 'scheduled' and l.starts_at > now()
  order by l.starts_at asc limit 1;
  select l.* into v_history from public.user_licenses l
  where l.user_id = v_user_id and l.tier <> 'free' and l.starts_at <= now()
    and (
      l.status in ('expired', 'suspended', 'refunded', 'revoked')
      or (l.status in ('active', 'scheduled') and l.expires_at <= now())
    )
  order by l.starts_at desc, l.created_at desc limit 1;

  if v_current.id is not null then
    v_effective := v_current; v_mode := 'full'; v_tier := v_current.tier;
  elsif v_history.id is not null then
    v_effective := v_history; v_mode := 'read_only'; v_tier := v_history.tier;
  end if;
  if v_effective.id is not null then
    v_license_json := jsonb_build_object(
      'id', v_effective.id, 'userId', v_effective.user_id,
      'tier', v_effective.tier, 'duration', v_effective.duration,
      'status', v_effective.status, 'startsAt', v_effective.starts_at,
      'expiresAt', v_effective.expires_at,
      'originalPurchaseId', v_effective.original_purchase_id,
      'upgradedFromLicenseId', v_effective.upgraded_from_license_id,
      'createdAt', v_effective.created_at, 'updatedAt', v_effective.updated_at
    );
  end if;
  if v_scheduled.id is not null then
    v_scheduled_json := jsonb_build_object(
      'id', v_scheduled.id, 'userId', v_scheduled.user_id,
      'tier', v_scheduled.tier, 'duration', v_scheduled.duration,
      'status', v_scheduled.status, 'startsAt', v_scheduled.starts_at,
      'expiresAt', v_scheduled.expires_at,
      'originalPurchaseId', v_scheduled.original_purchase_id,
      'upgradedFromLicenseId', v_scheduled.upgraded_from_license_id,
      'createdAt', v_scheduled.created_at, 'updatedAt', v_scheduled.updated_at
    );
  end if;
  return jsonb_build_object(
    'userId', v_user_id, 'tier', v_tier, 'mode', v_mode,
    'license', v_license_json, 'scheduledLicense', v_scheduled_json,
    'expiredAt', case when v_mode = 'read_only' then v_effective.expires_at else null end,
    'canUseFreeChecker', true,
    'canViewHistoricalPaidData', v_mode in ('full', 'read_only'),
    'canCreateFullCases', v_mode = 'full',
    'canEditFullCases', v_mode = 'full',
    'canRunFiscalCalculations', v_mode = 'full',
    'canUseAdvancedSimulators', v_mode = 'full',
    'canGenerateReports', v_mode = 'full',
    'canExport', v_mode = 'full',
    'canUseProfessionalTools', v_mode = 'full' and v_tier = 'professional'
  );
end;
$$;

revoke all on function public.has_active_access(text) from public, anon;
revoke all on function public.can_view_real_cases() from public, anon;
revoke all on function public.can_view_professional_history() from public, anon;
revoke all on function public.get_my_access_context() from public, anon;
grant execute on function public.has_active_access(text) to authenticated;
grant execute on function public.can_view_real_cases() to authenticated;
grant execute on function public.can_view_professional_history() to authenticated;
grant execute on function public.get_my_access_context() to authenticated;

-- ---------------------------------------------------------------------------
-- Verified payment activation with Customer/country enforcement and renewal.
-- ---------------------------------------------------------------------------

create or replace function public.process_verified_staging_payment(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_sha256 text,
  p_purchase_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_customer_id text,
  p_price_id text,
  p_amount_total_cents bigint,
  p_currency text,
  p_country text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_purchase public.purchases%rowtype;
  v_source public.user_licenses%rowtype;
  v_license public.user_licenses%rowtype;
  v_event public.payment_events%rowtype;
  v_result jsonb;
  v_reason text;
  v_kind text;
  v_starts_at timestamptz;
  v_status text;
begin
  -- Keep the same lock order as reservation (user, then purchase) so a
  -- Checkout webhook cannot deadlock with a second tab reserving access.
  select p.user_id into v_user_id
  from public.purchases p
  where p.id = p_purchase_id;
  if v_user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('purchase-user:' || v_user_id::text, 0));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p
  where p.id = p_purchase_id for update;
  if v_purchase.id is null then
    update public.payment_events
    set processing_status = 'ignored', processed_at = now(), reason_code = 'purchase_not_found'
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id, 'paid_without_license',
      jsonb_build_object('reason', 'purchase_not_found'),
      null, null, p_checkout_session_id, p_payment_intent_id, p_customer_id
    );
    return jsonb_build_object(
      'ok', false, 'duplicate', false, 'processed', false,
      'reason', 'purchase_not_found', 'purchase_id', null, 'license_id', null
    );
  end if;
  if v_purchase.stripe_checkout_session_id is distinct from p_checkout_session_id then
    v_reason := 'checkout_session_mismatch'; v_kind := 'paid_without_license';
  elsif v_purchase.stripe_customer_id is distinct from p_customer_id then
    v_reason := 'customer_mismatch'; v_kind := 'customer_mismatch';
  elsif upper(coalesce(p_country, '')) <> 'ES' then
    v_reason := 'country_mismatch'; v_kind := 'country_mismatch';
  elsif v_purchase.stripe_price_id is distinct from p_price_id then
    v_reason := 'price_mismatch'; v_kind := 'unknown_price';
  elsif v_purchase.amount_due_cents is distinct from p_amount_total_cents then
    v_reason := 'amount_mismatch'; v_kind := 'amount_mismatch';
  elsif v_purchase.currency is distinct from upper(p_currency) then
    v_reason := 'currency_mismatch'; v_kind := 'currency_mismatch';
  elsif p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$' then
    v_reason := 'invalid_payment_intent'; v_kind := 'paid_without_license';
  end if;
  if v_reason is not null then
    update public.payment_events
    set purchase_id = v_purchase.id, processing_status = 'ignored',
        processed_at = now(), reason_code = v_reason
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id, v_kind,
      jsonb_build_object(
        'reason', v_reason, 'expectedAmountCents', v_purchase.amount_due_cents,
        'receivedAmountCents', p_amount_total_cents,
        'expectedCurrency', v_purchase.currency,
        'receivedCurrency', upper(coalesce(p_currency, '')),
        'receivedCountry', upper(coalesce(p_country, ''))
      ),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    return jsonb_build_object(
      'ok', false, 'duplicate', false, 'processed', false,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null
    );
  end if;

  update public.billing_customers set country = 'ES'
  where user_id = v_purchase.user_id and stripe_customer_id = p_customer_id;

  if v_purchase.purchase_kind <> 'renewal' then
    v_result := public.process_verified_access_payment(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_price_id,
      p_amount_total_cents, p_currency
    );
    if coalesce((v_result->>'processed')::boolean, false) then
      update public.purchases
      set stripe_customer_id = p_customer_id, fiscal_country = 'ES',
          amount_paid_cents = p_amount_total_cents
      where id = p_purchase_id;
    elsif not coalesce((v_result->>'duplicate')::boolean, false) then
      v_reason := coalesce(v_result->>'reason', 'paid_without_license');
      perform public.record_payment_incident(
        p_provider_event_id,
        case when v_reason = 'another_paid_license_is_active'
          then 'overlapping_license' else 'paid_without_license' end,
        jsonb_build_object('reason', v_reason),
        v_purchase.user_id, v_purchase.id, p_checkout_session_id,
        p_payment_intent_id, p_customer_id
      );
    end if;
    return v_result;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_provider_event_id, 0));
  select e.* into v_event from public.payment_events e
  where e.provider_event_id = p_provider_event_id for update;
  if v_purchase.status = 'paid' then
    return jsonb_build_object(
      'ok', true, 'duplicate', true, 'processed', true,
      'reason', 'purchase_already_paid', 'purchase_id', v_purchase.id,
      'license_id', v_purchase.resulting_license_id
    );
  end if;
  if v_purchase.status <> 'pending' then
    v_reason := 'purchase_not_pending_' || v_purchase.status;
  end if;
  select l.* into v_source from public.user_licenses l
  where l.id = v_purchase.renewal_of_license_id
    and l.user_id = v_purchase.user_id for update;
  if v_reason is null and (
    v_source.id is null or v_source.tier <> v_purchase.tier
    or v_source.status not in ('active', 'expired') or v_source.expires_at is null
  ) then v_reason := 'renewal_source_invalid'; end if;
  if v_reason is null then
    v_starts_at := case
      when v_source.status = 'active' and v_source.expires_at > now() then v_source.expires_at
      else greatest(p_event_created_at, now())
    end;
    if exists (
      select 1 from public.user_licenses l
      where l.user_id = v_purchase.user_id
        and l.status in ('active', 'scheduled')
        and l.id <> v_source.id
        and tstzrange(l.starts_at, l.expires_at, '[)') &&
            tstzrange(v_starts_at, public.calculate_license_expiry(v_starts_at, v_purchase.duration), '[)')
    ) then v_reason := 'overlapping_license'; end if;
  end if;
  if v_reason is not null then
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'ignored', processed_at = now(), reason_code = v_reason
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id,
      case when v_reason = 'overlapping_license' then 'overlapping_license' else 'paid_without_license' end,
      jsonb_build_object('reason', v_reason),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    return jsonb_build_object(
      'ok', false, 'duplicate', false, 'processed', false,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null
    );
  end if;

  v_status := case when v_starts_at > now() then 'scheduled' else 'active' end;
  insert into public.user_licenses (
    user_id, tier, duration, status, starts_at, expires_at, original_purchase_id,
    metadata
  ) values (
    v_purchase.user_id, v_purchase.tier, v_purchase.duration, v_status,
    v_starts_at, public.calculate_license_expiry(v_starts_at, v_purchase.duration),
    v_purchase.id, jsonb_build_object('renewalOfLicenseId', v_source.id)
  ) returning * into v_license;
  insert into public.license_events (
    user_id, license_id, purchase_id, event_type, previous_status, new_status,
    occurred_at, provider_event_id, reason_code
  ) values (
    v_purchase.user_id, v_license.id, v_purchase.id,
    case when v_status = 'scheduled' then 'scheduled' else 'renewed' end,
    null, v_status, p_event_created_at, p_provider_event_id,
    case when v_status = 'scheduled' then 'early_renewal' else 'post_expiry_renewal' end
  );
  update public.purchases
  set status = 'paid', stripe_payment_intent_id = p_payment_intent_id,
      stripe_customer_id = p_customer_id, fiscal_country = 'ES',
      amount_paid_cents = p_amount_total_cents,
      resulting_license_id = v_license.id, paid_at = p_event_created_at,
      failure_reason = null
  where id = v_purchase.id;
  update public.payment_events
  set purchase_id = v_purchase.id, processing_status = 'processed',
      processed_at = now(), reason_code = null, last_error = null
  where provider_event_id = p_provider_event_id;
  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'processed', true,
    'reason', null, 'purchase_id', v_purchase.id, 'license_id', v_license.id
  );
end;
$$;

revoke all on function public.process_verified_staging_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.process_verified_staging_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, bigint, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Cumulative refunds. Partial refunds never revoke; only the verified
-- cumulative total reaching the paid amount does.
-- ---------------------------------------------------------------------------

create or replace function public.process_verified_staging_refund(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_sha256 text,
  p_purchase_id uuid,
  p_payment_intent_id text,
  p_amount_refunded_cents bigint,
  p_charge_amount_cents bigint,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_license public.user_licenses%rowtype;
  v_target public.user_licenses%rowtype;
  v_eligibility public.upgrade_eligibility%rowtype;
  v_full boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id for update;
  if v_purchase.id is null then
    update public.payment_events
    set processing_status = 'ignored', processed_at = now(), reason_code = 'purchase_not_found'
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id, 'refund_inconsistency', jsonb_build_object('reason', 'purchase_not_found'),
      null, null, null, p_payment_intent_id, null
    );
    return jsonb_build_object('ok', false, 'duplicate', false, 'processed', false,
      'reason', 'purchase_not_found', 'purchase_id', null, 'license_id', null);
  end if;
  if v_purchase.stripe_payment_intent_id is distinct from p_payment_intent_id
     or upper(p_currency) <> v_purchase.currency
     or p_charge_amount_cents <> v_purchase.amount_paid_cents
     or p_amount_refunded_cents < 0
     or p_amount_refunded_cents > v_purchase.amount_paid_cents then
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'ignored', processed_at = now(), reason_code = 'refund_inconsistency'
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id, 'refund_inconsistency',
      jsonb_build_object(
        'expectedPaidCents', v_purchase.amount_paid_cents,
        'receivedChargeCents', p_charge_amount_cents,
        'receivedRefundedCents', p_amount_refunded_cents,
        'receivedCurrency', upper(coalesce(p_currency, ''))
      ),
      v_purchase.user_id, v_purchase.id, v_purchase.stripe_checkout_session_id,
      p_payment_intent_id, v_purchase.stripe_customer_id
    );
    return jsonb_build_object('ok', false, 'duplicate', false, 'processed', false,
      'reason', 'refund_inconsistency', 'purchase_id', v_purchase.id, 'license_id', null);
  end if;
  if (v_purchase.last_refund_event_created_at is not null
      and p_event_created_at < v_purchase.last_refund_event_created_at)
     or p_amount_refunded_cents <= v_purchase.amount_refunded_cents then
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'processed', processed_at = now(), reason_code = 'stale_or_duplicate_refund'
    where provider_event_id = p_provider_event_id;
    return jsonb_build_object('ok', true, 'duplicate', true, 'processed', true,
      'reason', 'stale_or_duplicate_refund', 'purchase_id', v_purchase.id,
      'license_id', v_purchase.resulting_license_id);
  end if;

  v_full := p_amount_refunded_cents >= v_purchase.amount_paid_cents;
  update public.purchases
  set amount_refunded_cents = p_amount_refunded_cents,
      refund_status = case when v_full then 'fully_refunded' else 'partially_refunded' end,
      status = case when v_full then 'refunded' else 'paid' end,
      last_refund_at = p_event_created_at,
      last_refund_event_created_at = p_event_created_at,
      refunded_at = case when v_full then p_event_created_at else refunded_at end
  where id = v_purchase.id;
  if not v_full then
    perform public.record_payment_incident(
      p_provider_event_id, 'partial_refund_review',
      jsonb_build_object(
        'amountPaidCents', v_purchase.amount_paid_cents,
        'amountRefundedCents', p_amount_refunded_cents,
        'remainingCents', v_purchase.amount_paid_cents - p_amount_refunded_cents
      ),
      v_purchase.user_id, v_purchase.id, v_purchase.stripe_checkout_session_id,
      p_payment_intent_id, v_purchase.stripe_customer_id
    );
  else
    select l.* into v_license from public.user_licenses l
    where l.id = v_purchase.resulting_license_id for update;
    if v_license.id is not null and v_license.status not in ('refunded', 'revoked') then
      update public.user_licenses set status = 'refunded',
        metadata = metadata || jsonb_build_object('refundEventId', p_provider_event_id)
      where id = v_license.id;
      insert into public.license_events (
        user_id, license_id, purchase_id, event_type, previous_status,
        new_status, occurred_at, provider_event_id, reason_code
      ) values (
        v_license.user_id, v_license.id, v_purchase.id, 'refunded',
        v_license.status, 'refunded', p_event_created_at, p_provider_event_id,
        'verified_cumulative_full_refund'
      );
    end if;
    for v_eligibility in select e.* from public.upgrade_eligibility e
      where e.source_purchase_id = v_purchase.id
         or e.reserved_purchase_id = v_purchase.id
         or e.consumed_purchase_id = v_purchase.id
      for update
    loop
      if v_eligibility.source_purchase_id = v_purchase.id
         and v_eligibility.consumed_purchase_id is not null then
        select l.* into v_target from public.user_licenses l
        join public.purchases p on p.resulting_license_id = l.id
        where p.id = v_eligibility.consumed_purchase_id for update of l;
        if v_target.id is not null and v_target.status not in ('refunded', 'revoked') then
          update public.user_licenses set status = 'revoked',
            metadata = metadata || jsonb_build_object('revocationReason', 'source_purchase_fully_refunded')
          where id = v_target.id;
          insert into public.license_events (
            user_id, license_id, purchase_id, event_type, previous_status,
            new_status, occurred_at, provider_event_id, reason_code
          ) values (
            v_target.user_id, v_target.id, v_eligibility.consumed_purchase_id,
            'revoked', v_target.status, 'revoked', p_event_created_at,
            p_provider_event_id, 'source_purchase_fully_refunded'
          );
        end if;
      end if;
      update public.upgrade_eligibility set status = 'invalidated',
        invalidated_at = p_event_created_at, invalidation_reason = 'full_refund',
        reserved_purchase_id = case when status = 'reserved' then null else reserved_purchase_id end
      where id = v_eligibility.id;
    end loop;
  end if;
  update public.payment_events set purchase_id = v_purchase.id,
    processing_status = 'processed', processed_at = now(), reason_code = null
  where provider_event_id = p_provider_event_id;
  return jsonb_build_object('ok', true, 'duplicate', false, 'processed', true,
    'reason', case when v_full then 'fully_refunded' else 'partially_refunded' end,
    'purchase_id', v_purchase.id, 'license_id', v_purchase.resulting_license_id);
end;
$$;

revoke all on function public.process_verified_staging_refund(
  text, text, timestamptz, text, uuid, text, bigint, bigint, text
) from public, anon, authenticated;
grant execute on function public.process_verified_staging_refund(
  text, text, timestamptz, text, uuid, text, bigint, bigint, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Disputes have their own reversible lifecycle. warning does not suspend;
-- open suspends paid writes; won restores the time-compatible state; lost
-- revokes paid writes while retaining historical read access.
-- ---------------------------------------------------------------------------

create or replace function public.process_verified_staging_dispute(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_sha256 text,
  p_purchase_id uuid,
  p_payment_intent_id text,
  p_dispute_id text,
  p_dispute_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_license public.user_licenses%rowtype;
  v_new_license_status text;
begin
  if p_dispute_status not in ('warning', 'open', 'won', 'lost')
     or p_dispute_id !~ '^dp_[A-Za-z0-9_]+$' then
    raise exception 'Invalid verified dispute' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id for update;
  if v_purchase.id is null
     or v_purchase.stripe_payment_intent_id is distinct from p_payment_intent_id then
    update public.payment_events
    set purchase_id = v_purchase.id, processing_status = 'ignored', processed_at = now(),
        reason_code = 'purchase_or_payment_intent_mismatch'
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id, 'dispute_review',
      jsonb_build_object('reason', 'purchase_or_payment_intent_mismatch', 'disputeStatus', p_dispute_status),
      v_purchase.user_id, v_purchase.id, v_purchase.stripe_checkout_session_id,
      p_payment_intent_id, v_purchase.stripe_customer_id
    );
    return jsonb_build_object('ok', false, 'duplicate', false, 'processed', false,
      'reason', 'purchase_or_payment_intent_mismatch', 'purchase_id', v_purchase.id, 'license_id', null);
  end if;
  if v_purchase.last_dispute_event_created_at is not null
     and p_event_created_at < v_purchase.last_dispute_event_created_at then
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'processed', processed_at = now(), reason_code = 'stale_dispute_event'
    where provider_event_id = p_provider_event_id;
    return jsonb_build_object('ok', true, 'duplicate', true, 'processed', true,
      'reason', 'stale_dispute_event', 'purchase_id', v_purchase.id,
      'license_id', v_purchase.resulting_license_id);
  end if;
  select l.* into v_license from public.user_licenses l
  where l.id = v_purchase.resulting_license_id for update;

  if p_dispute_status = 'open' and v_license.id is not null
     and v_license.status in ('active', 'scheduled') then
    update public.user_licenses set status = 'suspended',
      metadata = metadata || jsonb_build_object('disputeId', p_dispute_id)
    where id = v_license.id;
    insert into public.license_events (
      user_id, license_id, purchase_id, event_type, previous_status,
      new_status, occurred_at, provider_event_id, reason_code
    ) values (
      v_license.user_id, v_license.id, v_purchase.id, 'suspended',
      v_license.status, 'suspended', p_event_created_at, p_provider_event_id,
      'stripe_dispute_open'
    );
  elsif p_dispute_status = 'won' and v_license.id is not null
     and v_license.status = 'suspended' then
    v_new_license_status := case
      when v_license.expires_at <= now() then 'expired'
      when v_license.starts_at > now() then 'scheduled'
      else 'active'
    end;
    update public.user_licenses set status = v_new_license_status,
      metadata = metadata || jsonb_build_object('disputeWonAt', p_event_created_at)
    where id = v_license.id;
    insert into public.license_events (
      user_id, license_id, purchase_id, event_type, previous_status,
      new_status, occurred_at, provider_event_id, reason_code
    ) values (
      v_license.user_id, v_license.id, v_purchase.id, 'restored',
      'suspended', v_new_license_status, p_event_created_at, p_provider_event_id,
      'stripe_dispute_won'
    );
  elsif p_dispute_status = 'lost' and v_license.id is not null
     and v_license.status not in ('refunded', 'revoked') then
    update public.user_licenses set status = 'revoked',
      metadata = metadata || jsonb_build_object('disputeLostAt', p_event_created_at)
    where id = v_license.id;
    insert into public.license_events (
      user_id, license_id, purchase_id, event_type, previous_status,
      new_status, occurred_at, provider_event_id, reason_code
    ) values (
      v_license.user_id, v_license.id, v_purchase.id, 'revoked',
      v_license.status, 'revoked', p_event_created_at, p_provider_event_id,
      'stripe_dispute_lost'
    );
  end if;

  update public.purchases
  set dispute_status = p_dispute_status,
      stripe_dispute_id = p_dispute_id,
      last_dispute_event_created_at = p_event_created_at,
      disputed_at = case when p_dispute_status in ('open', 'lost') then p_event_created_at else disputed_at end,
      status = case
        when p_dispute_status in ('open', 'lost') then 'disputed'
        when p_dispute_status = 'won' then 'paid'
        else status
      end
  where id = v_purchase.id;
  if p_dispute_status in ('warning', 'open') then
    perform public.record_payment_incident(
      p_provider_event_id, 'dispute_review',
      jsonb_build_object('disputeId', p_dispute_id, 'disputeStatus', p_dispute_status),
      v_purchase.user_id, v_purchase.id, v_purchase.stripe_checkout_session_id,
      p_payment_intent_id, v_purchase.stripe_customer_id
    );
  end if;
  update public.payment_events set purchase_id = v_purchase.id,
    processing_status = 'processed', processed_at = now(), reason_code = p_dispute_status
  where provider_event_id = p_provider_event_id;
  return jsonb_build_object('ok', true, 'duplicate', false, 'processed', true,
    'reason', p_dispute_status, 'purchase_id', v_purchase.id,
    'license_id', v_purchase.resulting_license_id);
end;
$$;

create or replace function public.resolve_payment_incident(
  p_incident_id uuid,
  p_status text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_incident public.payment_incidents%rowtype;
begin
  if p_status not in ('open', 'retrying', 'resolved', 'refunded', 'ignored_with_reason')
     or length(btrim(coalesce(p_reason, ''))) < 4 then
    raise exception 'A valid incident status and reason are required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('incident-id:' || p_incident_id::text, 0));
  select i.* into v_incident from public.payment_incidents i
  where i.id = p_incident_id for update;
  if v_incident.id is null then raise exception 'Incident not found' using errcode = 'P0002'; end if;
  update public.payment_incidents
  set status = p_status,
      retry_count = retry_count + case when p_status = 'retrying' then 1 else 0 end,
      resolution_reason = left(btrim(p_reason), 1000),
      resolved_at = case when p_status in ('resolved', 'refunded', 'ignored_with_reason') then now() else null end
  where id = p_incident_id returning * into v_incident;
  insert into public.payment_incident_events (incident_id, action, reason)
  values (
    v_incident.id,
    case p_status
      when 'open' then 'retry_failed'
      when 'retrying' then 'retry_started'
      when 'resolved' then 'resolved'
      when 'refunded' then 'refunded'
      else 'ignored_with_reason'
    end,
    left(btrim(p_reason), 1000)
  );
  return to_jsonb(v_incident);
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
        when exists (
          select 1 from public.payment_incidents i
          where i.purchase_id = p.id and i.status in ('open', 'retrying')
        ) then 'review'
        when p.status = 'pending' then 'pending'
        else 'failed'
      end
    )
    from public.purchases p
    where p.user_id = auth.uid()
      and p.stripe_checkout_session_id = p_checkout_session_id
    limit 1
  ), jsonb_build_object('purchaseId', null, 'status', 'unknown'));
$$;

revoke all on function public.process_verified_staging_dispute(
  text, text, timestamptz, text, uuid, text, text, text
) from public, anon, authenticated;
revoke all on function public.resolve_payment_incident(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.get_my_payment_activation_status(text) from public, anon;
grant execute on function public.process_verified_staging_dispute(
  text, text, timestamptz, text, uuid, text, text, text
) to service_role;
grant execute on function public.resolve_payment_incident(uuid, text, text) to service_role;
grant execute on function public.get_my_payment_activation_status(text) to authenticated;

comment on table public.billing_customers is
  'One server-managed Stripe test Customer per authenticated MatriculaPro user.';
comment on table public.payment_incidents is
  'Idempotent operational follow-up for verified money that could not safely produce access.';
comment on function public.process_verified_staging_refund(
  text, text, timestamptz, text, uuid, text, bigint, bigint, text
) is 'Applies Stripe cumulative refunds; partial refunds never revoke access.';
