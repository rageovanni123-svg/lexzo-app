-- Arquivar restaurante: continua guardado no banco (e no painel, em "Arquivados"),
-- mas não aparece no mapa, na página pública nem no sitemap. Seguro rodar mais de uma vez.
alter table public.restaurants add column if not exists archived boolean not null default false;
