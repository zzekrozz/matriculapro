-- MatriculaPRO - auth, profiles and Founder hardening
-- Reviewed: 2026-08-05
-- This migration is additive and preserves existing users and Founder numbers.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared trigger helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  founder_alias text,
  display_mode text not null default 'anonymous',
  access_level text not null default 'explorer',
  founder_number integer unique,
  founder_activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

alter table public.profiles add column if not exists founder_alias text;
alter table public.profiles add column if not exists display_mode text;
alter table public.profiles add column if not exists founder_activated_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz;
alter table public.profiles add column if not exists meta jsonb;

update public.profiles set display_mode = 'anonymous' where display_mode is null;
update public.profiles set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;
update public.profiles set meta = '{}'::jsonb where meta is null;

alter table public.profiles alter column display_mode set default 'anonymous';
alter table public.profiles alter column display_mode set not null;
alter table public.profiles alter column updated_at set default now();
alter table public.profiles alter column updated_at set not null;
alter table public.profiles alter column meta set default '{}'::jsonb;
alter table public.profiles alter column meta set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_access_level_valid'
  ) then
    alter table public.profiles
      add constraint profiles_access_level_valid
      check (access_level in ('visitor', 'explorer', 'founder', 'full')) not valid;
    alter table public.profiles validate constraint profiles_access_level_valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_display_mode_valid'
  ) then
    alter table public.profiles
      add constraint profiles_display_mode_valid
      check (display_mode in ('name', 'initials', 'alias', 'anonymous')) not valid;
    alter table public.profiles validate constraint profiles_display_mode_valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_meta_object'
  ) then
    alter table public.profiles
      add constraint profiles_meta_object
      check (jsonb_typeof(meta) = 'object') not valid;
    alter table public.profiles validate constraint profiles_meta_object;
  end if;
end;
$$;

create index if not exists profiles_email_normalized_idx
  on public.profiles (lower(btrim(email)));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Defense in depth: even if a future migration accidentally grants UPDATE,
-- browser roles cannot change entitlement or identity columns.
create or replace function public.protect_profile_entitlements()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.access_level is distinct from old.access_level
    or new.founder_number is distinct from old.founder_number
    or new.founder_activated_at is distinct from old.founder_activated_at
    or new.meta is distinct from old.meta
  ) then
    raise exception 'Profile entitlement fields are server-managed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_entitlements() from public;

drop trigger if exists profiles_protect_entitlements on public.profiles;
create trigger profiles_protect_entitlements
  before update on public.profiles
  for each row execute function public.protect_profile_entitlements();

-- ---------------------------------------------------------------------------
-- Founder purchases and Stripe event ledger
-- ---------------------------------------------------------------------------

create table if not exists public.pending_founder_purchases (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  stripe_session_id text,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  stripe_payment_link_id text,
  stripe_price_id text,
  stripe_product_id text,
  stripe_event_id text,
  amount_total bigint,
  currency text,
  payment_status text,
  livemode boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.pending_founder_purchases add column if not exists stripe_payment_intent_id text;
alter table public.pending_founder_purchases add column if not exists stripe_payment_link_id text;
alter table public.pending_founder_purchases add column if not exists stripe_price_id text;
alter table public.pending_founder_purchases add column if not exists stripe_product_id text;
alter table public.pending_founder_purchases add column if not exists stripe_event_id text;
alter table public.pending_founder_purchases add column if not exists amount_total bigint;
alter table public.pending_founder_purchases add column if not exists currency text;
alter table public.pending_founder_purchases add column if not exists payment_status text;
alter table public.pending_founder_purchases add column if not exists livemode boolean;
alter table public.pending_founder_purchases add column if not exists updated_at timestamptz;
alter table public.pending_founder_purchases add column if not exists activated_user_id uuid references auth.users(id) on delete set null;
alter table public.pending_founder_purchases add column if not exists metadata jsonb;

update public.pending_founder_purchases
set created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, created_at, now()),
    metadata = coalesce(metadata, '{}'::jsonb)
