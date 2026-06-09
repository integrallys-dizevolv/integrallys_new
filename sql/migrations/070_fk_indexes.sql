-- ============================================================================
-- Migration 070 · Índices nas colunas de FK que não tinham índice
-- ============================================================================
-- O audit encontrou 7 colunas com FOREIGN KEY sem índice de suporte. Sem
-- índice, joins por essas colunas e checagens de ON DELETE/ON UPDATE fazem
-- sequential scan — irrelevante hoje (poucas linhas), mas vira lentidão
-- conforme as tabelas crescem (audit_log e movimentacoes_estoque são as que
-- mais crescem).
--
-- IDEMPOTÊNCIA: CREATE INDEX IF NOT EXISTS é no-op se já existir.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_user_id        ON public.audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_unidade_id           ON public.audit_log(unidade_id);
CREATE INDEX IF NOT EXISTS idx_cartao_movimentos_operador_id  ON public.cartao_movimentos(operador_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessoes_paciente_id    ON public.chatbot_sessoes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_crm_estagios_responsavel_id    ON public.crm_paciente_estagios(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_estorno_por        ON public.movimentacoes_estoque(estorno_por);
CREATE INDEX IF NOT EXISTS idx_pagamentos_online_lancamento_id ON public.pagamentos_online(lancamento_id);

-- VERIFICAÇÃO (esperado: zero FKs sem índice em public):
-- select c.conrelid::regclass, a.attname from pg_constraint c
-- join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
-- where c.contype='f' and c.connamespace='public'::regnamespace
--   and not exists (select 1 from pg_index i where i.indrelid=c.conrelid and i.indkey[0]=c.conkey[1]);
