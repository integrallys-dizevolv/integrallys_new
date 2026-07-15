-- 090_financeiro_caixa_formas.sql
-- Item 9b — liga Financeiro e Caixa ao catálogo de formas + conta bancária.
--
-- ADITIVO e não-destrutivo (regra de segurança do item 9): NÃO toca em
-- financeiro_lancamentos.metodo nem em caixa_movimentos.forma — as colunas de
-- texto livre permanecem lado a lado com as novas. Sem backfill: linhas antigas
-- ficam com forma_pagamento_id = null e continuam exibindo o texto livre.
--
-- parcelas/parcela_atual espelham o padrão de cartao_movimentos (052).
-- Idempotente.

alter table public.financeiro_lancamentos
  add column if not exists forma_pagamento_id uuid null references public.formas_pagamento(id) on delete set null,
  add column if not exists conta_bancaria_id uuid null references public.contas_bancarias(id) on delete set null,
  add column if not exists beneficiario text null,
  add column if not exists parcelas integer not null default 1,
  add column if not exists parcela_atual integer not null default 1;

alter table public.caixa_movimentos
  add column if not exists forma_pagamento_id uuid null references public.formas_pagamento(id) on delete set null;

create index if not exists financeiro_lancamentos_conta_idx
  on public.financeiro_lancamentos(conta_bancaria_id);