where created_at is null or updated_at is null or metadata is null;

alter table public.pending_founder_purchases alter column created_at set default now();
alter table public.pending_founder_purchases alter column created_at set not null;
alter table public.pending_founder_purchases alter column updated_at set default now();
alter table public.pending_founder_purchases alter column updated_at set not null;
alter table public.pending_founder_purchases alter column metadata set default '{}'::jsonb;
alter table public.pending_founder_purchases alter column metadata set not null;

-- Resolve the unlikely legacy case where the same normalized email has more
-- than one row. Keep one complete row unchanged: never combine Stripe fields
-- from different payments into synthetic entitlement evidence. Before the
-- redundant rows are removed, archive every original row verbatim in the
-- keeper metadata for financial reconciliation.
do $$
declare
  v_group record;
  v_evidence jsonb;
begin
  for v_group in
    select
      lower(btrim(email)) as normalized_email,
      (array_agg(
        id
        order by
          (activated_at is not null or activated_user_id is not null) desc,
          coalesce(
            payment_status = 'paid'
            and stripe_session_id is not null
            and stripe_payment_intent_id is not null
            and stripe_payment_link_id is not null
            and stripe_price_id is not null
            and stripe_product_id is not null
            and stripe_event_id is not null,
            false
          ) desc,
          created_at asc nulls last,
          id
      ))[1] as keeper_id,
      array_agg(id order by created_at asc nulls last, id) as all_ids
    from public.pending_founder_purchases
    group by lower(btrim(email))
    having count(*) > 1
  loop
    select jsonb_agg(to_jsonb(original) order by original.created_at, original.id)
    into v_evidence
    from public.pending_founder_purchases original
    where original.id = any(v_group.all_ids);

    update public.pending_founder_purchases keeper
    set metadata = keeper.metadata || jsonb_build_object(
          'legacyDuplicateResolution', 'single-row-kept-without-field-merging',
          'legacyNormalizedEmail', v_group.normalized_email,
          'legacyDuplicatePurchases', coalesce(v_evidence, '[]'::jsonb)
        )
    where keeper.id = v_group.keeper_id;

    delete from public.pending_founder_purchases
    where id = any(v_group.all_ids)
      and id <> v_group.keeper_id;
  end loop;
end;
$$;

update public.pending_founder_purchases
set email = lower(btrim(email))
where email is distinct from lower(btrim(email));

create or replace function public.normalize_pending_founder_email()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.email := lower(btrim(new.email));
  if new.email is null or new.email = '' then
    raise exception 'A non-empty purchaser email is required'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_pending_founder_email() from public;

drop trigger if exists pending_founder_normalize_email on public.pending_founder_purchases;
create trigger pending_founder_normalize_email
  before insert or update of email on public.pending_founder_purchases
  for each row execute function public.normalize_pending_founder_email();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pending_founder_purchases'::regclass
      and conname = 'pending_founder_amount_nonnegative'
  ) then
    alter table public.pending_founder_purchases
      add constraint pending_founder_amount_nonnegative
      check (amount_total is null or amount_total >= 0) not valid;
    alter table public.pending_founder_purchases
      validate constraint pending_founder_amount_nonnegative;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pending_founder_purchases'::regclass
      and conname = 'pending_founder_currency_valid'
  ) then
    alter table public.pending_founder_purchases
      add constraint pending_founder_currency_valid
      check (currency is null or currency ~ '^[a-zA-Z]{3}$') not valid;
    alter table public.pending_founder_purchases
      validate constraint pending_founder_currency_valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pending_founder_purchases'::regclass
      and conname = 'pending_founder_metadata_object'
  ) then
    alter table public.pending_founder_purchases
      add constraint pending_founder_metadata_object
      check (jsonb_typeof(metadata) = 'object') not valid;
    alter table public.pending_founder_purchases
      validate constraint pending_founder_metadata_object;
  end if;
end;
$$;

