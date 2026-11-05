-- ============================================================================
-- Schema completo e limpo: restaurantes + administradores.
-- Substitui as 20 migrations anteriores (pensado para um projeto Supabase novo).
-- Para limpar um banco que já existe, use supabase/optional/cleanup_existing_db.sql
-- ============================================================================

-- ─── Administradores ────────────────────────────────────────────────────────
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Cada usuário só enxerga o próprio papel. Ninguém escreve por aqui:
-- papéis são concedidos pelo dono do projeto (SQL editor / service role).
create policy "Users can view own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

-- SECURITY INVOKER: respeita o RLS acima. O teste "_user_id = auth.uid()" impede
-- consultar o papel de outra pessoa. anon não tem permissão de executar.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select _user_id = auth.uid()
    and exists (
      select 1 from public.user_roles
      where user_id = _user_id and role = _role
    );
$$;

revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.has_role(uuid, public.app_role) from anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- ─── Restaurantes ───────────────────────────────────────────────────────────
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  neighborhood text not null,
  price text not null default '$$',
  delivery boolean not null default false,
  rating numeric(2,1) not null default 0,
  image text,
  lat double precision not null,
  lng double precision not null,
  phone text,
  whatsapp text,
  ifood_url text,
  menu_url text,
  instagram text,
  address text,
  hours_weekdays text,
  hours_weekends text,
  gallery text[] not null default '{}'::text[],
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint restaurants_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint restaurants_price_check check (price in ('$', '$$', '$$$')),
  constraint restaurants_rating_check check (rating between 0 and 5)
);

alter table public.restaurants enable row level security;

-- Qualquer visitante lê; só admin escreve.
create policy "Public read restaurants"
  on public.restaurants for select
  using (true);

create policy "Admins insert restaurants"
  on public.restaurants for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins update restaurants"
  on public.restaurants for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete restaurants"
  on public.restaurants for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();
