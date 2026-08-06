-- MatriculaPRO - RLS, indexes, operational RPCs and private document storage
-- Reviewed: 2026-08-05

-- ---------------------------------------------------------------------------
-- Entitlement and ownership helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_real_cases()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.access_level in ('founder', 'full')
  );
$$;

revoke all on function public.can_manage_real_cases() from public, anon;
grant execute on function public.can_manage_real_cases() to authenticated;

create or replace function public.owns_registration_case(p_case_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.registration_cases c
    where c.id::text = p_case_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  );
$$;

revoke all on function public.owns_registration_case(text) from public, anon;
grant execute on function public.owns_registration_case(text) to authenticated;

-- Ensures every child row carries the immutable owner of its parent case.
create or replace function public.ensure_case_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner
  from public.registration_cases
  where id = new.case_id;

  if v_owner is null then
    raise exception 'Registration case not found' using errcode = '23503';
  end if;

  if new.user_id is not null and new.user_id <> v_owner then
    raise exception 'Case owner mismatch' using errcode = '42501';
  end if;

  new.user_id := v_owner;
  return new;
end;
$$;

revoke all on function public.ensure_case_owner() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'vehicles',
    'case_parties',
    'case_documents',
    'case_tasks',
    'case_checklist_items',
    'case_tax_calculations',
    'case_costs',
    'case_appointments',
    'case_incidents',
    'case_notes',
    'case_decision_runs'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_ensure_owner', v_table);
    execute format(
      'create trigger %I before insert or update of case_id, user_id on public.%I for each row execute function public.ensure_case_owner()',
      v_table || '_ensure_owner',
      v_table
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Timestamps, revisions and append-only activity
-- ---------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'registration_cases',
    'vehicles',
    'case_parties',
    'official_source_versions',
    'case_documents',
    'case_tasks',
    'case_checklist_items',
    'case_tax_calculations',
    'case_costs',
    'case_appointments',
    'case_incidents',
    'case_notes'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_set_updated_at', v_table);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      v_table || '_set_updated_at',
      v_table
    );
  end loop;
end;
$$;

create or replace function public.bump_case_revision()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;

revoke all on function public.bump_case_revision() from public;

drop trigger if exists registration_cases_bump_revision on public.registration_cases;
create trigger registration_cases_bump_revision
  before update on public.registration_cases
  for each row execute function public.bump_case_revision();

create or replace function public.log_case_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_case_id uuid;
  v_user_id uuid;
  v_entity_id uuid;
begin
  v_case_id := coalesce(
    nullif(v_row ->> 'case_id', '')::uuid,
    nullif(v_row ->> 'id', '')::uuid
  );
  v_user_id := nullif(v_row ->> 'user_id', '')::uuid;
  v_entity_id := nullif(v_row ->> 'id', '')::uuid;

  insert into public.case_activity_log (
    case_id,
    user_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    event_data
  ) values (
    v_case_id,
    v_user_id,
    auth.uid(),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    v_entity_id,
    jsonb_strip_nulls(jsonb_build_object(
      'status', v_row ->> 'status',
      'category', v_row ->> 'category',
      'document_type', v_row ->> 'document_type',
      'rule_key', v_row ->> 'rule_key',
      'revision', v_row ->> 'revision'
    ))
  );

  return new;
end;
$$;

