-- MatriculaPRO - operational registration case model
-- Reviewed: 2026-08-05

-- The database stores real cases only. Demo and practice fixtures remain outside
-- these tables so that educational state cannot be mistaken for an actual file.

-- ---------------------------------------------------------------------------
-- Registration cases and vehicle
-- ---------------------------------------------------------------------------

create table if not exists public.registration_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  title text,
  status text not null default 'draft'
    check (status in (
      'draft', 'assessing', 'collecting-data', 'review-required', 'ready',
      'in-progress', 'blocked', 'completed', 'registered', 'archived'
    )),
  process_kind text
    check (process_kind is null or process_kind in (
      'ordinary-import', 'relocation', 'rehabilitation',
      'historical', 'special-review'
    )),
  operation_kind text
    check (operation_kind is null or operation_kind in (
      'purchase', 'buying', 'already-owned', 'relocation', 'inheritance',
      'donation', 'rehabilitation', 'unknown'
    )),
  process_stage text not null default 'not-purchased'
    check (process_stage in (
      'not-purchased', 'purchased', 'transported', 'itv-requested',
      'itv-passed', 'taxes-started', 'dgt-started', 'registered'
    )),
  buyer_type text
    check (buyer_type is null or buyer_type in ('individual', 'self-employed', 'company')),
  origin_zone text
    check (origin_zone is null or origin_zone in (
      'spain', 'eu', 'eea', 'uk-post-brexit', 'united-kingdom', 'third-country',
      'canary-islands', 'ceuta', 'melilla', 'unknown'
    )),
  seller_type text
    check (seller_type is null or seller_type in (
      'private', 'foreign-professional', 'spanish-professional',
      'already-owned', 'inheritance', 'donation', 'unknown'
    )),
  seller_country_code text
    check (seller_country_code is null or seller_country_code ~ '^[A-Z]{2}$'),
  autonomous_community text,
  municipality text,
  transaction_amount numeric(14,2)
    check (transaction_amount is null or transaction_amount >= 0),
  transaction_currency text default 'EUR'
    check (transaction_currency is null or transaction_currency ~ '^[A-Z]{3}$'),
  transaction_date date,
  invoice_vat_number text,
  invoice_vat_scheme text,
  taxable_base numeric(14,2) check (taxable_base is null or taxable_base >= 0),
  market_value numeric(14,2) check (market_value is null or market_value >= 0),
  registration_tax_subject_confirmed boolean,
  tax_benefit_kind text
    check (tax_benefit_kind is null or tax_benefit_kind in (
      'none', 'no-subjection', 'exemption', 'reduction', 'unknown'
    )),
  tax_benefit_requires_prior_recognition boolean,
  n1_economic_use_confirmed boolean,
  n1_vat_deduction_percent numeric(5,2)
    check (
      n1_vat_deduction_percent is null
      or (n1_vat_deduction_percent >= 0 and n1_vat_deduction_percent <= 100)
    ),
  customs_union_status_confirmed boolean,
  northern_ireland_v5c_confirmed boolean,
  previous_residence_from date,
  spanish_residence_from date,
  ownership_from date,
  use_from date,
  first_entry_into_spain_date date,
  first_entry_into_eu_date date,
  relocation_normal_taxation_confirmed boolean,
  relocation_registration_deadline_confirmed boolean,
  relocation_non_transfer_acknowledged boolean not null default false,
  fiscal_horsepower numeric(8,2)
    check (fiscal_horsepower is null or fiscal_horsepower >= 0),
  ivtm_date date,
  municipal_benefit_kind text
    check (municipal_benefit_kind is null or municipal_benefit_kind in (
      'none', 'exemption', 'discount', 'unknown'
    )),
  ivtm_status text not null default 'pending'
    check (ivtm_status in (
      'pending', 'requested', 'paid', 'exempt-or-discounted', 'municipal-review'
    )),
  is_active boolean not null default true,
  onboarding_step smallint not null default 1 check (onboarding_step >= 1),
  completed_sections text[] not null default '{}'::text[],
  special_circumstances jsonb not null default '{}'::jsonb
    check (jsonb_typeof(special_circumstances) = 'object'),
  decision_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(decision_snapshot) = 'object'),
  decision_version text,
  schema_version integer not null default 1 check (schema_version > 0),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  check (not is_active or (deleted_at is null and status <> 'archived')),
  unique (id, user_id)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  make text,
  model text,
  variant text,
  vin text,
  first_registration_date date,
  mileage_km integer check (mileage_km is null or mileage_km >= 0),
  category text,
  fuel_type text,
  co2_g_km numeric(7,2) check (co2_g_km is null or co2_g_km >= 0),
  co2_standard text
    check (co2_standard is null or co2_standard in ('wltp', 'nedc', 'combined', 'unknown')),
  co2_source text
    check (co2_source is null or co2_source in (
      'spanish-itv', 'coc', 'manufacturer-certificate',
      'foreign-official-document', 'manual-unverified', 'unknown'
    )),
  co2_verified boolean not null default false,
  engine_displacement_cc integer
    check (engine_displacement_cc is null or engine_displacement_cc >= 0),
  power_kw numeric(8,2) check (power_kw is null or power_kw >= 0),
  gross_mass_kg integer check (gross_mass_kg is null or gross_mass_kg >= 0),
  seats smallint check (seats is null or seats > 0),
  registration_country_code text
    check (registration_country_code is null or registration_country_code ~ '^[A-Z]{2}$'),
  manufacturing_country_code text
    check (manufacturing_country_code is null or manufacturing_country_code ~ '^[A-Z]{2}$'),
  foreign_registration_number text,
  previously_registered_abroad boolean not null default true,
  previously_registered_in_spain boolean not null default false,
  export_deregistered boolean,
  transport_method text
    check (transport_method is null or transport_method in (
      'driven', 'trailer', 'carrier', 'temporary-plates', 'unknown'
    )),
  field_k text,
  type_approval_number text,
  approval_type text
    check (approval_type is null or approval_type in (
      'eu-type', 'spanish-type', 'national-type', 'individual-eea',
      'individual-eu', 'individual-spain', 'individual-other',
      'short-series-eea', 'small-series', 'none', 'unknown'
    )),
  coc_available boolean,
  coc_validity_confirmed boolean not null default false,
  coc_vin_match_confirmed boolean not null default false,
  foreign_technical_document_available boolean,
  foreign_inspection_certificate_available boolean,
  foreign_inspection_date date,
  foreign_inspection_valid_until date,
  individual_approval_declared boolean,
  category_confirmed_on_spanish_itv boolean not null default false,
  possible_modifications jsonb not null default '{}'::jsonb
    check (jsonb_typeof(possible_modifications) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint vehicles_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (case_id),
  unique (id, case_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Parties and official sources
-- ---------------------------------------------------------------------------

create table if not exists public.case_parties (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  role text not null
    check (role in ('buyer', 'seller', 'representative', 'owner', 'other')),
  party_type text
    check (party_type is null or party_type in ('individual', 'self-employed', 'company', 'public-body')),
  legal_name text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  tax_identifier text,
  vat_number text,
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb
    check (jsonb_typeof(address) = 'object'),
  is_case_user boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_parties_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id)
);

create table if not exists public.official_source_versions (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  authority text not null,
  title text not null,
  url text not null check (url ~ '^https://'),
  jurisdiction text not null default 'ES',
  scope text not null,
  version_label text not null,
  effective_from date,
  effective_to date,
  reviewed_at date not null,
  retrieved_at timestamptz not null default now(),
  is_current boolean not null default true,
  must_review_annually boolean not null default false,
  content_checksum text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  unique (source_key, version_label),
  check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

-- ---------------------------------------------------------------------------
-- Documents and operational tasks
-- ---------------------------------------------------------------------------

create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  requirement_key text,
  document_type text not null,
  status text not null default 'not-requested'
    check (status in (
      'not-requested', 'pending', 'received', 'in-review',
      'verified', 'issue', 'replaced', 'not-applicable'
    )),
  storage_bucket text,
  storage_path text,
  original_file_name text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sha256 text,
  document_date date,
  issuer text,
  document_number text,
  notes text,
  manually_verified boolean not null default false,
  verified_at timestamptz,
  used_for text[] not null default '{}'::text[],
  incident_summary text,
  replaced_by_document_id uuid,
  rule_version text,
  source_keys text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_documents_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id)
);

