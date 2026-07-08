-- ============================================================================
-- Migration 071 · Normalizar crm_paciente_estagios ao schema canônico (063)
-- ============================================================================
-- Este banco nasceu em estado "064-first": a 064 criou a tabela com schema
-- mínimo (paciente_id como PK, coluna `atualizado_em`) e o `create table if
-- not exists` da 063 virou no-op. Resultado (confirmado no audit):
--   - FALTA a coluna `id` (PK canônica da 063).
--   - Coluna `atualizado_em` MORTA — duplica `updated_at`, nada a mantém.
--   - SEM trigger de updated_at (as outras 28 tabelas têm).
-- As 2 FKs já estão corretas (paciente_id→pacientes CASCADE,
-- responsavel_id→usuarios SET NULL), então só alinhamos PK/colunas/trigger.
--
-- A UNIQUE(paciente_id) é preservada como alvo do upsert onConflict usado em
-- src/app/api/pacientes/route.ts (não pode sumir junto com a PK antiga).
--
-- IDEMPOTÊNCIA: cada passo é guardado por IF [NOT] EXISTS. Transacional:
-- se algo falhar, rollback total.
-- ============================================================================

BEGIN;

-- 1) Adicionar a PK canônica `id` (preenche as linhas existentes via default).
ALTER TABLE public.crm_paciente_estagios
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

-- 2) Mover a PRIMARY KEY de paciente_id → id.
ALTER TABLE public.crm_paciente_estagios DROP CONSTRAINT IF EXISTS crm_paciente_estagios_pkey;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.crm_paciente_estagios'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.crm_paciente_estagios
      ADD CONSTRAINT crm_paciente_estagios_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- 3) Garantir UNIQUE(paciente_id) — "um estágio por paciente" + alvo do upsert.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.crm_paciente_estagios'::regclass
      AND contype = 'u'
      AND conname = 'crm_paciente_estagios_paciente_id_key'
  ) THEN
    ALTER TABLE public.crm_paciente_estagios
      ADD CONSTRAINT crm_paciente_estagios_paciente_id_key UNIQUE (paciente_id);
  END IF;
END $$;

-- 4) Remover a coluna morta `atualizado_em` (updated_at já tem o valor —
--    a 066 fez o backfill `updated_at = atualizado_em`).
ALTER TABLE public.crm_paciente_estagios DROP COLUMN IF EXISTS atualizado_em;

-- 5) Trigger canônico de updated_at (igual às demais tabelas).
DROP TRIGGER IF EXISTS crm_paciente_estagios_set_updated_at ON public.crm_paciente_estagios;
CREATE TRIGGER crm_paciente_estagios_set_updated_at
  BEFORE UPDATE ON public.crm_paciente_estagios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- VERIFICAÇÃO (esperado: 9 colunas COM `id`, SEM `atualizado_em`):
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='crm_paciente_estagios'
-- order by ordinal_position;
