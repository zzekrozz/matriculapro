-- MatriculaPro final VAT, upgrade-refund restoration and Madrid renewal rules.
-- Additive migration; migrations 001-009 remain immutable.
-- Reviewed: 2026-08-06

-- ---------------------------------------------------------------------------
-- Fiscal evidence persisted from the signed Stripe event and paid invoice.
-- ---------------------------------------------------------------------------

alter table public.purchases
  add column expected_stripe_tax_rate_id text,
  add column applied_stripe_tax_rate_id text,
  add column tax_percentage numeric(5,2),
  add column tax_behavior text,
  add column subtotal_excluding_tax_cents bigint,
  add column tax_amount_cents bigint,
  add column total_including_tax_cents bigint,
  add column stripe_invoice_id text,
  add column stripe_invoice_number text;

alter table public.purchases
  add constraint purchases_expected_tax_rate_check check (
    expected_stripe_tax_rate_id is null
    or expected_stripe_tax_rate_id ~ '^txr_[A-Za-z0-9]+$'
  ),
  add constraint purchases_applied_tax_rate_check check (
    applied_stripe_tax_rate_id is null
    or applied_stripe_tax_rate_id ~ '^txr_[A-Za-z0-9]+$'
  ),
  add constraint purchases_verified_tax_check check (
    (applied_stripe_tax_rate_id is null and tax_percentage is null
      and tax_behavior is null and subtotal_excluding_tax_cents is null
      and tax_amount_cents is null and total_including_tax_cents is null
      and stripe_invoice_id is null and stripe_invoice_number is null)
    or
    (applied_stripe_tax_rate_id is not null and tax_percentage = 21.00
      and tax_behavior = 'inclusive' and subtotal_excluding_tax_cents >= 0
      and tax_amount_cents >= 0
      and applied_stripe_tax_rate_id = expected_stripe_tax_rate_id
      and subtotal_excluding_tax_cents = amount_due_base_cents
      and tax_amount_cents = amount_due_vat_cents
      and subtotal_excluding_tax_cents + tax_amount_cents = total_including_tax_cents
      and total_including_tax_cents = amount_due_cents
      and stripe_invoice_id ~ '^in_[A-Za-z0-9_]+$'
      and length(btrim(stripe_invoice_number)) > 0)
  );

create unique index purchases_stripe_invoice_id_unique_idx
  on public.purchases (stripe_invoice_id) where stripe_invoice_id is not null;

alter table public.payment_incidents drop constraint payment_incidents_kind_check;
alter table public.payment_incidents add constraint payment_incidents_kind_check
  check (kind in (
    'paid_without_license', 'amount_mismatch', 'currency_mismatch',
    'country_mismatch', 'customer_mismatch', 'unknown_price',
    'overlapping_license', 'webhook_processing_failure',
    'refund_inconsistency', 'partial_refund_review', 'dispute_review',
    'tax_mismatch', 'invoice_mismatch', 'upgrade_refund_restore_failure',
    'upgrade_original_purchase_refunded'
  ));

alter table public.license_events drop constraint license_events_event_type_check;
alter table public.license_events add constraint license_events_event_type_check
  check (event_type in (
    'free_assigned', 'activated', 'scheduled', 'upgraded', 'expired', 'renewed',
    'suspended', 'restored', 'restoration_skipped', 'revoked', 'refunded', 'disputed'
  ));

