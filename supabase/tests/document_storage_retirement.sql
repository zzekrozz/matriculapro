-- Run with: supabase test db
-- Verifies that launch users cannot write document files while legacy reads stay recoverable.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'case_documents_storage_insert_own',
        'case_documents_storage_update_own',
        'case_documents_storage_delete_own'
      )
  ),
  0::bigint,
  'authenticated document-storage write policies are retired'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'case_documents_storage_select_own'
      and cmd = 'SELECT'
  ),
  1::bigint,
  'owner-only legacy object recovery policy remains present'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.case_documents'::regclass
      and tgname = 'case_documents_00_reject_file_metadata'
      and not tgisinternal
  ),
  'case_documents rejects new file metadata'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.reject_case_document_file_metadata()',
    'EXECUTE'
  ),
  'authenticated cannot invoke the retirement trigger function directly'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'storage.objects'::regclass
      and tgname = 'objects_00_reject_case_documents_write'
      and not tgisinternal
  ),
  'storage bucket has a policy-independent authenticated write barrier'
);

select ok(
  position(
    'old.bucket_id = ''case-documents'''
    in pg_get_functiondef('public.reject_retired_case_document_storage_write()'::regprocedure)
  ) > 0,
  'the storage barrier also blocks moving a legacy object out of the retired bucket'
);

select throws_ok(
  $$
    insert into public.case_documents (
      case_id,
      user_id,
      document_type,
      storage_bucket,
      storage_path
    ) values (
      gen_random_uuid(),
      gen_random_uuid(),
      'legacy-test',
      'case-documents',
      'blocked.pdf'
    )
  $$,
  '23514',
  'Document uploads are disabled; store manual documentary states only',
  'new document file metadata fails before persistence'
);

select * from finish();
rollback;
