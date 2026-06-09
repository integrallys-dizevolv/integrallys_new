-- 052_cartoes_empresariais.sql
-- TAREFA-046: Cartão Empresarial — cartões corporativos da clínica
-- + movimentos (compras / faturas) por cartão.
--
-- Idempotente.

create table if not exists public.cartoes_empresariais (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  nome text not null,
  bandeira text null,
  ultimos_digitos text null,
  limite_total numeric(12,2) not null default 0,
  dia_vencimento integer null,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cartao_movimentos (
  id uuid primary key default gen_random_uuid(),
  cartao_id uuid not null references public.cartoes_empresariais(id) on delete cascade,
  descricao text not null,
  valor numeric(12,2) not null,
  parcelas integer not null default 1,
  parcela_atual integer not null default 1,
  data_compra date not null,
  data_vencimento date null,
  beneficiario text null,
  categoria text null,
  operador_id uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cartoes_empresariais_unidade_idx on public.cartoes_empresariais(unidade_id);
create index if not exists cartao_movimentos_cartao_idx on public.cartao_movimentos(cartao_id);
create index if not exists cartao_movimentos_data_idx on public.cartao_movimentos(data_compra);

alter table public.cartoes_empresariais enable row level security;
alter table public.cartao_movimentos enable row level security;

drop policy if exists "cartoes_empresariais_all" on public.cartoes_empresariais;
create policy "cartoes_empresariais_all" on public.cartoes_empresariais for all using (true) with check (true);

drop policy if exists "cartao_movimentos_all" on public.cartao_movimentos;
create policy "cartao_movimentos_all" on public.cartao_movimentos for all using (true) with check (true);