create table public.upgrade_relationships (
  upgrade_purchase_id uuid primary key references public.purchases(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  original_purchase_id uuid not null references public.purchases(id) on delete restrict,
  original_license_id uuid not null references public.user_licenses(id) on delete restrict,
  upgraded_license_id uuid not null references public.user_licenses(id) on delete restrict,
  credited_amount_cents bigint not null check (credited_amount_cents > 0),
  original_starts_at timestamptz not null,
  original_expires_at timestamptz not null,
  restoration_status text not null default 'eligible' check (restoration_status in (
    'eligible', 'restored', 'not_restored_expired',
    'not_restored_original_refunded', 'review_required', 'restore_failed'
  )),
  restored_at timestamptz,
  restoration_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (upgraded_license_id),
  check (original_starts_at < original_expires_at),
  check (restoration_status <> 'restored' or restored_at is not null)
);

alter table public.upgrade_relationships enable row level security;
create policy upgrade_relationships_select_own on public.upgrade_relationships
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.upgrade_relationships from public, anon, authenticated, service_role;
grant select on table public.upgrade_relationships to authenticated;
grant select, insert, update on table public.upgrade_relationships to service_role;
create trigger upgrade_relationships_set_updated_at
  before update on public.upgrade_relationships
  for each row execute function public.set_updated_at();

insert into public.upgrade_relationships (
  upgrade_purchase_id, user_id, original_purchase_id, original_license_id,
  upgraded_license_id, credited_amount_cents, original_starts_at, original_expires_at
)
select p.id, p.user_id, source.original_purchase_id, source.id,
       p.resulting_license_id, p.upgrade_credit_cents, source.starts_at, source.expires_at
from public.purchases p
join public.user_licenses source on source.id = p.source_license_id
where p.purchase_kind = 'upgrade' and p.status = 'paid'
  and p.resulting_license_id is not null and source.original_purchase_id is not null
on conflict (upgrade_purchase_id) do nothing;

-- ---------------------------------------------------------------------------
-- Europe/Madrid calendar-day renewal boundary, never a fixed 720-hour span.
-- ---------------------------------------------------------------------------

create or replace function public.renewal_window_opens_at_madrid(p_expires_at timestamptz)
returns timestamptz
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
  select ((p_expires_at at time zone 'Europe/Madrid') - interval '30 days')
         at time zone 'Europe/Madrid'
$$;

revoke all on function public.renewal_window_opens_at_madrid(timestamptz)
  from public, anon, authenticated;
grant execute on function public.renewal_window_opens_at_madrid(timestamptz)
  to service_role;

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
  select purchase.* into v_purchase from public.purchases purchase
  where purchase.user_id = p_user_id and purchase.idempotency_key = p_idempotency_key
  for update;
  if v_purchase.id is not null then
    if v_purchase.purchase_kind <> p_purchase_kind
       or v_purchase.tier <> p_tier or v_purchase.duration <> p_duration
       or v_purchase.stripe_price_id <> p_stripe_price_id
       or v_purchase.amount_due_cents <> p_amount_due_cents
       or v_purchase.stripe_customer_id is distinct from p_stripe_customer_id
       or v_purchase.source_license_id is distinct from p_source_license_id
       or v_purchase.renewal_of_license_id is distinct from p_renewal_of_license_id then
      raise exception 'Idempotency key was already used with different terms' using errcode = '22023';
    end if;
    return to_jsonb(v_purchase);
  end if;

  select purchase.* into v_purchase from public.purchases purchase
  where purchase.user_id = p_user_id and purchase.status = 'pending'
  order by purchase.created_at desc limit 1 for update;
  if v_purchase.id is not null then
    if v_purchase.purchase_kind = p_purchase_kind
       and v_purchase.tier = p_tier and v_purchase.duration = p_duration
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
      where future.user_id = p_user_id and future.status = 'scheduled'
        and future.starts_at > now() and future.expires_at > now()
    ) then raise exception 'A future renewal already exists' using errcode = '23505'; end if;
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
    set purchase_kind = p_purchase_kind, stripe_customer_id = p_stripe_customer_id,
        fiscal_country = upper(p_tax_country)
    where id = v_purchase.id returning * into v_purchase;
    return to_jsonb(v_purchase);
  end if;

  if p_source_license_id is not null or p_renewal_of_license_id is null
     or p_upgrade_credit_cents <> 0 or p_amount_due_cents <> p_total_cents
     or upper(p_currency) <> 'EUR' or upper(p_tax_country) <> 'ES'
     or p_tier not in ('particular', 'professional')
     or p_duration not in ('one_month', 'six_months', 'twelve_months')
     or p_base_cents + p_vat_cents <> p_total_cents or p_total_cents <= 0
     or p_stripe_price_id !~ '^price_[A-Za-z0-9]+$'
     or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid renewal terms' using errcode = '22023';
  end if;
  select license.* into v_source from public.user_licenses license
  where license.id = p_renewal_of_license_id and license.user_id = p_user_id for update;
  if v_source.id is null or v_source.tier <> p_tier
     or v_source.status not in ('active', 'expired') or v_source.expires_at is null then
    raise exception 'Licence cannot be renewed' using errcode = '55000';
  end if;
  if v_source.status = 'active' and v_source.expires_at > now()
     and now() < public.renewal_window_opens_at_madrid(v_source.expires_at) then
    raise exception 'Renewal window is not open' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.user_licenses future
    where future.user_id = p_user_id and future.status = 'scheduled'
      and future.expires_at > now()
  ) then raise exception 'A future renewal already exists' using errcode = '23505'; end if;

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

