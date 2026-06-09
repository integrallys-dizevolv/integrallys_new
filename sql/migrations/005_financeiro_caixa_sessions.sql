-- 005_financeiro_caixa_sessions.sql
-- Complementa o backend financeiro com sessão de caixa e metadados de lançamentos

create table if not exists public.caixa_sessoes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  opened_by_id uuid null references public.usuarios(id) on delete set null,
  closed_by_id uuid null references public.usuarios(id) on delete set null,
  data_operacao date not null default current_date,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  saldo_inicial numeric(12,2) not null default 0 check (saldo_inicial >= 0),
  saldo_final numeric(12,2) null check (saldo_final is null or saldo_final >= 0),
  valor_transferido numeric(12,2) null check (valor_transferido is null or valor_transferido >= 0),
  saldo_restante numeric(12,2) null check (saldo_restante is null or saldo_restante >= 0),
  observacoes text null,
  aberto_em timestamptz not null default timezone('utc', now()),
  fechado_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint caixa_sessoes_unique_unidade_dia unique (unidade_id, data_operacao)
);

alter table public.caixa_movimentos
  add column if not exists sessao_id uuid null references public.caixa_sessoes(id) on delete set null,
  add column if not exists forma text null default 'dinheiro',
  add column if not exists origem text null default 'manual',
  add column if not exists operador_nome text null;

alter table public.financeiro_lancamentos
  add column if not exists usuario_id uuid null references public.usuarios(id) on delete set null,
  add column if not exists data_lancamento timestamptz not null default timezone('utc', now()),
  add column if not exists metodo text null,
  add column if not exists status text not null default 'Pendente',
  add column if not exists observacoes text null;

create index if not exists caixa_sessoes_data_idx on public.caixa_sessoes (data_operacao desc);
create index if not exists caixa_sessoes_status_idx on public.caixa_sessoes (status);
create index if not exists caixa_movimentos_sessao_idx on public.caixa_movimentos (sessao_id);
create index if not exists financeiro_lancamentos_data_idx on public.financeiro_lancamentos (data_lancamento desc);

drop trigger if exists caixa_sessoes_set_updated_at on public.caixa_sessoes;
create trigger caixa_sessoes_set_updated_at before update on public.caixa_sessoes for each row execute function public.set_updated_at();
