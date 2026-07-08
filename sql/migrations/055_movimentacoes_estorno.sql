-- 055_movimentacoes_estorno.sql
-- TAREFA-EST-05: campos para estorno de movimentações de estoque
-- e link para a movimentação de compensação criada.
--
-- Idempotente.

alter table public.movimentacoes_estoque
  add column if not exists estornada boolean not null default false,
  add column if not exists estorno_motivo text null,
  add column if not exists estornada_em timestamptz null,
  add column if not exists estorno_por uuid null references public.usuarios(id) on delete set null,
  add column if not exists movimentacao_origem_id uuid null
    references public.movimentacoes_estoque(id) on delete set null;

comment on column public.movimentacoes_estoque.movimentacao_origem_id is
  'Se preenchido, esta movimentação é uma compensação (estorno) da movimentação referenciada.';

create index if not exists movimentacoes_estoque_origem_idx
  on public.movimentacoes_estoque(movimentacao_origem_id)
  where movimentacao_origem_id is not null;
