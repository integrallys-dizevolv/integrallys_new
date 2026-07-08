-- 047_estoque_tipo_movimentacao.sql
-- Adiciona o discriminador `tipo_movimentacao` em movimentacoes_estoque para
-- permitir distinguir saídas avulsas (vinculadas ou não a clientes) de
-- consumo interno da clínica (uso administrativo, descarte, atendimento sem
-- prescrição). O campo `tipo` (entrada/saida) continua sendo a fonte de
-- verdade para impacto no saldo — o novo campo é apenas semântico para
-- relatórios e segregação no fluxo de gestão.
--
-- Idempotente: pode ser rodada em transação normal.

alter table public.movimentacoes_estoque
  add column if not exists tipo_movimentacao text not null default 'saida'
    check (tipo_movimentacao in ('saida', 'consumo_interno', 'entrada'));

create index if not exists movimentacoes_estoque_tipo_idx
  on public.movimentacoes_estoque (tipo_movimentacao);
