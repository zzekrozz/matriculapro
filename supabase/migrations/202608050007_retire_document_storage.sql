-- MatriculaPro - retire document uploads without deleting legacy objects
-- Reviewed: 2026-08-05
--
-- The first launch stores documentary states and metadata only. Existing private
-- objects are deliberately preserved so the owner can inventory/export them
-- before deciding whether the historical bucket can be removed.

do $storage_retirement$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists case_documents_storage_insert_own on storage.objects';
    execute 'drop policy if exists case_documents_storage_update_own on storage.objects';
    execute 'drop policy if exists case_documents_storage_delete_own on storage.objects';

    -- Keep the existing owner-only SELECT policy for recovery of historical
    -- objects. There is intentionally no authenticated write policy.
    comment on table storage.objects is
      'Supabase-managed objects. MatriculaPro document writes retired by migration 202608050007; legacy reads remain owner-scoped.';
  else
    raise notice 'Supabase Storage schema is unavailable; write-policy retirement was skipped';
  end if;

  if to_regclass('storage.buckets') is not null then
    update storage.buckets
       set public = false
     where id = 'case-documents';
  end if;
end;
$storage_retirement$;

create or replace function public.reject_case_document_file_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.storage_bucket is not null
     or new.storage_path is not null
     or new.original_file_name is not null
     or new.mime_type is not null
     or new.file_size_bytes is not null
     or new.sha256 is not null then
    raise exception 'Document uploads are disabled; store manual documentary states only'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_case_document_file_metadata()
  from public, anon, authenticated;

drop trigger if exists case_documents_00_reject_file_metadata
  on public.case_documents;
drop trigger if exists case_documents_reject_file_metadata
  on public.case_documents;
create trigger case_documents_00_reject_file_metadata
  before insert or update of
    storage_bucket,
    storage_path,
    original_file_name,
    mime_type,
    file_size_bytes,
    sha256
  on public.case_documents
  for each row execute function public.reject_case_document_file_metadata();

comment on function public.reject_case_document_file_metadata() is
  'Prevents new file metadata while allowing manual document-state records. Existing files and metadata are not deleted.';

-- RLS policies are permissive (OR-combined), so removing only today's known
-- policy names would not protect an environment with a legacy custom policy.
-- This trigger is the final authenticated/anonymous write barrier for the
-- retired bucket while retaining service-role recovery access.
create or replace function public.reject_retired_case_document_storage_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_targets_retired_bucket boolean;
begin
  v_targets_retired_bucket := case tg_op
    when 'INSERT' then new.bucket_id = 'case-documents'
    when 'UPDATE' then old.bucket_id = 'case-documents'
      or new.bucket_id = 'case-documents'
    when 'DELETE' then old.bucket_id = 'case-documents'
    else false
  end;
  if v_targets_retired_bucket
     and auth.role() in ('anon', 'authenticated') then
    raise exception 'Document storage writes are disabled for this bucket'
      using errcode = 'insufficient_privilege';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.reject_retired_case_document_storage_write()
  from public, anon, authenticated;

do $storage_write_barrier$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop trigger if exists objects_00_reject_case_documents_write on storage.objects';
    execute 'create trigger objects_00_reject_case_documents_write before insert or update or delete on storage.objects for each row execute function public.reject_retired_case_document_storage_write()';
  end if;
end;
$storage_write_barrier$;

comment on function public.reject_retired_case_document_storage_write() is
  'Blocks anon/authenticated writes into, inside or out of the retired case-documents bucket even if a legacy permissive RLS policy exists.';
