-- 091_cartoes_conta_bancaria.sql
-- Item 9c — cartão empresarial vinculado à conta bancária que debita a fatura.
--
-- Nullable: cartões já cadastrados não têm conta vinculada, e forçar not null
-- quebraria o cadastro existente. Idempotente.

alter table public.cartoes_empresariais
  add column if not exists conta_bancaria_id uuid null references public.contas_bancarias(id) on delete set null;

create index if not exists cartoes_empresariais_conta_idx
  on public.cartoes_empresariais(conta_bancaria_id);
