-- ============================================================
-- MatriculaPRO · Supabase Schema
-- ============================================================
-- ESTADO: preparado, NO ejecutado. Conectar cuando se active Supabase.
-- 
-- Cómo activarlo:
--   1. Crear proyecto en supabase.com
--   2. Ir a SQL Editor y ejecutar este script
--   3. Añadir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY a .env.local
--   4. Conectar AuthProvider con supabase.auth y AccessProvider con datos reales
-- ============================================================

-- Tabla de perfiles vinculada a auth.users
create table public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  email           text not null,
  display_name    text,
  founder_alias   text,
  display_mode    text not null default 'alias'
                    check (display_mode in ('name', 'initials', 'alias', 'anonymous')),
  access_level    text not null default 'explorer'
                    check (access_level in ('visitor', 'explorer', 'founder', 'full')),
  founder_number  integer unique,
  founder_activated_at timestamp with time zone,
  created_at      timestamp with time zone default now() not null,
  meta            jsonb default '{}'::jsonb
);

-- Row Level Security: cada usuario solo ve su propio perfil
alter table public.profiles enable row level security;

create policy "Cada usuario lee su perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Cada usuario actualiza su perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Función para crear el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que dispara la función al crear un usuario en auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Secuencia para asignar founder_number correlativamente
-- El siguiente número libre empieza en 7 (1-6 reservados/del creador)
create sequence if not exists founder_number_seq start 7;

-- Función para activar acceso Founder (la llamará el webhook de Stripe)
create or replace function public.activate_founder(user_id uuid, alias text default null)
returns integer as $$
declare
  new_number integer;
begin
  new_number := nextval('founder_number_seq');
  
  update public.profiles
  set
    access_level         = 'founder',
    founder_number       = new_number,
    founder_alias        = coalesce(alias, founder_alias),
    founder_activated_at = now()
  where id = user_id;
  
  return new_number;
end;
$$ language plpgsql security definer;

-- Vista pública del Garaje Fundador (solo datos que el usuario ha decidido mostrar)
create or replace view public.founder_garage as
  select
    founder_number,
    case display_mode
      when 'name'      then display_name
      when 'initials'  then
        case when display_name is not null
          then regexp_replace(display_name, '(\w)\w+', '\1.', 'g')
          else 'Anónimo'
        end
      when 'alias'     then coalesce(founder_alias, 'Alias')
      when 'anonymous' then 'Anónimo'
    end as label,
    display_mode,
    created_at
  from public.profiles
  where access_level in ('founder', 'full')
    and founder_number is not null
  order by founder_number asc;
