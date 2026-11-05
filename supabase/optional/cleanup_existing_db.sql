-- ============================================================================
-- OPCIONAL — só para o banco que JÁ EXISTE (Lovable Cloud / Supabase atual).
-- Rode manualmente no SQL Editor. NÃO fica na pasta migrations de propósito.
--
-- O que faz:
--   * APAGA as tabelas analytics_events e restaurants_osm (dados perdidos)
--   * APAGA as colunas featured, gallery_blur e review_status de restaurants
--   * cria a coluna slug (preenchida a partir do nome) com índice único
--   * recria as políticas de segurança (RLS) e a função has_role de forma limpa
--
-- Faça um backup antes (Dashboard > Database > Backups) — é destrutivo.
-- Está dentro de uma transação: se algo falhar, nada é aplicado.
-- ============================================================================
begin;

drop table if exists public.analytics_events;
drop table if exists public.restaurants_osm;

alter table public.restaurants
  drop column if exists featured,
  drop column if exists gallery_blur,
  drop column if exists review_status;

-- slug ------------------------------------------------------------------------
alter table public.restaurants add column if not exists slug text;

with base as (
  select
    id,
    created_at,
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(
          translate(lower(name), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
          '[^a-z0-9]+', '-', 'g'
        )),
        ''
      ),
      'restaurante'
    ) as b
  from public.restaurants
  where slug is null
),
numbered as (
  select id, b, row_number() over (partition by b order by created_at, id) as rn
  from base
)
update public.restaurants r
set slug = case when n.rn = 1 then n.b else n.b || '-' || n.rn end
from numbered n
where r.id = n.id;

alter table public.restaurants alter column slug set not null;
alter table public.restaurants add constraint restaurants_slug_key unique (slug);
alter table public.restaurants
  add constraint restaurants_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- has_role + políticas ---------------------------------------------------------
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

do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('restaurants', 'user_roles')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "Users can view own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

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

commit;

-- Depois de conferir que todos os restaurantes têm localização, se quiser,
-- exija lat/lng como no schema novo:
--   alter table public.restaurants alter column lat set not null, alter column lng set not null;
