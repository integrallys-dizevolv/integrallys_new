-- TAREFA-CR-REV-A · Resumo de fechamento de caixa
--
-- Persiste o snapshot completo do resumo (entradas/saídas, breakdown por forma
-- de pagamento, saldo final, valor transferido ao cofre, saldo restante) no
-- momento do fechamento. As colunas operacionais `valor_transferido` e
-- `saldo_restante` continuam sendo populadas (uso direto em queries), mas o
-- JSONB carrega o snapshot exato exibido na tela de resumo, para reimpressão
-- e auditoria histórica.

alter table public.caixa_sessoes
  add column if not exists resumo_fechamento jsonb null;
