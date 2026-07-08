-- ============================================================================
-- Migration 065 · Fix colisão 063 × 064 em public.crm_paciente_estagios
-- ============================================================================
-- DECISÃO DO ORQUESTRADOR: 063 é canônica (schema rico, 9 colunas).
--
-- A 064_campanhas_whatsapp.sql também criou public.crm_paciente_estagios
-- (schema mínimo, 3 colunas) por desconhecer a 063 — o autor da 064 deixou
-- comentário explícito reconhecendo isso (064:5-9). Hoje funciona porque
-- 063 < 064 alfanumericamente: 063 cria a tabela com schema rico via
-- `if not exists`; a CREATE TABLE da 064 vira no-op silencioso; só o
-- ENABLE RLS + CREATE POLICY da 064 efetivamente roda.
--
-- Em qualquer ambiente onde 064 foi aplicada ANTES da 063 (rebuild de dev
-- DB fora de ordem, CI nova, ordem manual), o schema mínimo vence e a UI
-- de CRM quebra silenciosamente — `src/app/api/pacientes/route.ts:74,
-- 95-98, 378-386`, `src/features/gestao-pacientes/pacientes-view.tsx:
-- 480-481`, e `src/features/gestao-pacientes/modals/visualizar-paciente-
-- modal.tsx:27-30` dependem de observacoes/proxima_acao/data_proxima_acao/
-- responsavel_id.
--
-- Esta migration heala o caso 064-first adicionando as 4 colunas ausentes
-- com `ADD COLUMN IF NOT EXISTS` — no-op em ambientes onde 063 já tinha
-- estabelecido o schema.
--
-- ESCOPO E NÃO-ESCOPO
--   - Adiciona 4 colunas nullable (sem default não-nulo → não toca em
--     dados existentes).
--   - NÃO mexe em RLS (quem cuida disso é a 066 · Agente 01 · gap-fill,
--     que remove a policy permissiva `crm_paciente_estagios_all` deixada
--     pela 064).
--   - NÃO toca em `id` (PK divergente entre os schemas: 063 usa `id` uuid
--     com UNIQUE(paciente_id); 064 usa paciente_id como PK direto).
--     Consumer só faz lookup por paciente_id — sem `id` explícito —
--     então a divergência de PK é tolerada.
--   - NÃO copia `atualizado_em` (064) → `updated_at` (063). Se algum
--     ambiente estiver em estado 064-first com dados reais e o consumer
--     ler `updated_at`, ver §EDGE CASE abaixo.
--
-- IDEMPOTÊNCIA
--   ADD COLUMN IF NOT EXISTS é no-op se a coluna já existir → roda quantas
--   vezes for necessário sem erro.
-- ============================================================================

ALTER TABLE public.crm_paciente_estagios
  ADD COLUMN IF NOT EXISTS observacoes       text NULL,
  ADD COLUMN IF NOT EXISTS proxima_acao      text NULL,
  ADD COLUMN IF NOT EXISTS data_proxima_acao date NULL,
  ADD COLUMN IF NOT EXISTS responsavel_id    uuid NULL
    REFERENCES public.usuarios(id) ON DELETE SET NULL;


-- ============================================================================
-- EDGE CASE (não coberto por esta migration — flag para revisão futura)
-- ============================================================================
-- Se algum ambiente nasceu em estado 064-first, ele tem `atualizado_em`
-- em vez de `updated_at`, e não tem `created_at`. O consumer
-- `src/app/api/pacientes/route.ts:74` faz SELECT de `updated_at` —
-- quebraria nesse cenário.
--
-- Se descobrir esse estado em qualquer ambiente, aplicar como migration
-- 067 (não retroativamente nesta 065 — já pode ter sido aplicada):
--
--   ALTER TABLE public.crm_paciente_estagios
--     ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL
--       DEFAULT timezone('utc', now()),
--     ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL
--       DEFAULT timezone('utc', now());
--
--   DO $$
--   BEGIN
--     IF EXISTS (
--       SELECT 1 FROM information_schema.columns
--       WHERE table_schema = 'public'
--         AND table_name = 'crm_paciente_estagios'
--         AND column_name = 'atualizado_em'
--     ) THEN
--       UPDATE public.crm_paciente_estagios
--         SET updated_at = atualizado_em
--         WHERE updated_at < atualizado_em;
--     END IF;
--   END $$;


-- ============================================================================
-- DIAGNÓSTICO (rodar manualmente no Supabase Studio após aplicar)
-- ============================================================================
-- Confirma que as 4 colunas alvo existem:
--
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'crm_paciente_estagios'
--   AND column_name IN ('observacoes','proxima_acao',
--                       'data_proxima_acao','responsavel_id')
-- ORDER BY column_name;
-- Esperado: 4 linhas (todas presentes).
