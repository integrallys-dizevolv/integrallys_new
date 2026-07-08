-- 061_movimentacoes_estoque_unidade.sql
-- Adiciona unidade_id à tabela movimentacoes_estoque para rastreio e
-- agregação por unidade. Backfill deriva do produto correspondente.
--
-- Numeração: gap 059 já é convenção do projeto (mantido).
-- RLS: a tabela já foi coberta pela migration 060_rls_all_tables.sql.

ALTER TABLE public.movimentacoes_estoque
  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mov_estoque_unidade_id
  ON public.movimentacoes_estoque (unidade_id);

-- Backfill: deriva unidade_id do produto. Movimentações órfãs (produto deletado
-- ou produto sem unidade) ficam com NULL — comportamento aceitável e sinaliza
-- dado a corrigir manualmente quando aplicável.
UPDATE public.movimentacoes_estoque me
SET unidade_id = pe.unidade_id
FROM public.produtos_estoque pe
WHERE me.produto_id = pe.id
  AND me.unidade_id IS NULL
  AND pe.unidade_id IS NOT NULL;

-- DIAGNÓSTICO (rodar manualmente após aplicar para conferir cobertura):
-- SELECT COUNT(*) FILTER (WHERE unidade_id IS NULL) AS sem_unidade,
--        COUNT(*) FILTER (WHERE unidade_id IS NOT NULL) AS com_unidade
-- FROM public.movimentacoes_estoque;
