-- Troca a faixa de preço ($, $$, $$$) por "preço a partir de" (R$), opcional.
-- price_from NULL = o restaurante não mostra preço. Seguro para rodar mais de uma vez.
alter table public.restaurants
  add column if not exists price_from numeric(8,2);

alter table public.restaurants
  drop constraint if exists restaurants_price_from_check;
alter table public.restaurants
  add constraint restaurants_price_from_check check (price_from is null or price_from >= 0);

alter table public.restaurants drop constraint if exists restaurants_price_check;
alter table public.restaurants drop column if exists price;
