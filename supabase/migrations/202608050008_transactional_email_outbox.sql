-- Transactional email outbox for MatriculaPro.
--
-- The queue deliberately stores references only: never a recipient address,
-- subject, rendered content, Auth action link, OTP or token. Product data is
-- resolved by the service-role worker immediately before delivery.

begin;

create table if not exists public.transactional_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'purchase_confirmed',
    'license_activated',
    'license_upgraded',
    'license_expiring_soon',
    'license_expired',
    'purchase_refunded',
    'account_deletion_requested'
  )),
  user_id uuid not null references auth.users(id) on delete restrict,
  purchase_id uuid references public.purchases(id) on delete restrict,
  license_id uuid references public.user_licenses(id) on delete restrict,
  account_deletion_request_id uuid references public.account_deletion_requests(id) on delete restrict,
  idempotency_key text not null unique
    check (idempotency_key ~ '^[a-z0-9][a-z0-9:_-]{15,159}$'),
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'sent', 'failed', 'dead_letter'
  )),
  attempt_count integer not null default 0 check (attempt_count between 0 and 8),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by uuid,
  sent_at timestamptz,
  provider_message_id_sha256 text
    check (provider_message_id_sha256 is null or provider_message_id_sha256 ~ '^[0-9a-f]{64}$'),
  last_error_code text
    check (last_error_code is null or last_error_code ~ '^[a-z0-9_:-]{1,120}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (
      event_type in ('purchase_confirmed', 'license_activated', 'license_upgraded')
      and purchase_id is not null
      and license_id is not null
      and account_deletion_request_id is null
    )
    or (
      event_type = 'purchase_refunded'
      and purchase_id is not null
      and account_deletion_request_id is null
    )
    or (
      event_type in ('license_expiring_soon', 'license_expired')
      and purchase_id is null
      and license_id is not null
      and account_deletion_request_id is null
    )
    or (
      event_type = 'account_deletion_requested'
      and purchase_id is null
      and license_id is null
      and account_deletion_request_id is not null
    )
  ),
  check (
    (status = 'pending' and attempt_count = 0 and locked_at is null and locked_by is null and sent_at is null)
    or (status = 'processing' and attempt_count > 0 and locked_at is not null and locked_by is not null and sent_at is null)
    or (status = 'failed' and attempt_count > 0 and locked_at is null and locked_by is null and sent_at is null)
    or (status = 'dead_letter' and attempt_count = 8 and locked_at is null and locked_by is null and sent_at is null)
    or (status = 'sent' and attempt_count > 0 and locked_at is null and locked_by is null and sent_at is not null and provider_message_id_sha256 is not null)
  )
);

create index if not exists transactional_email_outbox_ready_idx
  on public.transactional_email_outbox (available_at, created_at)
  where status in ('pending', 'failed');
create index if not exists transactional_email_outbox_stale_lease_idx
  on public.transactional_email_outbox (locked_at)
  where status = 'processing';
create index if not exists transactional_email_outbox_user_created_idx
  on public.transactional_email_outbox (user_id, created_at desc);

comment on table public.transactional_email_outbox is
  'Service-only reference outbox. Never stores recipient addresses, rendered content, action links, OTPs or tokens.';
comment on column public.transactional_email_outbox.idempotency_key is
  'Stable event key used both by the database and Resend Idempotency-Key header.';
comment on column public.transactional_email_outbox.provider_message_id_sha256 is
  'SHA-256 of the provider message ID; the raw provider identifier is not retained.';

alter table public.transactional_email_outbox enable row level security;
revoke all on table public.transactional_email_outbox from public, anon, authenticated, service_role;