revoke all on function public.log_case_activity() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'registration_cases',
    'case_documents',
    'case_tasks',
    'case_checklist_items',
    'case_tax_calculations',
    'case_costs',
    'case_appointments',
    'case_incidents',
    'case_notes'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_activity', v_table);
    execute format(
      'create trigger %I after insert or update on public.%I for each row execute function public.log_case_activity()',
      v_table || '_activity',
      v_table
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create unique index if not exists registration_cases_one_active_per_user_uidx
  on public.registration_cases (user_id)
  where is_active and deleted_at is null and status <> 'archived';

create index if not exists registration_cases_user_updated_idx
  on public.registration_cases (user_id, updated_at desc)
  where deleted_at is null;
create index if not exists registration_cases_user_status_idx
  on public.registration_cases (user_id, status)
  where deleted_at is null;
create index if not exists vehicles_user_vin_idx
  on public.vehicles (user_id, upper(vin))
  where vin is not null;
create index if not exists case_parties_case_role_idx
  on public.case_parties (case_id, role)
  where deleted_at is null;
create unique index if not exists case_parties_single_buyer_uidx
  on public.case_parties (case_id)
  where role = 'buyer' and deleted_at is null;
create unique index if not exists case_parties_single_seller_uidx
  on public.case_parties (case_id)
  where role = 'seller' and deleted_at is null;
create index if not exists case_documents_case_status_idx
  on public.case_documents (case_id, status)
  where deleted_at is null;
create index if not exists case_documents_case_type_idx
  on public.case_documents (case_id, document_type)
  where deleted_at is null;
create unique index if not exists case_documents_requirement_uidx
  on public.case_documents (case_id, requirement_key)
  where requirement_key is not null and deleted_at is null;
create index if not exists case_tasks_case_status_sort_idx
  on public.case_tasks (case_id, status, sort_order)
  where deleted_at is null;
create unique index if not exists case_tasks_rule_key_uidx
  on public.case_tasks (case_id, rule_key)
  where rule_key is not null and deleted_at is null;
create index if not exists case_checklist_case_status_idx
  on public.case_checklist_items (case_id, status, sort_order);
create index if not exists case_tax_case_kind_created_idx
  on public.case_tax_calculations (case_id, tax_kind, created_at desc)
  where deleted_at is null;
create index if not exists case_costs_case_status_idx
  on public.case_costs (case_id, status)
  where deleted_at is null;
create index if not exists case_appointments_case_scheduled_idx
  on public.case_appointments (case_id, scheduled_at)
  where deleted_at is null and status <> 'cancelled';
create index if not exists case_incidents_case_status_severity_idx
  on public.case_incidents (case_id, status, severity)
  where deleted_at is null;
create index if not exists case_notes_case_created_idx
  on public.case_notes (case_id, created_at desc)
  where deleted_at is null;
create index if not exists case_decision_runs_case_created_idx
  on public.case_decision_runs (case_id, created_at desc);
create index if not exists case_activity_log_case_occurred_idx
  on public.case_activity_log (case_id, occurred_at desc);
create index if not exists official_source_key_reviewed_idx
  on public.official_source_versions (source_key, reviewed_at desc);
create unique index if not exists official_source_one_current_uidx
  on public.official_source_versions (source_key)
  where is_current;

-- ---------------------------------------------------------------------------
-- Row Level Security and table grants
-- ---------------------------------------------------------------------------

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
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_select_own', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_insert_own', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_update_own', v_table);

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      v_table || '_select_own',
      v_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and public.can_manage_real_cases())',
      v_table || '_insert_own',
      v_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id and public.can_manage_real_cases()) with check ((select auth.uid()) = user_id and public.can_manage_real_cases())',
      v_table || '_update_own',
      v_table
    );

    execute format('revoke all on table public.%I from anon, authenticated', v_table);
    execute format('grant select, insert, update on table public.%I to authenticated', v_table);
    execute format('revoke all on table public.%I from service_role', v_table);
    execute format(
      'grant select, insert, update on table public.%I to service_role',
      v_table
    );
  end loop;
end;
$$;

alter table public.case_decision_runs enable row level security;
drop policy if exists case_decision_runs_select_own on public.case_decision_runs;
drop policy if exists case_decision_runs_insert_own on public.case_decision_runs;
create policy case_decision_runs_select_own
  on public.case_decision_runs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy case_decision_runs_insert_own
  on public.case_decision_runs for insert to authenticated
  with check ((select auth.uid()) = user_id and public.can_manage_real_cases());
revoke all on table public.case_decision_runs from anon, authenticated;
grant select, insert on table public.case_decision_runs to authenticated;
revoke all on table public.case_decision_runs from service_role;
grant select, insert on table public.case_decision_runs to service_role;

alter table public.case_activity_log enable row level security;
drop policy if exists case_activity_log_select_own on public.case_activity_log;
create policy case_activity_log_select_own
  on public.case_activity_log for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on table public.case_activity_log from anon, authenticated;
grant select on table public.case_activity_log to authenticated;
revoke all on table public.case_activity_log from service_role;
grant select, insert on table public.case_activity_log to service_role;

alter table public.official_source_versions enable row level security;
drop policy if exists official_sources_read_published on public.official_source_versions;
create policy official_sources_read_published
  on public.official_source_versions for select to anon, authenticated
  using (published_at is not null);
