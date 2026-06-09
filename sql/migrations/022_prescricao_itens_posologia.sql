-- Migration 022 — Prescrição itens: posologia por linha + wiring estoque/caixa
-- Contexto:
--   * TAREFA-023 exigia "coluna de posologia visível para recepção porém bloqueada
--     para edição". A tabela `prescricao_itens` já existe (ver 003_clinical_and_patient_portal)
--     mas sem coluna de posologia. Este campo é preenchido pelo `nova-venda-modal` da
--     recepção no momento do cadastro do produto no carrinho e exibido nas
--     visualizações (`detalhes-venda-modal`, impressão de etiquetas).
--   * TAREFA-019 exigia persistência completa do fluxo de venda. A coluna permite que
--     o POST `/api/prescricoes` grave a posologia junto com cada item, e o GET devolva
--     essa informação para as views consumirem.
--
-- Nota operacional:
--   Após esta migration, o POST `/api/prescricoes` quando `status='Convertida'`
--   passa a (a) gravar linhas em `prescricao_itens`, (b) decrementar
--   `produtos_estoque.quantidade` + registrar `movimentacoes_estoque`, (c) lançar em
--   `caixa_movimentos` uma entrada de receita quando forma de pagamento ≠ 'consumo'.
--   A etapa (c) EXIGE que haja uma `caixa_sessoes` com status='aberto' para a unidade
--   do usuário no dia — caso contrário o POST falha com 409 CAIXA_NOT_OPEN.

ALTER TABLE public.prescricao_itens
  ADD COLUMN IF NOT EXISTS posologia text NULL;
