-- Migration 021 — Prescrições: desconto manual + justificativa + vendedor
-- Contexto:
--   * TAREFA-CR01 (Desconto Manual no Fechamento de Venda): requisitos exigem
--     persistir percentual/valor do desconto aplicado na finalização da venda e
--     registrar justificativa livre (ex: "Convênio Sindicato Água Boa").
--   * TAREFA-019 (Nova Prescrição/Venda avulsa): o checklist pede persistir o
--     vendedor responsável pela venda (especialista, recepcionista ou parceiro).
--
-- Schema atual (ver sql/integrallys_full_schema.sql) já tem `profissional_id`
-- (quem criou a prescrição no sistema). `vendedor_id` é distinto — é o
-- profissional escolhido no form como responsável pela venda, que pode diferir
-- de quem está logado (ex: recepção finaliza venda de prescrição criada pelo
-- especialista).
--
-- Colunas adicionadas:
--   valor_bruto             — subtotal antes de qualquer desconto (auditoria)
--   desconto_tipo           — 'value' (R$) ou 'percent' (%)
--   desconto_percentual     — preenchido quando desconto_tipo='percent'
--   desconto_valor          — valor absoluto do desconto em R$ (sempre calculado)
--   justificativa_desconto  — texto livre, obrigatório via UI quando há desconto
--   vendedor_id             — FK opcional para usuarios(id)
--
-- Regra de leitura:
--   Valor Líquido efetivo = valor_total (já persistido pós-desconto)
--   Valor Bruto           = valor_bruto (novo)
--   Desconto efetivo      = valor_bruto - valor_total (ou desconto_valor)

ALTER TABLE public.prescricoes
  ADD COLUMN IF NOT EXISTS valor_bruto numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS desconto_tipo text NULL
    CHECK (desconto_tipo IS NULL OR desconto_tipo IN ('value', 'percent')),
  ADD COLUMN IF NOT EXISTS desconto_percentual numeric(5,2) NULL
    CHECK (desconto_percentual IS NULL OR (desconto_percentual >= 0 AND desconto_percentual <= 100)),
  ADD COLUMN IF NOT EXISTS desconto_valor numeric(12,2) NULL
    CHECK (desconto_valor IS NULL OR desconto_valor >= 0),
  ADD COLUMN IF NOT EXISTS justificativa_desconto text NULL,
  ADD COLUMN IF NOT EXISTS vendedor_id uuid NULL
    REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS prescricoes_vendedor_idx ON public.prescricoes (vendedor_id);
