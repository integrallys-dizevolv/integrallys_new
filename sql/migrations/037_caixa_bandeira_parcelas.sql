-- TAREFA-076 · Bandeira e parcelamento ao registrar cartão no caixa
--
-- Quando uma movimentação de caixa é registrada com forma `cartao_debito` ou
-- `cartao_credito`, o operador agora pode informar a bandeira e (apenas para
-- crédito) o número de parcelas. Os campos são opcionais — não bloqueiam o
-- registro. `valor_parcela` é informativo (snapshot do cálculo no front),
-- não altera o `valor` registrado em caixa_movimentos.

alter table public.caixa_movimentos
  add column if not exists bandeira text null,
  add column if not exists parcelas integer null check (parcelas is null or (parcelas between 1 and 12)),
  add column if not exists valor_parcela numeric(12,2) null check (valor_parcela is null or valor_parcela >= 0);
