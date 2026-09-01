-- Fix email confirmation failing at COMMIT with SQLSTATE 42501.
--
-- The deferred licenses_payment_compatibility trigger runs after the free
-- user_licenses row is inserted. Its function was SECURITY INVOKER and queried
-- public.purchases with the Supabase Auth transaction role, which deliberately
-- has no direct table privilege. Keep the cross-ledger invariant privileged,
-- trigger-only and narrowly scoped instead of granting purchases to Auth/client
-- roles or weakening RLS.

alter function public.enforce_payment_license_compatibility() owner to postgres;
alter function public.enforce_payment_license_compatibility() security definer;
alter function public.enforce_payment_license_compatibility()
  set search_path to pg_catalog, public;

revoke all on function public.enforce_payment_license_compatibility()
  from public, anon, authenticated, service_role;

comment on function public.enforce_payment_license_compatibility() is
  'Deferred trigger-only invariant. SECURITY DEFINER is required so Auth email confirmation can insert a free licence while purchases remains inaccessible to Auth and client roles.';
