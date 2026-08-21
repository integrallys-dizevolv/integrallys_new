-- 095_centros_custo.sql
-- Cláusula 3 · Módulo 4: filtro por centro de custo no financeiro/DRE.

create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade_id uuid null references public.unidades(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists centros_custo_unidade_idx on public.centros_custo (unidade_id);
create index if not exists centros_custo_ativo_idx on public.centros_custo (ativo);

alter table public.financeiro_lancamentos
  add column if not exists centro_custo_id uuid null references public.centros_custo(id) on delete set null;

create index if not exists financeiro_lancamentos_centro_custo_idx
  on public.financeiro_lancamentos (centro_custo_id);

comment on table public.centros_custo is
  'Centros de custo para filtro gerencial no DRE e lançamentos financeiros.';

comment on column public.financeiro_lancamentos.centro_custo_id is
  'Centro de custo opcional do lançamento (independente de categoria_dre).';

drop trigger if exists centros_custo_set_updated_at on public.centros_custo;
create trigger centros_custo_set_updated_at
  before update on public.centros_custo
  for each row execute function public.set_updated_at();
