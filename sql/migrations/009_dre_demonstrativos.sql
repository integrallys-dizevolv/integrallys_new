do $$
begin
  if not exists (select 1 from pg_type where typname = 'dre_periodo_tipo') then
    create type public.dre_periodo_tipo as enum ('mensal', 'trimestral', 'anual');
  end if;
end $$;

create table if not exists public.dre_demonstrativos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  gerado_por_id uuid null references public.usuarios(id) on delete set null,
  periodo_tipo public.dre_periodo_tipo not null,
  referencia date not null,
  visao text not null default 'gerencial',
  titulo text not null,
  resumo jsonb not null default '{}'::jsonb,
  itens jsonb not null default '[]'::jsonb,
  filtros jsonb not null default '{}'::jsonb,
  gerado_em timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists dre_demonstrativos_global_unique_idx
  on public.dre_demonstrativos (periodo_tipo, referencia, visao)
  where unidade_id is null;

create unique index if not exists dre_demonstrativos_unidade_unique_idx
  on public.dre_demonstrativos (unidade_id, periodo_tipo, referencia, visao)
  where unidade_id is not null;

create index if not exists dre_demonstrativos_referencia_idx
  on public.dre_demonstrativos (referencia desc);

drop trigger if exists dre_demonstrativos_set_updated_at on public.dre_demonstrativos;
create trigger dre_demonstrativos_set_updated_at
before update on public.dre_demonstrativos
for each row execute function public.set_updated_at();