create table if not exists public.case_tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  rule_key text,
  category text not null,
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'in-progress', 'blocked', 'done', 'completed', 'not-applicable', 'cancelled')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  is_blocking boolean not null default false,
  required_document_type text,
  due_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  rule_version text,
  source_keys text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_tasks_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id)
);

create table if not exists public.case_checklist_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  checklist_key text not null,
  item_key text not null,
  label text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'issue', 'not-applicable')),
  is_critical boolean not null default false,
  confirmation_note text,
  confirmed_at timestamptz,
  responsible_party_id uuid,
  linked_document_id uuid,
  requires_photo boolean not null default false,
  sort_order integer not null default 0,
  rule_version text,
  source_keys text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_checklist_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (case_id, checklist_key, item_key),
  unique (id, case_id, user_id)
);

-- Every relationship between case-owned rows includes both the case and its
-- owner. A bare UUID foreign key would otherwise permit a row to point at a
-- document or party belonging to a different case because FK checks bypass
-- row-level security.
alter table public.case_documents
  drop constraint if exists case_documents_replaced_by_document_id_fkey;
alter table public.case_checklist_items
  drop constraint if exists case_checklist_items_responsible_party_id_fkey;
alter table public.case_checklist_items
  drop constraint if exists case_checklist_items_linked_document_id_fkey;

update public.case_documents d
set replaced_by_document_id = null
where d.replaced_by_document_id is not null
  and not exists (
    select 1
    from public.case_documents replacement
    where replacement.id = d.replaced_by_document_id
      and replacement.case_id = d.case_id
      and replacement.user_id = d.user_id
  );