create or replace function public.bind_purchase_tax_rate(p_purchase_id uuid, p_tax_rate_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_purchase public.purchases%rowtype;
begin
  if p_tax_rate_id !~ '^txr_[A-Za-z0-9]+$' then
    raise exception 'Invalid Stripe Tax Rate ID' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id for update;
  if v_purchase.id is null or v_purchase.status <> 'pending' then
    raise exception 'Purchase is not pending' using errcode = '55000';
  end if;
  if v_purchase.expected_stripe_tax_rate_id is not null
     and v_purchase.expected_stripe_tax_rate_id <> p_tax_rate_id then
    raise exception 'Purchase Tax Rate is already bound' using errcode = '22023';
  end if;
  update public.purchases set expected_stripe_tax_rate_id = p_tax_rate_id
  where id = p_purchase_id returning * into v_purchase;
  return to_jsonb(v_purchase);
end;
$$;

revoke all on function public.bind_purchase_tax_rate(uuid, text)
  from public, anon, authenticated;
grant execute on function public.bind_purchase_tax_rate(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Tax + invoice wrapper: validation occurs before the existing atomic licence
-- state machine, and every fiscal field is committed in the same transaction.
-- ---------------------------------------------------------------------------

create or replace function public.process_verified_taxed_staging_payment(
  p_provider_event_id text, p_event_type text, p_event_created_at timestamptz,
  p_payload_sha256 text, p_purchase_id uuid, p_checkout_session_id text,
  p_payment_intent_id text, p_customer_id text, p_price_id text,
  p_amount_total_cents bigint, p_currency text, p_country text,
  p_tax_rate_id text, p_tax_percentage numeric, p_tax_behavior text,
  p_subtotal_excluding_tax_cents bigint, p_tax_amount_cents bigint,
  p_total_including_tax_cents bigint, p_invoice_id text, p_invoice_number text,
  p_invoice_status text, p_invoice_country text, p_invoice_currency text,
  p_invoice_tax_rate_id text, p_invoice_tax_behavior text,
  p_invoice_subtotal_excluding_tax_cents bigint, p_invoice_tax_amount_cents bigint,
  p_invoice_total_including_tax_cents bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_source public.user_licenses%rowtype;
  v_result jsonb;
  v_reason text;
  v_kind text;
begin
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id;
  if v_purchase.id is null then
    return public.process_verified_staging_payment(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_customer_id,
      p_price_id, p_amount_total_cents, p_currency, p_country
    );
  end if;
  if v_purchase.expected_stripe_tax_rate_id is distinct from p_tax_rate_id
     or p_tax_rate_id !~ '^txr_[A-Za-z0-9]+$'
     or p_tax_percentage is distinct from 21.00
     or p_tax_behavior is distinct from 'inclusive' then
    v_reason := 'tax_rate_mismatch'; v_kind := 'tax_mismatch';
  elsif p_subtotal_excluding_tax_cents is distinct from v_purchase.amount_due_base_cents
     or p_tax_amount_cents is distinct from v_purchase.amount_due_vat_cents
     or p_total_including_tax_cents is distinct from v_purchase.amount_due_cents
     or p_subtotal_excluding_tax_cents + p_tax_amount_cents is distinct from p_total_including_tax_cents then
    v_reason := 'tax_breakdown_mismatch'; v_kind := 'tax_mismatch';
  elsif p_invoice_id is null or p_invoice_id !~ '^in_[A-Za-z0-9_]+$'
     or length(btrim(coalesce(p_invoice_number, ''))) = 0
     or p_invoice_status is distinct from 'paid'
     or upper(coalesce(p_invoice_country, '')) <> 'ES'
     or upper(coalesce(p_invoice_currency, '')) <> v_purchase.currency
     or p_invoice_tax_rate_id is distinct from p_tax_rate_id
     or p_invoice_tax_behavior is distinct from 'inclusive'
     or p_invoice_subtotal_excluding_tax_cents is distinct from p_subtotal_excluding_tax_cents
     or p_invoice_tax_amount_cents is distinct from p_tax_amount_cents
     or p_invoice_total_including_tax_cents is distinct from p_total_including_tax_cents then
    v_reason := 'invoice_mismatch'; v_kind := 'invoice_mismatch';
  end if;
  if v_reason is not null then
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'ignored', processed_at = now(), reason_code = v_reason
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id, v_kind,
      jsonb_build_object(
        'reason', v_reason, 'taxRateId', p_tax_rate_id,
        'taxPercentage', p_tax_percentage, 'taxBehavior', p_tax_behavior,
        'baseCents', p_subtotal_excluding_tax_cents, 'taxCents', p_tax_amount_cents,
        'totalCents', p_total_including_tax_cents, 'invoiceId', p_invoice_id,
        'invoiceNumber', p_invoice_number, 'invoiceStatus', p_invoice_status,
        'invoiceTaxRateId', p_invoice_tax_rate_id,
        'invoiceTaxBehavior', p_invoice_tax_behavior
      ),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    return jsonb_build_object('ok', false, 'duplicate', false, 'processed', false,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null);
  end if;

  v_result := public.process_verified_staging_payment(
    p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
    p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_customer_id,
    p_price_id, p_amount_total_cents, p_currency, p_country
  );
  if coalesce((v_result->>'processed')::boolean, false) then
    update public.purchases set
      applied_stripe_tax_rate_id = p_tax_rate_id,
      tax_percentage = p_tax_percentage, tax_behavior = p_tax_behavior,
      subtotal_excluding_tax_cents = p_subtotal_excluding_tax_cents,
      tax_amount_cents = p_tax_amount_cents,
      total_including_tax_cents = p_total_including_tax_cents,
      stripe_invoice_id = p_invoice_id, stripe_invoice_number = p_invoice_number
    where id = p_purchase_id
      and (applied_stripe_tax_rate_id is null or applied_stripe_tax_rate_id = p_tax_rate_id)
      and (stripe_invoice_id is null or stripe_invoice_id = p_invoice_id);

    select p.* into v_purchase from public.purchases p where p.id = p_purchase_id;
    if v_purchase.purchase_kind = 'upgrade' and v_purchase.resulting_license_id is not null then
      select l.* into v_source from public.user_licenses l where l.id = v_purchase.source_license_id;
      if v_source.id is not null and v_source.original_purchase_id is not null
         and v_source.starts_at is not null and v_source.expires_at is not null then
        insert into public.upgrade_relationships (
          upgrade_purchase_id, user_id, original_purchase_id, original_license_id,
          upgraded_license_id, credited_amount_cents, original_starts_at, original_expires_at
        ) values (
          v_purchase.id, v_purchase.user_id, v_source.original_purchase_id, v_source.id,
          v_purchase.resulting_license_id, v_purchase.upgrade_credit_cents,
          v_source.starts_at, v_source.expires_at
        ) on conflict (upgrade_purchase_id) do nothing;
      end if;
    end if;
  end if;
  return v_result;
end;
$$;

revoke all on function public.process_verified_taxed_staging_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, bigint, text, text,
  text, numeric, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) from public, anon, authenticated;
grant execute on function public.process_verified_taxed_staging_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, bigint, text, text,
  text, numeric, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) to service_role;

-- Backend entry points move to the stricter wrappers in this migration.
revoke execute on function public.process_verified_staging_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, bigint, text, text
) from service_role;

