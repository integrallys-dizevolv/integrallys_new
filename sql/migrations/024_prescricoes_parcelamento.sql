-- Migration 024 — Prescrições: parcelamento de cartão de crédito
-- Contexto:
--   * TAREFA-CR-M05-A exige que, quando a forma de pagamento for "Cartão de
--     Crédito", a venda permita configurar número de parcelas (1 a 12) e o
--     sistema exiba o valor de cada parcela.
--   * Configuração de taxas por parcelamento é persistida na tabela existente
--     `public.configuracoes` (categoria='pagamento', chave='pagamento.card_fees',
--     valor=JSON com {"1":0,"2":3.5,...,"12":15}). Não exige schema novo.
--
-- Colunas adicionadas em `prescricoes`:
--   numero_parcelas  — 1..12; NULL quando forma de pagamento ≠ cartão de crédito
--   valor_parcela    — valor_total / numero_parcelas (persistido pra evitar
--                      recálculo em relatórios financeiros)

ALTER TABLE public.prescricoes
  ADD COLUMN IF NOT EXISTS numero_parcelas int NULL
    CHECK (numero_parcelas IS NULL OR (numero_parcelas BETWEEN 1 AND 12)),
  ADD COLUMN IF NOT EXISTS valor_parcela numeric(12,2) NULL
    CHECK (valor_parcela IS NULL OR valor_parcela >= 0);
