-- Dias da semana em que o lugar fica fechado o dia todo (0 = domingo ... 6 = sábado).
alter table public.restaurants
  add column if not exists closed_days smallint[] not null default '{}';

alter table public.restaurants
  drop constraint if exists restaurants_closed_days_valid;
alter table public.restaurants
  add constraint restaurants_closed_days_valid
  check (closed_days <@ array[0,1,2,3,4,5,6]::smallint[]);
