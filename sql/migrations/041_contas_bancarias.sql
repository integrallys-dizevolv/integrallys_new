-- 041_contas_bancarias.sql
-- CR-M19-B: tela separada de gestão bancária / contas.
--
-- Idempotente.

create table if not exists public.contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  nome text not null,
  banco text null,
  agencia text null,
  conta text null,
  tipo text not null default 'corrente',
  saldo_inicial numeric(12, 2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint contas_bancarias_tipo_check
    check (tipo in ('corrente', 'poupanca', 'investimento'))
);

create index if not exists contas_bancarias_unidade_idx
  on public.contas_bancarias (unidade_id);

alter table public.contas_bancarias enable row level security;

drop policy if exists "contas_bancarias_all" on public.contas_bancarias;
create policy "contas_bancarias_all"
  on public.contas_bancarias
  for all
  using (true)
  with check (true);
