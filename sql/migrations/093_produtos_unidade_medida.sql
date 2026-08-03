-- 093_produtos_unidade_medida.sql
-- Item 14 — unidade de medida do produto (ex.: "unidade", "caixa", "litro", "ml",
-- "kg"). Texto livre por enquanto; fechar as opções em enum é decisão de produto
-- separada e não bloqueia isto.
--
-- NULLABLE, idempotente.

alter table public.produtos_estoque
  add column if not exists unidade_medida text null;