-- ---------------------------------------------------------------------------
-- Refund orchestration. A full upgrade refund restores only the unexpired,
-- still-paid original month. A later original refund is an incident requiring
-- human review and never mutates either licence automatically.
-- ---------------------------------------------------------------------------

create or replace function public.process_verified_final_refund(
  p_provider_event_id text, p_event_type text, p_event_created_at timestamptz,
  p_payload_sha256 text, p_purchase_id uuid, p_payment_intent_id text,
  p_amount_refunded_cents bigint, p_charge_amount_cents bigint, p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_original_purchase public.purchases%rowtype;
  v_upgrade_purchase public.purchases%rowtype;
  v_original_license public.user_licenses%rowtype;
  v_relationship public.upgrade_relationships%rowtype;
  v_result jsonb;
  v_full boolean;
begin
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id;
  if v_purchase.user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('purchase-user:' || v_purchase.user_id::text, 0));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id for update;

  if v_purchase.id is null
     or v_purchase.stripe_payment_intent_id is distinct from p_payment_intent_id
     or upper(p_currency) is distinct from v_purchase.currency
     or p_charge_amount_cents is distinct from v_purchase.amount_paid_cents
     or p_amount_refunded_cents < 0
     or p_amount_refunded_cents > v_purchase.amount_paid_cents then
    return public.process_verified_staging_refund(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_payment_intent_id, p_amount_refunded_cents,
      p_charge_amount_cents, p_currency
    );
  end if;
  if (v_purchase.last_refund_event_created_at is not null
      and p_event_created_at < v_purchase.last_refund_event_created_at)
     or p_amount_refunded_cents <= v_purchase.amount_refunded_cents then
    return public.process_verified_staging_refund(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_payment_intent_id, p_amount_refunded_cents,
      p_charge_amount_cents, p_currency
    );
  end if;

  v_full := p_amount_refunded_cents >= v_purchase.amount_paid_cents;
  if v_full and exists (
    select 1 from public.upgrade_relationships r
    where r.original_purchase_id = v_purchase.id
  ) then
    select r.* into v_relationship from public.upgrade_relationships r
    where r.original_purchase_id = v_purchase.id order by r.created_at desc limit 1 for update;
    select p.* into v_upgrade_purchase from public.purchases p
    where p.id = v_relationship.upgrade_purchase_id for update;
    update public.purchases set amount_refunded_cents = p_amount_refunded_cents,
      refund_status = 'fully_refunded', status = 'refunded',
      last_refund_at = p_event_created_at,
      last_refund_event_created_at = p_event_created_at,
      refunded_at = p_event_created_at
    where id = v_purchase.id;
    update public.upgrade_relationships set restoration_status = 'review_required',
      restoration_event_id = p_provider_event_id where upgrade_purchase_id = v_relationship.upgrade_purchase_id;
    perform public.record_payment_incident(
      p_provider_event_id, 'upgrade_original_purchase_refunded',
      jsonb_build_object(
        'reason', 'original_purchase_fully_refunded_after_upgrade',
        'upgradePurchaseId', v_relationship.upgrade_purchase_id,
        'originalLicenseId', v_relationship.original_license_id,
        'upgradedLicenseId', v_relationship.upgraded_license_id,
        'creditedAmountCents', v_relationship.credited_amount_cents,
        'netTotalPaidCents',
          greatest(v_purchase.amount_paid_cents - p_amount_refunded_cents, 0)
          + greatest(v_upgrade_purchase.amount_paid_cents - v_upgrade_purchase.amount_refunded_cents, 0),
        'expandedPlanPriceCents', v_upgrade_purchase.total_cents,
        'paymentShortfallCents', greatest(
          v_upgrade_purchase.total_cents
          - greatest(v_purchase.amount_paid_cents - p_amount_refunded_cents, 0)
          - greatest(v_upgrade_purchase.amount_paid_cents - v_upgrade_purchase.amount_refunded_cents, 0), 0
        ),
        'manualReviewRequired', true
      ), v_purchase.user_id, v_purchase.id, v_purchase.stripe_checkout_session_id,
      p_payment_intent_id, v_purchase.stripe_customer_id
    );
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'processed', processed_at = now(),
      reason_code = 'original_purchase_refunded_after_upgrade_review'
    where provider_event_id = p_provider_event_id;
    return jsonb_build_object('ok', true, 'duplicate', false, 'processed', true,
      'reason', 'original_purchase_refunded_after_upgrade_review',
      'purchase_id', v_purchase.id, 'license_id', v_relationship.upgraded_license_id);
  end if;

  v_result := public.process_verified_staging_refund(
    p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
    p_purchase_id, p_payment_intent_id, p_amount_refunded_cents,
    p_charge_amount_cents, p_currency
  );
  if not v_full or v_purchase.purchase_kind <> 'upgrade'
     or not coalesce((v_result->>'processed')::boolean, false)
     or coalesce((v_result->>'duplicate')::boolean, false) then
    return v_result;
  end if;

  select r.* into v_relationship from public.upgrade_relationships r
  where r.upgrade_purchase_id = v_purchase.id for update;
  if v_relationship.upgrade_purchase_id is null then
    perform public.record_payment_incident(
      p_provider_event_id, 'upgrade_refund_restore_failure',
      jsonb_build_object('reason', 'upgrade_relationship_missing'),
      v_purchase.user_id, v_purchase.id, v_purchase.stripe_checkout_session_id,
      p_payment_intent_id, v_purchase.stripe_customer_id
    );
    return v_result || jsonb_build_object('reason', 'fully_refunded_restore_failed');
  end if;

  select p.* into v_original_purchase from public.purchases p
  where p.id = v_relationship.original_purchase_id for update;
  select l.* into v_original_license from public.user_licenses l
  where l.id = v_relationship.original_license_id for update;
  if v_original_purchase.id is null or v_original_license.id is null then
    update public.upgrade_relationships set restoration_status = 'restore_failed',
      restoration_event_id = p_provider_event_id
    where upgrade_purchase_id = v_relationship.upgrade_purchase_id;
    perform public.record_payment_incident(
      p_provider_event_id, 'upgrade_refund_restore_failure',
      jsonb_build_object('reason', 'original_purchase_or_license_missing'),
      v_purchase.user_id, v_purchase.id, v_purchase.stripe_checkout_session_id,
      p_payment_intent_id, v_purchase.stripe_customer_id
    );
  elsif v_original_purchase.refund_status = 'fully_refunded'
     or v_original_purchase.status = 'refunded' then
    update public.upgrade_relationships
    set restoration_status = 'not_restored_original_refunded',
        restoration_event_id = p_provider_event_id
    where upgrade_purchase_id = v_relationship.upgrade_purchase_id;
    insert into public.license_events (
      user_id, license_id, purchase_id, event_type, previous_status,
      new_status, occurred_at, provider_event_id, reason_code
    ) values (
      v_original_license.user_id, v_original_license.id, v_purchase.id,
      'restoration_skipped', v_original_license.status, v_original_license.status,
      p_event_created_at, p_provider_event_id, 'original_purchase_fully_refunded'
    ) on conflict do nothing;
  elsif v_relationship.original_expires_at <= now() then
    update public.upgrade_relationships
    set restoration_status = 'not_restored_expired', restoration_event_id = p_provider_event_id
    where upgrade_purchase_id = v_relationship.upgrade_purchase_id;
    insert into public.license_events (
      user_id, license_id, purchase_id, event_type, previous_status,
      new_status, occurred_at, provider_event_id, reason_code
    ) values (
      v_original_license.user_id, v_original_license.id, v_purchase.id,
      'restoration_skipped', v_original_license.status, v_original_license.status,
      p_event_created_at, p_provider_event_id, 'original_license_expired_before_upgrade_refund'
    ) on conflict do nothing;
  else
    update public.user_licenses set status = 'active',
      metadata = metadata || jsonb_build_object(
        'restoredFromUpgradePurchaseId', v_purchase.id,
        'restorationEventId', p_provider_event_id
      ) where id = v_original_license.id;
    update public.upgrade_relationships set restoration_status = 'restored',
      restored_at = p_event_created_at, restoration_event_id = p_provider_event_id
    where upgrade_purchase_id = v_relationship.upgrade_purchase_id;
    insert into public.license_events (
      user_id, license_id, purchase_id, event_type, previous_status,
      new_status, occurred_at, provider_event_id, reason_code
    ) values (
      v_original_license.user_id, v_original_license.id, v_purchase.id,
      'restored', v_original_license.status, 'active', p_event_created_at,
      p_provider_event_id, 'upgrade_fully_refunded_original_time_remaining'
    ) on conflict do nothing;
    v_result := v_result || jsonb_build_object(
      'reason', 'fully_refunded_original_license_restored',
      'license_id', v_original_license.id
    );
  end if;
  return v_result;
end;
$$;

revoke all on function public.process_verified_final_refund(
  text, text, timestamptz, text, uuid, text, bigint, bigint, text
) from public, anon, authenticated;
grant execute on function public.process_verified_final_refund(
  text, text, timestamptz, text, uuid, text, bigint, bigint, text
) to service_role;
revoke execute on function public.process_verified_staging_refund(
  text, text, timestamptz, text, uuid, text, bigint, bigint, text
) from service_role;

comment on function public.renewal_window_opens_at_madrid(timestamptz) is
  'Subtracts 30 calendar days in Europe/Madrid while preserving local wall time across DST.';
comment on table public.upgrade_relationships is
  'Explicit immutable upgrade linkage plus auditable restoration outcome.';
