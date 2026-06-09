-- 001_base_dev_seed.sql
-- Seed mínimo de desenvolvimento sem dados de negócio mockados.

insert into public.unidades (nome, cidade, status)
values ('Unidade Principal', 'São Paulo', 'Ativa')
on conflict do nothing;

insert into public.configuracoes (categoria, chave, valor)
values
  ('app', 'nome', 'Integrallys'),
  ('app', 'timezone', 'America/Sao_Paulo'),
  ('agenda', 'slot_padrao_minutos', '30'),
  ('financeiro', 'moeda', 'BRL')
on conflict (categoria, chave) do nothing;
