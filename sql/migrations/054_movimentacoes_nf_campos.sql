-- 054_movimentacoes_nf_campos.sql
-- TAREFA-EST-01: campos estruturados de NF para detecção de duplicata
-- na importação de XML de compra (substitui concatenação em `observacoes`).
--
-- Idempotente.

alter table public.movimentacoes_estoque
  add column if not exists numero_nf text null,
  add column if not exists cnpj_emitente text null;

create index if not exists movimentacoes_estoque_nf_idx
  on public.movimentacoes_estoque(numero_nf, cnpj_emitente)
  where numero_nf is not null;
