-- MatriculaPRO: auth/profile/stripe preview fix
-- Ejecutar en Supabase Dashboard -> SQL Editor -> Run
-- Script idempotente y no destructivo.

alter table if exists public.profiles enable row level security;
alter table if exists public.pending_founder_purchases enable row level security;

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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Usuario lee su perfil'
  ) then
    create policy "Usuario lee su perfil"
      on public.profiles
      for select
      to authenticated
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Usuario actualiza su perfil'
  ) then
    create policy "Usuario actualiza su perfil"
      on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Solo sistema inserta perfil'
  ) then
    create policy "Solo sistema inserta perfil"
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() = id);
  end if;
end $$;

create or replace function public.activate_founder_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_current_level text;
  v_founder_number integer;
  v_candidate integer;
  v_attempts integer := 0;
begin
  select id, access_level, founder_number
  into v_profile_id, v_current_level, v_founder_number
  from public.profiles
  where email = p_email
  limit 1;

  if v_profile_id is null then
    insert into public.pending_founder_purchases (email)
    values (p_email)
    on conflict (email) do update
      set created_at = now()
      where pending_founder_purchases.activated_at is null;

    return jsonb_build_object('ok', true, 'pending', true, 'email', p_email);
  end if;

  if v_current_level in ('founder', 'full') and v_founder_number is not null then
    return jsonb_build_object('ok', true, 'already_founder', true, 'founder_number', v_founder_number);
  end if;

  if v_current_level = 'full' then
    if v_founder_number is null then
      loop
        v_candidate := nextval('public.founder_number_seq');
        v_attempts := v_attempts + 1;
        exit when not exists (select 1 from public.profiles where founder_number = v_candidate);
        exit when v_attempts > 100;
      end loop;

      update public.profiles
      set founder_number = v_candidate
      where id = v_profile_id;
    end if;

    return jsonb_build_object(
      'ok', true,
      'already_founder', true,
      'founder_number', coalesce(v_founder_number, v_candidate)
    );
  end if;

  loop
    v_candidate := nextval('public.founder_number_seq');
    v_attempts := v_attempts + 1;
    exit when not exists (select 1 from public.profiles where founder_number = v_candidate);
    if v_attempts > 100 then
      return jsonb_build_object('ok', false, 'error', 'no_available_number');
    end if;
  end loop;

  update public.profiles
  set access_level = 'founder',
      founder_number = v_candidate
  where id = v_profile_id;

  return jsonb_build_object('ok', true, 'founder_number', v_candidate);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access_level text := 'explorer';
  v_founder_number integer := null;
  v_pending record;
  v_candidate integer;
  v_attempts integer := 0;
begin
  if new.email = 'pogrebnyakivan123@gmail.com' then
    v_access_level := 'full';
    v_founder_number := 1;
  else
    select *
    into v_pending
    from public.pending_founder_purchases
    where email = new.email
      and activated_at is null
    limit 1;

    if v_pending.id is not null then
      v_access_level := 'founder';
      loop
        v_candidate := nextval('public.founder_number_seq');
        v_attempts := v_attempts + 1;
        exit when not exists (select 1 from public.profiles where founder_number = v_candidate);
        exit when v_attempts > 100;
      end loop;

      v_founder_number := v_candidate;

      update public.pending_founder_purchases
      set activated_at = now()
      where id = v_pending.id;
    end if;
  end if;

  insert into public.profiles (id, email, access_level, founder_number)
  values (new.id, new.email, v_access_level, v_founder_number)
  on conflict (id) do update
    set access_level = excluded.access_level,
        founder_number = excluded.founder_number;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

update public.profiles
set access_level = 'full',
    founder_number = 1
where email = 'pogrebnyakivan123@gmail.com'
  and (access_level <> 'full' or founder_number is distinct from 1);
