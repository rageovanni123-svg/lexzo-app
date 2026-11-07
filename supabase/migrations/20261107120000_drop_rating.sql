-- O app não usa mais nota/avaliação. Remove a coluna (seguro rodar mais de uma vez).
alter table public.restaurants drop constraint if exists restaurants_rating_check;
alter table public.restaurants drop column if exists rating;
