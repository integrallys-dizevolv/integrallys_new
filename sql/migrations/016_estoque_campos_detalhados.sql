-- 016_estoque_campos_detalhados.sql
-- Adiciona campos financeiros e de rastreabilidade ao estoque.
-- Idempotente: usa ADD COLUMN IF NOT EXISTS.

alter table public.produtos_estoque
  add column if not exists lote text null;

alter table public.produtos_estoque
  add column if not exists validade date null;

alter table public.produtos_estoque
  add column if not exists preco_custo numeric(10,2) null;

alter table public.produtos_estoque
  add column if not exists preco_venda numeric(10,2) null;
