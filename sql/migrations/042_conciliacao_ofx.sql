-- 042_conciliacao_ofx.sql
-- CR-M19-D: importação manual de extrato OFX para conciliação bancária.
--
-- Idempotente.

create table if not exists public.conciliacao_ofx (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid null references public.contas_bancarias(id) on delete cascade,
  data_transacao date null,
  valor numeric(12, 2) null,
  descricao text null,
  lancamento_id uuid null references public.financeiro_lancamentos(id) on delete set null,
  conciliado boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists conciliacao_ofx_conta_idx
  on public.conciliacao_ofx (conta_id);

alter table public.conciliacao_ofx enable row level security;

drop policy if exists "conciliacao_ofx_all" on public.conciliacao_ofx;
create policy "conciliacao_ofx_all"
  on public.conciliacao_ofx
  for all
  using (true)
  with check (true);
