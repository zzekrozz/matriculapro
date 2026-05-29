-- ============================================================
-- MatriculaPRO · Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Tabla profiles
create table if not exists public.profiles (
  id             uuid references auth.users(id) on delete cascade primary key,
  email          text not null,
  display_name   text,
  access_level   text not null default 'explorer'
                   check (access_level in ('visitor', 'explorer', 'founder', 'full')),
  founder_number integer unique,
  created_at     timestamp with time zone default now() not null
);

-- 2. Row Level Security
alter table public.profiles enable row level security;

-- Cada usuario solo puede leer y editar su propio perfil
create policy "Usuario lee su perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuario actualiza su perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Solo el sistema (trigger) puede insertar perfiles
create policy "Solo sistema inserta perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 3. Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Evitar duplicar el trigger si ya existe
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