create unique index if not exists pending_founder_email_normalized_uidx
  on public.pending_founder_purchases (lower(btrim(email)));
create unique index if not exists pending_founder_stripe_session_uidx
  on public.pending_founder_purchases (stripe_session_id)
  where stripe_session_id is not null;
create unique index if not exists pending_founder_stripe_event_uidx
  on public.pending_founder_purchases (stripe_event_id)
  where stripe_event_id is not null;
create index if not exists pending_founder_stripe_product_price_idx
  on public.pending_founder_purchases (stripe_product_id, stripe_price_id)
  where stripe_product_id is not null or stripe_price_id is not null;

drop trigger if exists pending_founder_set_updated_at on public.pending_founder_purchases;
create trigger pending_founder_set_updated_at
  before update on public.pending_founder_purchases
  for each row execute function public.set_updated_at();

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  processing_status text not null default 'processing'
    check (processing_status in ('processing', 'processed', 'ignored', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
);

-- A pending row is only entitlement evidence when it is tied to the exact
-- Checkout Session recorded by a verified, handled Stripe webhook. All of
-- these columns are written with service_role only after server-side checks
-- of the configured Payment Link, Price, Product, amount and currency.
create or replace function public.founder_purchase_is_eligible(p_purchase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.pending_founder_purchases p
    join public.stripe_webhook_events e
      on e.event_id = p.stripe_event_id
    where p.id = p_purchase_id
      and p.payment_status = 'paid'
      and p.amount_total > 0
      and lower(p.currency) ~ '^[a-z]{3}$'
      and p.stripe_session_id ~ '^cs_'
      and p.stripe_payment_intent_id ~ '^pi_'
      and p.stripe_payment_link_id ~ '^plink_'
      and p.stripe_price_id ~ '^price_'
      and p.stripe_product_id ~ '^prod_'
      and e.event_type in (
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded'
      )
      and e.processing_status in ('processing', 'processed')
      and e.livemode = p.livemode
      and e.metadata ->> 'checkout_session_id' = p.stripe_session_id
  );
$$;

revoke all on function public.founder_purchase_is_eligible(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Founder number allocation
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_sequences
    where schemaname = 'public' and sequencename = 'founder_number_seq'
  ) then
    create sequence public.founder_number_seq start with 2 increment by 1 minvalue 2;
  end if;
end;
$$;

-- Legacy default privileges may have exposed sequences even when the
-- allocator function itself was protected.
revoke all on sequence public.founder_number_seq
  from public, anon, authenticated;

-- Preserve assigned numbers. If #1 is the only number, the next call returns #2.
do $$
declare
  v_max integer;
begin
  select max(founder_number) into v_max
  from public.profiles
  where founder_number >= 2;

  if v_max is null then
    perform setval('public.founder_number_seq', 2, false);
  else
    perform setval('public.founder_number_seq', v_max, true);
  end if;
end;
$$;

create or replace function public.next_founder_number()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_candidate integer;
  v_attempts integer := 0;
begin
  loop
    v_candidate := nextval('public.founder_number_seq');
    v_attempts := v_attempts + 1;

    if not exists (
      select 1 from public.profiles where founder_number = v_candidate
    ) then
      return v_candidate;
    end if;

    if v_attempts >= 1000 then
      raise exception 'Unable to allocate a Founder number';
    end if;
  end loop;
end;
$$;

revoke all on function public.next_founder_number() from public, anon, authenticated;

-- Repair legacy Founder rows that had the access flag but never received a
-- number. Existing non-null numbers are never changed.
do $$
declare
  v_profile_id uuid;
begin
  for v_profile_id in
    select id
    from public.profiles
    where access_level = 'founder'
      and founder_number is null
    order by created_at, id
    for update
  loop
    update public.profiles
    set founder_number = public.next_founder_number(),
        founder_activated_at = coalesce(founder_activated_at, now())
    where id = v_profile_id;
  end loop;
end;
$$;

-- Keep the signature used by the webhook, but require the complete verified
-- purchase row to exist before granting access. The function never creates
-- entitlement evidence from an email alone.
create or replace function public.activate_founder_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_profile public.profiles%rowtype;
  v_purchase public.pending_founder_purchases%rowtype;
  v_founder_number integer;
begin
  if v_email is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  -- Serializes signup and webhook delivery for the same normalized email.
  perform pg_advisory_xact_lock(hashtextextended(v_email, 0));

  select p.* into v_purchase
  from public.pending_founder_purchases p
  where p.email = v_email
    and public.founder_purchase_is_eligible(p.id)
  limit 1
  for update of p;

  if v_purchase.id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'verified_purchase_not_found',
      'email', v_email
    );
  end if;

  -- A purchase is a single-use entitlement. A webhook replay may confirm the
  -- original activation, but an email change/reuse must never transfer it to a
  -- different auth user.
  if v_purchase.activated_at is not null
     or v_purchase.activated_user_id is not null then
    if v_purchase.activated_user_id is not null then
      select * into v_profile
      from public.profiles
      where id = v_purchase.activated_user_id;
    end if;

    return jsonb_build_object(
      'ok', true,
      'already_activated', true,
      'already_founder', v_profile.id is not null
        and v_profile.access_level in ('founder', 'full')
        and v_profile.founder_number is not null,
      'founder_number', v_profile.founder_number
    );
  end if;

  select * into v_profile
  from public.profiles
  where lower(btrim(email)) = v_email
  order by created_at asc
  limit 1
  for update;

  if v_profile.id is null then
    return jsonb_build_object('ok', true, 'pending', true, 'email', v_email);
  end if;

  if v_profile.founder_number is null then
    v_founder_number := public.next_founder_number();
  else
    v_founder_number := v_profile.founder_number;
  end if;

  update public.profiles
  set access_level = case
        when v_profile.access_level = 'full' then 'full'
        else 'founder'
      end,
      founder_number = v_founder_number,
      founder_activated_at = coalesce(founder_activated_at, now())
  where id = v_profile.id;

  update public.pending_founder_purchases
  set activated_at = coalesce(activated_at, now()),
      activated_user_id = v_profile.id
  where id = v_purchase.id
    and activated_at is null
    and activated_user_id is null;

  if not found then
    raise exception 'Founder purchase was consumed concurrently'
      using errcode = '40001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_founder', v_profile.access_level in ('founder', 'full')
      and v_profile.founder_number is not null,
    'founder_number', v_founder_number
  );