revoke all on table public.official_source_versions from anon, authenticated;
grant select on table public.official_source_versions to anon, authenticated;
revoke all on table public.official_source_versions from service_role;
grant select, insert, update on table public.official_source_versions
  to service_role;

-- ---------------------------------------------------------------------------
-- Transactional case lifecycle RPCs
-- ---------------------------------------------------------------------------

create or replace function public.start_registration_case(p_title text default null)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_case_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.can_manage_real_cases() then
    raise exception 'Active paid access is required for a real case'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 1));

  update public.registration_cases
  set is_active = false
  where user_id = v_user_id
    and is_active
    and deleted_at is null;

  insert into public.registration_cases (user_id, title, is_active)
  values (v_user_id, nullif(btrim(p_title), ''), true)
  returning id into v_case_id;

  insert into public.vehicles (case_id, user_id)
  values (v_case_id, v_user_id);

  return v_case_id;
end;
$$;

revoke all on function public.start_registration_case(text) from public, anon;
grant execute on function public.start_registration_case(text) to authenticated;

create or replace function public.set_active_registration_case(p_case_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.can_manage_real_cases() then
    raise exception 'Active paid access is required for a real case'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 1));

  if not exists (
    select 1 from public.registration_cases
    where id = p_case_id
      and user_id = v_user_id
      and deleted_at is null
      and status <> 'archived'
  ) then
    raise exception 'Registration case not found' using errcode = 'P0002';
  end if;

  update public.registration_cases
  set is_active = false
  where user_id = v_user_id
    and deleted_at is null
    and is_active;

  update public.registration_cases
  set is_active = true
  where id = p_case_id
    and user_id = v_user_id;
end;
$$;

revoke all on function public.set_active_registration_case(uuid) from public, anon;
grant execute on function public.set_active_registration_case(uuid) to authenticated;

create or replace function public.soft_delete_registration_case(p_case_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.can_manage_real_cases() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.registration_cases
  set deleted_at = now(),
      is_active = false,
      status = 'archived'
  where id = p_case_id
    and user_id = v_user_id
    and deleted_at is null;

  if not found then
    raise exception 'Registration case not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.soft_delete_registration_case(uuid) from public, anon;
grant execute on function public.soft_delete_registration_case(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Private Supabase Storage bucket
-- ---------------------------------------------------------------------------

do $storage_setup$
begin
  if to_regclass('storage.buckets') is not null
     and to_regclass('storage.objects') is not null then
    execute $sql$
      insert into storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
      ) values (
        'case-documents',
        'case-documents',
        false,
        15728640,
        array[
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/heic',
          'image/heif'
        ]::text[]
      )
      on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types
    $sql$;

    execute 'drop policy if exists case_documents_storage_select_own on storage.objects';
    execute 'drop policy if exists case_documents_storage_insert_own on storage.objects';
    execute 'drop policy if exists case_documents_storage_update_own on storage.objects';
    execute 'drop policy if exists case_documents_storage_delete_own on storage.objects';

    execute $policy$
      create policy case_documents_storage_select_own
      on storage.objects for select to authenticated
      using (
        bucket_id = 'case-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and public.owns_registration_case((storage.foldername(name))[2])
      )
    $policy$;

    execute $policy$
      create policy case_documents_storage_insert_own
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'case-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and public.can_manage_real_cases()
        and public.owns_registration_case((storage.foldername(name))[2])
      )
    $policy$;

    execute $policy$
      create policy case_documents_storage_update_own
      on storage.objects for update to authenticated
      using (
        bucket_id = 'case-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and public.can_manage_real_cases()
        and public.owns_registration_case((storage.foldername(name))[2])
      )
      with check (
        bucket_id = 'case-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and public.can_manage_real_cases()
        and public.owns_registration_case((storage.foldername(name))[2])
      )
    $policy$;

    execute $policy$
      create policy case_documents_storage_delete_own
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'case-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and public.can_manage_real_cases()
        and public.owns_registration_case((storage.foldername(name))[2])
      )
    $policy$;
  else
    raise notice 'Supabase Storage schema is unavailable; bucket policies were skipped';
  end if;
end;
$storage_setup$;

comment on function public.start_registration_case(text) is
  'Creates one real draft case and its empty vehicle atomically for the authenticated Founder/full user.';
comment on function public.owns_registration_case(text) is
  'Safe boolean helper used by private Storage policies; it does not disclose case data.';
