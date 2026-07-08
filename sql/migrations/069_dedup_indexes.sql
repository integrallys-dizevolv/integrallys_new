-- ============================================================================
-- Migration 069 · Remover índices duplicados (redundância de 2 ondas de migr.)
-- ============================================================================
-- O projeto teve duas convenções de nome de índice (`_profissional` e
-- `_profissional_id`, `_unidade` e `_unidade_id`, etc.), gerando pares de
-- índices IDÊNTICOS (mesmas colunas, não-parciais) na mesma tabela. Cada par
-- duplicado dobra o custo de escrita e ocupa storage à toa.
--
-- Em cada par, MANTEMOS o índice que sustenta PK/UNIQUE ou que segue a
-- convenção `_id`, e dropamos o redundante. Verificado via pg_get_indexdef
-- que nenhum dos dropados é PARCIAL (sem cláusula WHERE) — são realmente
-- equivalentes ao mantido. Índices parciais (compromisso_pessoal, portal,
-- vencimento, nf, origem) foram preservados — não são duplicados.
--
-- IDEMPOTÊNCIA: DROP INDEX IF EXISTS é no-op se já não existir.
-- REVERSÍVEL: basta recriar o índice pela definição original.
-- ============================================================================

DROP INDEX IF EXISTS public.idx_agendamentos_unidade;            -- == idx_agendamentos_unidade_id
DROP INDEX IF EXISTS public.idx_anamneses_paciente;              -- == idx_anamneses_paciente_id
DROP INDEX IF EXISTS public.idx_anamneses_profissional;          -- == idx_anamneses_profissional_id
DROP INDEX IF EXISTS public.clinica_config_unidade_idx;          -- == clinica_config_unidade_id_key (UNIQUE)
DROP INDEX IF EXISTS public.crm_paciente_estagios_estagio_idx;   -- == idx_crm_estagios_estagio
DROP INDEX IF EXISTS public.idx_crm_estagios_paciente;           -- == crm_paciente_estagios_pkey/unique(paciente_id)
DROP INDEX IF EXISTS public.idx_evolucoes_profissional;          -- == idx_evolucoes_profissional_id
DROP INDEX IF EXISTS public.idx_financeiro_unidade;              -- == idx_financeiro_unidade_id
DROP INDEX IF EXISTS public.idx_movimentacoes_produto;           -- == idx_movimentacoes_produto_id
DROP INDEX IF EXISTS public.idx_prescricao_itens_prescricao;     -- == idx_prescricao_itens_prescricao_id
DROP INDEX IF EXISTS public.idx_prescricoes_profissional;        -- == idx_prescricoes_profissional_id

-- VERIFICAÇÃO (esperado: zero pares duplicados em public):
-- select indrelid::regclass::text, count(*) from pg_index i
-- join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace
-- where n.nspname='public' group by indrelid, indkey having count(*)>1;
