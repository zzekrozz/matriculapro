-- ============================================================
-- MatriculaPRO · Supabase Schema v4 — idempotente
-- Pegar COMPLETO en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ─── 1. TABLA PROFILES ────────────────────────────────────
create table if not exists public.profiles (
  id             uuid references auth.users(id) on delete cascade primary key,
  email          text not null,
  display_name   text,
  access_level   text not null default 'explorer'
                   check (access_level in ('visitor', 'explorer', 'founder', 'full')),
  founder_number integer unique,
  created_at     timestamp with time zone default now() not null
);

-- ─── 2. TABLA PENDING FOUNDER PURCHASES ───────────────────
-- Guarda pagos de Stripe cuando el usuario todavía no tiene cuenta.
create table if not exists public.pending_founder_purchases (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique not null,
  stripe_session_id  text,
  stripe_customer_id text,
  created_at         timestamptz default now(),
  activated_at       timestamptz
);

-- ─── 3. ROW LEVEL SECURITY ────────────────────────────────
alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Usuario lee su perfil') then
    create policy "Usuario lee su perfil"
      on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Usuario actualiza su perfil') then
    create policy "Usuario actualiza su perfil"
      on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Solo sistema inserta perfil') then
    create policy "Solo sistema inserta perfil"
      on public.profiles for insert with check (auth.uid() = id);
  end if;
end $$;

alter table public.pending_founder_purchases enable row level security;
-- Sin política pública: solo accesible desde service_role en el backend

-- ─── 4. VISTA PÚBLICA GARAJE FUNDADOR ────────────────────
create or replace view public.founder_garage_view as
  select
    founder_number,
    case
      when nullif(trim(coalesce(display_name, '')), '') is not null then trim(display_name)
      else 'Founder #' || lpad(founder_number::text, 4, '0')
    end as display_name,
    created_at
  from public.profiles
  where founder_number is not null
  order by founder_number asc;

grant select on public.founder_garage_view to anon;
grant select on public.founder_garage_view to authenticated;

-- ─── 5. SECUENCIA founder_number ─────────────────────────
-- El #0001 es para el admin. Los compradores empiezan en #0002.
do $$
begin
  if not exists (
    select 1 from pg_sequences
    where schemaname = 'public' and sequencename = 'founder_number_seq'
  ) then
    create sequence public.founder_number_seq start with 2 increment by 1 minvalue 2;
  end if;
end $$;

-- Asegurarse de que la secuencia no pise números ya asignados
select setval(
  'public.founder_number_seq',
  greatest(
    2,
    coalesce((select max(founder_number) from public.profiles where founder_number > 1), 1) + 1
  )
);

-- ─── 6. FUNCIÓN activate_founder_by_email ─────────────────
-- Llamada por el webhook de Stripe (service_role).
create or replace function public.activate_founder_by_email(p_email text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id       uuid;
  v_current_level    text;
  v_founder_number   integer;
  v_candidate        integer;
  v_attempts         integer := 0;
begin
  -- Buscar perfil por email
  select id, access_level, founder_number
  into v_profile_id, v_current_level, v_founder_number
  from public.profiles
  where email = p_email
  limit 1;

  -- Sin perfil: guardar como compra pendiente
  if v_profile_id is null then
    insert into public.pending_founder_purchases (email)
    values (p_email)
    on conflict (email) do update
      set created_at = now()
      where pending_founder_purchases.activated_at is null;
    return jsonb_build_object('ok', true, 'pending', true, 'email', p_email);
  end if;

  -- Ya es founder/full con número: no cambiar nada
  if v_current_level in ('founder', 'full') and v_founder_number is not null then
    return jsonb_build_object('ok', true, 'already_founder', true, 'founder_number', v_founder_number);
  end if;

  -- Nunca bajar de 'full' a 'founder'
  if v_current_level = 'full' then
    -- Asignar número si no tiene, pero mantener 'full'
    if v_founder_number is null then
      loop
        v_candidate := nextval('public.founder_number_seq');
        v_attempts  := v_attempts + 1;
        exit when not exists (select 1 from public.profiles where founder_number = v_candidate);
        exit when v_attempts > 100;
      end loop;
      update public.profiles set founder_number = v_candidate where id = v_profile_id;
    end if;
    return jsonb_build_object('ok', true, 'already_founder', true, 'founder_number', coalesce(v_founder_number, v_candidate));
  end if;

  -- Asignar siguiente número libre
  loop
    v_candidate := nextval('public.founder_number_seq');
    v_attempts  := v_attempts + 1;
    exit when not exists (select 1 from public.profiles where founder_number = v_candidate);
    if v_attempts > 100 then
      return jsonb_build_object('ok', false, 'error', 'no_available_number');
    end if;
  end loop;

  -- Actualizar perfil
  update public.profiles
  set access_level = 'founder', founder_number = v_candidate
  where id = v_profile_id;

  return jsonb_build_object('ok', true, 'founder_number', v_candidate);
end;
$$;

-- ─── 7. TRIGGER handle_new_user ──────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_access_level   text    := 'explorer';
  v_founder_number integer := null;
  v_pending        record;
  v_candidate      integer;
  v_attempts       integer := 0;
begin
  -- Admin
  if new.email = 'pogrebnyakivan123@gmail.com' then
    v_access_level   := 'full';
    v_founder_number := 1;
  else
    -- Comprobar compra pendiente
    select * into v_pending
    from public.pending_founder_purchases
    where email = new.email and activated_at is null
    limit 1;

    if v_pending.id is not null then
      v_access_level := 'founder';
      loop
        v_candidate := nextval('public.founder_number_seq');
        v_attempts  := v_attempts + 1;
        exit when not exists (select 1 from public.profiles where founder_number = v_candidate);
        exit when v_attempts > 100;
      end loop;
      v_founder_number := v_candidate;
      update public.pending_founder_purchases
      set activated_at = now() where id = v_pending.id;
    end if;
  end if;

  insert into public.profiles (id, email, access_level, founder_number)
  values (new.id, new.email, v_access_level, v_founder_number)
  on conflict (id) do update set
    access_level   = excluded.access_level,
    founder_number = excluded.founder_number;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 8. PARCHE: usuarios existentes ──────────────────────
-- Asegurar que el admin queda como full #0001
update public.profiles
set
  access_level   = 'full',
  founder_number = 1
where email = 'pogrebnyakivan123@gmail.com'
  and (access_level != 'full' or founder_number is null or founder_number != 1);

-- Asegurar que geopogrebnyak@gmail.com queda como founder con número si ya lo era
-- (este UPDATE es idempotente: no cambia si ya tiene founder_number)
update public.profiles
set access_level = 'founder'
where email = 'geopogrebnyak@gmail.com'
  and access_level not in ('founder', 'full');

-- Rearmar la secuencia para que no pise ningún número existente
select setval(
  'public.founder_number_seq',
  greatest(
    2,
    coalesce((select max(founder_number) from public.profiles where founder_number > 1), 1) + 1
  )
);
