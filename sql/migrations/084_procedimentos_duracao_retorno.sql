-- 084_procedimentos_duracao_retorno.sql
-- Item 8 — Procedimentos: duração e bloco de retorno.
--
-- A coluna `valor numeric(12,2)` JÁ existe na tabela (adicionada anteriormente),
-- então aqui acrescentamos apenas a duração e os campos de retorno.
--
-- Nota de numeração: 084 segue a ordem de CRIAÇÃO das migrations — o item 8 foi
-- entregue antes do item 7; as migrations do item 7 usarão 085+.
--
-- Idempotente: pode ser re-executada sem efeito colateral.

alter table public.procedimentos
  add column if not exists duracao_min        integer null,
  add column if not exists tem_retorno        boolean not null default false,
  add column if not exists prazo_retorno_dias integer null,
  add column if not exists valor_retorno      numeric(12,2) null;

-- Coerência: prazo e valor de retorno só fazem sentido quando tem_retorno = true.
-- (drop+add porque o Postgres não tem `add constraint if not exists`.)
-- As colunas novas nascem com tem_retorno=false e prazo/valor NULL, então as
-- linhas existentes satisfazem o check no momento da criação.
alter table public.procedimentos
  drop constraint if exists procedimentos_retorno_coerente;
alter table public.procedimentos
  add constraint procedimentos_retorno_coerente check (
    tem_retorno = true
    or (prazo_retorno_dias is null and valor_retorno is null)
  );