update public.case_checklist_items item
set responsible_party_id = null
where item.responsible_party_id is not null
  and not exists (
    select 1
    from public.case_parties party
    where party.id = item.responsible_party_id
      and party.case_id = item.case_id
      and party.user_id = item.user_id
  );

update public.case_checklist_items item
set linked_document_id = null
where item.linked_document_id is not null
  and not exists (
    select 1
    from public.case_documents document
    where document.id = item.linked_document_id
      and document.case_id = item.case_id
      and document.user_id = item.user_id
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.case_documents'::regclass
      and conname = 'case_documents_replacement_owner_fk'
  ) then
    alter table public.case_documents
      add constraint case_documents_replacement_owner_fk
      foreign key (replaced_by_document_id, case_id, user_id)
      references public.case_documents (id, case_id, user_id)
      on delete set null (replaced_by_document_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.case_checklist_items'::regclass
      and conname = 'case_checklist_responsible_party_owner_fk'
  ) then
    alter table public.case_checklist_items
      add constraint case_checklist_responsible_party_owner_fk
      foreign key (responsible_party_id, case_id, user_id)
      references public.case_parties (id, case_id, user_id)
      on delete set null (responsible_party_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.case_checklist_items'::regclass
      and conname = 'case_checklist_linked_document_owner_fk'
  ) then
    alter table public.case_checklist_items
      add constraint case_checklist_linked_document_owner_fk
      foreign key (linked_document_id, case_id, user_id)
      references public.case_documents (id, case_id, user_id)
      on delete set null (linked_document_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tax, costs, appointments, incidents and notes
-- ---------------------------------------------------------------------------

create table if not exists public.case_tax_calculations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  tax_kind text not null
    check (tax_kind in ('purchase-tax', 'vat', 'itp', 'customs', 'registration-tax', 'ivtm', 'other')),
  route text
    check (route is null or route in (
      'model-576', 'model-06', 'model-05', 'special-review', 'not-applicable'
    )),
  status text not null default 'draft'
    check (status in ('draft', 'estimated', 'confirmed', 'review-required', 'not-applicable')),
  autonomous_community text,
  municipality text,
  tax_date date,
  market_value numeric(14,2) check (market_value is null or market_value >= 0),
  taxable_base numeric(14,2) check (taxable_base is null or taxable_base >= 0),
  tax_rate numeric(9,6) check (tax_rate is null or tax_rate >= 0),
  estimated_amount numeric(14,2) check (estimated_amount is null or estimated_amount >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  input_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(input_snapshot) = 'object'),
  result_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result_snapshot) = 'object'),
  rule_version text not null,
  primary_source_version_id uuid references public.official_source_versions(id) on delete set null,
  source_keys text[] not null default '{}'::text[],
  calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_tax_calculations_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id)
);

create table if not exists public.case_costs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  category text not null,
  label text not null,
  status text not null default 'unavailable'
    check (status in ('known', 'estimated', 'variable', 'unavailable', 'paid', 'not-applicable')),
  amount_actual numeric(14,2) check (amount_actual is null or amount_actual >= 0),
  amount_min numeric(14,2) check (amount_min is null or amount_min >= 0),
  amount_max numeric(14,2) check (amount_max is null or amount_max >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  expected_at date,
  paid_at timestamptz,
  source_version_id uuid references public.official_source_versions(id) on delete set null,
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_costs_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  check (amount_min is null or amount_max is null or amount_max >= amount_min),
  unique (id, case_id, user_id)
);

create table if not exists public.case_appointments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  appointment_type text not null,
  authority_or_provider text,
  status text not null default 'requested'
    check (status in ('requested', 'scheduled', 'completed', 'cancelled', 'missed')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  location text,
  reference_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_appointments_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id)
);

create table if not exists public.case_incidents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  category text not null,
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'blocker')),
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  title text not null,
  description text,
  detected_by text not null default 'system'
    check (detected_by in ('system', 'rule', 'user', 'professional')),
  rule_key text,
  resolution text,
  resolved_at timestamptz,
  source_keys text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_incidents_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id)
);

create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  body text not null check (length(btrim(body)) > 0),
  scope text not null default 'general',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_notes_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Decision history and activity audit
-- ---------------------------------------------------------------------------

create table if not exists public.case_decision_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null default auth.uid(),
  engine_version text not null,
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  output_snapshot jsonb not null check (jsonb_typeof(output_snapshot) = 'object'),
  source_keys text[] not null default '{}'::text[],
  confidence text
    check (confidence is null or confidence in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  constraint case_decision_runs_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id)
);

create table if not exists public.case_activity_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  event_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(event_data) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint case_activity_log_case_owner_fk
    foreign key (case_id, user_id)
    references public.registration_cases(id, user_id)
    on delete cascade
);

comment on table public.registration_cases is
  'Real vehicle registration files. Demo and practice state must not be stored here.';
comment on table public.case_tax_calculations is
  'Versioned preparation estimates; never represents an official tax filing.';
comment on table public.case_activity_log is
  'Append-only operational audit. Do not store full PII or document payloads in event_data.';
