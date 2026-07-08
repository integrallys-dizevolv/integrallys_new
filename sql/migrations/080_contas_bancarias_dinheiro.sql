-- 080_contas_bancarias_dinheiro.sql
-- Suporta conta/caixa do tipo 'dinheiro' (cofre, caixa recepção): sem
-- banco/agência/conta, só nome + saldo inicial — para dar baixa/sangria sabendo
-- a natureza do valor (dinheiro vs conta corrente).
--
-- banco/agencia/conta JÁ são nullable desde a 041 (text null) — nada a relaxar.
-- Esta migration apenas amplia o CHECK de contas_bancarias.tipo.
--
-- Idempotente: drop constraint if exists + add constraint com a lista completa.

begin;

alter table public.contas_bancarias
  drop constraint if exists contas_bancarias_tipo_check;

alter table public.contas_bancarias
  add constraint contas_bancarias_tipo_check
  check (tipo in ('corrente', 'poupanca', 'investimento', 'dinheiro'));

commit;

-- VERIFICAÇÃO:
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint where conname = 'contas_bancarias_tipo_check';
