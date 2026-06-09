-- 053_financeiro_vencimento.sql
-- TAREFA-054: adicionar coluna `vencimento` em financeiro_lancamentos
-- para suportar bloco de Inadimplência no AdminDashboard.
--
-- Idempotente.

alter table public.financeiro_lancamentos
  add column if not exists vencimento date null;

comment on column public.financeiro_lancamentos.vencimento is
  'Data de vencimento do lançamento a receber. NULL = sem prazo definido.';

create index if not exists financeiro_lancamentos_vencimento_idx
  on public.financeiro_lancamentos(vencimento)
  where vencimento is not null;
