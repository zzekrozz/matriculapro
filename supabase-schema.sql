-- ============================================================
-- MatriculaPRO · Supabase Schema (versión 3 — producción)
-- Ejecutar COMPLETO en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── 1. TABLA PROFILES ─────────────────────────────────────
create table if not exists public.profiles (
  id             uuid references auth.users(id) on delete cascade primary key,
  email          text not null,
  display_name   text,
  access_level   text not null default 'explorer'
                   check (access_level in ('visitor', 'explorer', 'founder', 'full')),
  founder_number integer unique,
  created_at     timestamp with time zone default now() not null
);

-- ─── 2. TABLA PENDING FOUNDER PURCHASES ────────────────────
-- Guarda pagos de Stripe cuando el comprador todavía no tiene cuenta en Supabase.
-- El trigger handle_new_user la consulta al registrarse para activar founder automáticamente.
create table if not exists public.pending_founder_purchases (
  id               uuid primary key default gen_random_uuid(),
  email            text unique not null,
  stripe_session_id text,
  stripe_customer_id text,
  created_at       timestamptz default now(),
  activated_at     timestamptz   -- null = pendiente, not null = ya activado
);

-- ─── 3. ROW LEVEL SECURITY ─────────────────────────────────
alter table public.profiles enable row level security;

-- Solo el propio usuario puede leer/actualizar su perfil
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

-- pending_founder_purchases solo es accesible desde service_role (no RLS pública)
alter table public.pending_founder_purchases enable row level security;
-- Sin política pública = solo accesible desde service_role en el backend

-- Vista pública del mural de fundadores (sin emails)
create or replace view public.founder_garage_view as
  select
    founder_number,
    case
      when display_name is not null and display_name <> '' then display_name
      else null
    end as display_name,
    access_level,
    created_at
  from public.profiles
  where founder_number is not null
  order by founder_number asc;

-- ─── 4. SECUENCIA founder_number ───────────────────────────
-- Empieza en 2. El #0001 está reservado para el admin y se asigna manualmente.
-- Si ya existe, actualizar el valor de inicio solo si está por debajo de 2.
do $$
begin
  if not exists (select 1 from pg_sequences where sequencename = 'founder_number_seq' and schemaname = 'public') then
    create sequence public.founder_number_seq start with 2 increment by 1 minvalue 2;
  else
    -- Si existe y el valor actual es < 2, reiniciar
    perform setval('public.founder_number_seq', greatest(2, (select last_value from public.founder_number_seq)));
  end if;
end $$;

-- ─── 5. FUNCIÓN: activate_founder_by_email ─────────────────
-- Llamada desde el webhook de Stripe con service_role.
-- Asigna el siguiente founder_number disponible evitando duplicados.
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

  -- Si no existe perfil: guardar como compra pendiente
  if v_profile_id is null then
    insert into public.pending_founder_purchases (email)
    values (p_email)
    on conflict (email) do update set stripe_session_id = excluded.stripe_session_id;

    return jsonb_build_object('ok', true, 'pending', true, 'email', p_email);
  end if;

  -- Si ya es founder/full con número asignado, no cambiar nada
  if v_current_level in ('founder', 'full') and v_founder_number is not null then
    return jsonb_build_object('ok', true, 'already_founder', true, 'founder_number', v_founder_number);
  end if;

  -- Asignar siguiente número libre (evitar colisiones con reintentos)
  loop
    v_candidate := nextval('public.founder_number_seq');
    v_attempts  := v_attempts + 1;

    -- Comprobar que el número no está ya ocupado
    if not exists (select 1 from public.profiles where founder_number = v_candidate) then
      exit; -- número libre encontrado
    end if;

    -- Límite de seguridad: máximo 100 intentos
    if v_attempts > 100 then
      return jsonb_build_object('ok', false, 'error', 'no_available_number');
    end if;
  end loop;

  -- Actualizar perfil
  update public.profiles
  set
    access_level   = 'founder',
    founder_number = v_candidate
  where id = v_profile_id;

  return jsonb_build_object('ok', true, 'founder_number', v_candidate);
end;
$$;

-- ─── 6. TRIGGER: handle_new_user ───────────────────────────
-- Al registrarse un nuevo usuario:
--   a) Si es el admin → full + #0001
--   b) Si tiene compra pendiente → founder + próximo número
--   c) Si no → explorer sin número
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
  -- a) Email del administrador/creador → full #0001
  if new.email = 'pogrebnyakivan123@gmail.com' then
    v_access_level   := 'full';
    v_founder_number := 1;

  else
    -- b) Comprobar si hay una compra pendiente sin activar para este email
    select * into v_pending
    from public.pending_founder_purchases
    where email = new.email and activated_at is null
    limit 1;

    if v_pending.id is not null then
      -- Tiene pago pendiente: activar como founder
      v_access_level := 'founder';

      -- Asignar siguiente número libre
      loop
        v_candidate := nextval('public.founder_number_seq');
        v_attempts  := v_attempts + 1;
        if not exists (select 1 from public.profiles where founder_number = v_candidate) then
          exit;
        end if;
        if v_attempts > 100 then
          v_candidate := null;
          exit;
        end if;
      end loop;

      v_founder_number := v_candidate;

      -- Marcar compra como activada
      update public.pending_founder_purchases
      set activated_at = now()
      where id = v_pending.id;
    end if;
  end if;

  -- Insertar perfil
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

-- ─── 7. ACTUALIZAR ADMIN SI YA TIENE CUENTA ────────────────
-- Por si el admin creó la cuenta antes de este SQL
update public.profiles
set
  access_level   = 'full',
  founder_number = 1
where email = 'pogrebnyakivan123@gmail.com'
  and (access_level not in ('founder', 'full') or founder_number is null or founder_number != 1);

-- Asegurarse de que la secuencia no pise el #1 ni ningún número ya asignado
select setval(
  'public.founder_number_seq',
  greatest(2, coalesce((select max(founder_number) from public.profiles where founder_number > 1), 1) + 1)
);
