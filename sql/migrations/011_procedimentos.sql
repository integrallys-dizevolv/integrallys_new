create table if not exists public.procedimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text null,
  descricao text null,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint procedimentos_nome_unique unique (nome)
);

drop trigger if exists procedimentos_set_updated_at on public.procedimentos;
create trigger procedimentos_set_updated_at
before update on public.procedimentos
for each row execute function public.set_updated_at();