-- Internal enqueue primitive. It has no EXECUTE grant, including service_role;
-- only owner-executed triggers and the controlled scheduler call it.
create or replace function public.enqueue_transactional_email_reference(
  p_event_type text,
  p_user_id uuid,
  p_purchase_id uuid,
  p_license_id uuid,
  p_account_deletion_request_id uuid,
  p_idempotency_key text,
  p_available_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  insert into public.transactional_email_outbox (
    event_type, user_id, purchase_id, license_id,
    account_deletion_request_id, idempotency_key, available_at
  ) values (
    p_event_type, p_user_id, p_purchase_id, p_license_id,
    p_account_deletion_request_id, p_idempotency_key, p_available_at
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select outbox.id into v_id
    from public.transactional_email_outbox outbox
    where outbox.idempotency_key = p_idempotency_key;
  end if;
  return v_id;
end;
$$;

revoke all on function public.enqueue_transactional_email_reference(
  text, uuid, uuid, uuid, uuid, text, timestamptz
) from public, anon, authenticated, service_role;

create or replace function public.enqueue_paid_purchase_email()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'paid'
     and old.status is distinct from new.status
     and new.resulting_license_id is not null then
    perform public.enqueue_transactional_email_reference(
      'purchase_confirmed', new.user_id, new.id, new.resulting_license_id,
      null, 'purchase-confirmed:' || new.id::text, now()
    );
  elsif new.status = 'refunded'
        and old.status is distinct from new.status then
    perform public.enqueue_transactional_email_reference(
      'purchase_refunded', new.user_id, new.id, new.resulting_license_id,
      null, 'purchase-refunded:' || new.id::text, now()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.enqueue_paid_purchase_email()
  from public, anon, authenticated, service_role;

drop trigger if exists purchases_enqueue_confirmation_email on public.purchases;
create trigger purchases_enqueue_confirmation_email
  after update of status on public.purchases
  for each row execute function public.enqueue_paid_purchase_email();

create or replace function public.enqueue_license_event_email()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.event_type = 'activated' and new.purchase_id is not null then
    perform public.enqueue_transactional_email_reference(
      'license_activated', new.user_id, new.purchase_id, new.license_id,
      null, 'license-activated:' || new.license_id::text, now()
    );
  elsif new.event_type = 'upgraded' and new.purchase_id is not null then
    perform public.enqueue_transactional_email_reference(
      'license_upgraded', new.user_id, new.purchase_id, new.license_id,
      null, 'license-upgraded:' || new.license_id::text, now()
    );
  elsif new.event_type = 'expired' then
    perform public.enqueue_transactional_email_reference(
      'license_expired', new.user_id, null, new.license_id,
      null, 'license-expired:' || new.license_id::text, now()
    );
  elsif new.event_type = 'refunded' and new.purchase_id is not null then
    perform public.enqueue_transactional_email_reference(
      'purchase_refunded', new.user_id, new.purchase_id, new.license_id,
      null, 'purchase-refunded:' || new.purchase_id::text, now()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.enqueue_license_event_email()
  from public, anon, authenticated, service_role;

drop trigger if exists license_events_enqueue_transactional_email on public.license_events;
create trigger license_events_enqueue_transactional_email
  after insert on public.license_events
  for each row execute function public.enqueue_license_event_email();

create or replace function public.enqueue_deletion_request_email()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.enqueue_transactional_email_reference(
    'account_deletion_requested', new.user_id, null, null, new.id,
    'account-deletion-requested:' || new.id::text, now()
  );
  return new;
end;
$$;
revoke all on function public.enqueue_deletion_request_email()
  from public, anon, authenticated, service_role;

drop trigger if exists account_deletion_enqueue_email on public.account_deletion_requests;
create trigger account_deletion_enqueue_email
  after insert on public.account_deletion_requests
  for each row execute function public.enqueue_deletion_request_email();

-- Run at least daily. It materialises due expirations through the authoritative
-- function from migration 006, queues one reminder at most seven days before
-- each active licence expires and closes exhausted stale leases.
create or replace function public.schedule_due_transactional_emails(
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_expired integer;
  v_reminders integer;
  v_exhausted integer;
begin
  if p_now is null then
    raise exception 'Scheduler time is required' using errcode = '22023';
  end if;

  select public.expire_due_user_licenses(p_now) into v_expired;

  insert into public.transactional_email_outbox (
    event_type, user_id, license_id, idempotency_key, available_at
  )
  select
    'license_expiring_soon', license.user_id, license.id,
    'license-expiring-soon:' || license.id::text, p_now
  from public.user_licenses license
  where license.status = 'active'
    and license.tier in ('particular', 'professional')
    and license.expires_at > p_now
    and license.expires_at <= p_now + interval '7 days'
  on conflict (idempotency_key) do nothing;
  get diagnostics v_reminders = row_count;

  update public.transactional_email_outbox
  set status = 'dead_letter',
      locked_at = null,
      locked_by = null,
      last_error_code = 'processing_lease_exhausted',
      updated_at = p_now
  where status = 'processing'
    and attempt_count = 8
    and locked_at <= p_now - interval '15 minutes';
  get diagnostics v_exhausted = row_count;

  return jsonb_build_object(
    'expiredLicenses', v_expired,
    'expiryReminders', v_reminders,
    'exhaustedLeases', v_exhausted
  );
end;
$$;

-- Atomic lease claim. A crashed worker can be retried after 15 minutes and
-- Resend receives the stable idempotency key, preventing duplicate delivery.
create or replace function public.claim_transactional_email_batch(
  p_worker_id uuid,
  p_limit integer default 20,
  p_now timestamptz default now()
)
returns table (
  id uuid,
  event_type text,
  user_id uuid,
  purchase_id uuid,
  license_id uuid,
  account_deletion_request_id uuid,
  idempotency_key text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_worker_id is null or p_now is null or p_limit not between 1 and 50 then
    raise exception 'Invalid email claim request' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select outbox.id
    from public.transactional_email_outbox outbox
    where outbox.attempt_count < 8
      and (
        (
          outbox.status in ('pending', 'failed')
          and outbox.available_at <= p_now
        )
        or (
          outbox.status = 'processing'
          and outbox.locked_at <= p_now - interval '15 minutes'
        )
      )
    order by outbox.available_at, outbox.created_at, outbox.id
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.transactional_email_outbox outbox
    set status = 'processing',
        attempt_count = outbox.attempt_count + 1,
        locked_at = p_now,
        locked_by = p_worker_id,
        last_error_code = null,
        updated_at = p_now
    from candidates
    where outbox.id = candidates.id
    returning outbox.*
  )
  select
    claimed.id, claimed.event_type, claimed.user_id, claimed.purchase_id,
    claimed.license_id, claimed.account_deletion_request_id,
    claimed.idempotency_key, claimed.attempt_count
  from claimed
  order by claimed.available_at, claimed.created_at, claimed.id;
end;
$$;

create or replace function public.complete_transactional_email(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_provider_message_id_sha256 text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if p_provider_message_id_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid provider message hash' using errcode = '22023';
  end if;
  update public.transactional_email_outbox
  set status = 'sent',
      sent_at = now(),
      locked_at = null,
      locked_by = null,
      provider_message_id_sha256 = p_provider_message_id_sha256,
      last_error_code = null,
      updated_at = now()
  where id = p_outbox_id
    and status = 'processing'
    and locked_by = p_worker_id;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.fail_transactional_email(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_error_code text,
  p_now timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempts integer;
  v_status text;
  v_error_code text;
begin
  v_error_code := case
    when p_error_code ~ '^[a-z0-9_:-]{1,120}$' then p_error_code
    else 'unexpected_worker_error'
  end;

  select outbox.attempt_count into v_attempts
  from public.transactional_email_outbox outbox
  where outbox.id = p_outbox_id
    and outbox.status = 'processing'
    and outbox.locked_by = p_worker_id
  for update;
  if v_attempts is null then
    raise exception 'Email lease is no longer owned by this worker' using errcode = '40001';
  end if;

  v_status := case when v_attempts >= 8 then 'dead_letter' else 'failed' end;
  update public.transactional_email_outbox
  set status = v_status,
      available_at = case v_attempts
        when 1 then p_now + interval '1 minute'
        when 2 then p_now + interval '5 minutes'
        when 3 then p_now + interval '15 minutes'
        when 4 then p_now + interval '1 hour'
        when 5 then p_now + interval '4 hours'
        else p_now + interval '12 hours'
      end,
      locked_at = null,
      locked_by = null,
      last_error_code = v_error_code,
      updated_at = p_now
  where id = p_outbox_id;
  return v_status;
end;
$$;

revoke all on function public.schedule_due_transactional_emails(timestamptz)
  from public, anon, authenticated;
revoke all on function public.claim_transactional_email_batch(uuid, integer, timestamptz)
  from public, anon, authenticated;
revoke all on function public.complete_transactional_email(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.fail_transactional_email(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;

grant execute on function public.schedule_due_transactional_emails(timestamptz)
  to service_role;
grant execute on function public.claim_transactional_email_batch(uuid, integer, timestamptz)
  to service_role;
grant execute on function public.complete_transactional_email(uuid, uuid, text)
  to service_role;
grant execute on function public.fail_transactional_email(uuid, uuid, text, timestamptz)
  to service_role;

comment on function public.schedule_due_transactional_emails(timestamptz) is
  'Service-only daily scheduler: expires due licences and queues one seven-day reminder per licence.';
comment on function public.claim_transactional_email_batch(uuid, integer, timestamptz) is
  'Service-only atomic outbox lease. Returns references, never recipient addresses or rendered content.';

commit;