end;
$$;

revoke all on function public.activate_founder_by_email(text)
  from public, anon, authenticated;
grant execute on function public.activate_founder_by_email(text) to service_role;

-- Remove the unsafe legacy RPC that accepted an arbitrary user UUID.
drop function if exists public.activate_founder(uuid, text);

-- ---------------------------------------------------------------------------
-- Auth triggers and safe profile mutation
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(btrim(new.email));
  v_display_name text;
  v_pending_id uuid;
  v_access_level text := 'explorer';
  v_founder_number integer;
begin
  if v_email is null or v_email = '' then
    raise exception 'MatriculaPRO requires an email address';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email, 0));

  v_display_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');

  select p.id into v_pending_id
  from public.pending_founder_purchases p
  where p.email = v_email
    and p.activated_at is null
    and p.activated_user_id is null
    and public.founder_purchase_is_eligible(p.id)
  limit 1
  for update of p;

  if v_pending_id is not null then
    v_access_level := 'founder';
    v_founder_number := public.next_founder_number();
  elsif coalesce(new.raw_app_meta_data ->> 'mpro_access_level', '') = 'full' then
    -- app_metadata is writable only through trusted Supabase Admin APIs.
    v_access_level := 'full';
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    access_level,
    founder_number,
    founder_activated_at
  ) values (
    new.id,
    v_email,
    v_display_name,
    v_access_level,
    v_founder_number,
    case when v_founder_number is not null then now() else null end
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name);

  if v_pending_id is not null then
    update public.pending_founder_purchases
    set activated_at = coalesce(activated_at, now()),
        activated_user_id = new.id
    where id = v_pending_id
      and activated_at is null
      and activated_user_id is null;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_auth_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles
    set email = lower(btrim(new.email))
    where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.handle_auth_user_email_updated()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_auth_user_email_updated();

-- Backfill auth users whose profile trigger was previously missing.
insert into public.profiles (id, email, display_name, access_level)
select
  u.id,
  lower(btrim(u.email)),
  nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
  case
    when coalesce(u.raw_app_meta_data ->> 'mpro_access_level', '') = 'full' then 'full'
    else 'explorer'
  end
from auth.users u
where u.email is not null
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

-- Activate any purchases that arrived before the corresponding profile.
do $$
declare
  v_email text;
begin
  for v_email in
    select distinct p.email
    from public.pending_founder_purchases p
    join public.profiles pr
      on lower(btrim(pr.email)) = lower(btrim(p.email))
    where p.activated_at is null
      and p.activated_user_id is null
      and public.founder_purchase_is_eligible(p.id)
  loop
    perform public.activate_founder_by_email(v_email);
  end loop;
end;
$$;

create or replace function public.update_my_profile(
  p_display_name text default null,
  p_founder_alias text default null,
  p_display_mode text default null
)
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

  if p_display_mode is not null
     and p_display_mode not in ('name', 'initials', 'alias', 'anonymous') then
    raise exception 'Invalid display mode' using errcode = '22023';
  end if;

  if length(coalesce(p_display_name, '')) > 120
     or length(coalesce(p_founder_alias, '')) > 80 then
    raise exception 'Profile value is too long' using errcode = '22001';
  end if;

  update public.profiles
  set display_name = case
        when p_display_name is null then display_name
        else nullif(btrim(p_display_name), '')
      end,
      founder_alias = case
        when p_founder_alias is null then founder_alias
        else nullif(btrim(p_founder_alias), '')
      end,
      display_mode = coalesce(p_display_mode, display_mode)
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.update_my_profile(text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS and public Founder garage projection
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.pending_founder_purchases enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Usuario lee su perfil" on public.profiles;
drop policy if exists "Usuario actualiza su perfil" on public.profiles;
drop policy if exists "Solo sistema inserta perfil" on public.profiles;
drop policy if exists "Cada usuario lee su perfil" on public.profiles;
drop policy if exists "Cada usuario actualiza su perfil" on public.profiles;
drop policy if exists profiles_select_own on public.profiles;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
revoke all on table public.profiles from service_role;
grant select, insert, update on table public.profiles to service_role;

revoke all on table public.pending_founder_purchases from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;
revoke all on table public.pending_founder_purchases from service_role;
revoke all on table public.stripe_webhook_events from service_role;
grant select, insert, update on table public.pending_founder_purchases to service_role;
grant select, insert, update on table public.stripe_webhook_events to service_role;

drop view if exists public.founder_garage;
drop view if exists public.founder_garage_view;

create view public.founder_garage_view
with (security_barrier = true)
as
select
  founder_number,
  case display_mode
    when 'name' then coalesce(
      nullif(btrim(display_name), ''),
      'Founder #' || lpad(founder_number::text, 4, '0')
    )
    when 'initials' then coalesce(
      nullif(upper(left(btrim(display_name), 1)) || '.', '.'),
      'Founder #' || lpad(founder_number::text, 4, '0')
    )
    when 'alias' then coalesce(
      nullif(btrim(founder_alias), ''),
      'Founder #' || lpad(founder_number::text, 4, '0')
    )
    else 'Founder #' || lpad(founder_number::text, 4, '0')
  end as display_name,
  created_at
from public.profiles
where access_level in ('founder', 'full')
  and founder_number is not null;

revoke all on table public.founder_garage_view from public;
grant select on table public.founder_garage_view to anon, authenticated;

comment on view public.founder_garage_view is
  'Public, privacy-filtered Founder projection. Never expose profiles directly.';
