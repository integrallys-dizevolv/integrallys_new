-- 078 · Preferências e identidade por usuário (tira dado pessoal da config global)

-- 1.1 colunas de identidade que faltavam em usuarios
alter table public.usuarios
  add column if not exists cpf text,
  add column if not exists crm text;

-- 1.2 tabela de preferências por usuário
create table if not exists public.usuario_preferencias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  chave text not null,
  valor text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint usuario_preferencias_usuario_chave_unique unique (usuario_id, chave)
);

create index if not exists idx_usuario_preferencias_usuario
  on public.usuario_preferencias (usuario_id);

alter table public.usuario_preferencias enable row level security;
drop policy if exists "usuario_preferencias_all" on public.usuario_preferencias;
create policy "usuario_preferencias_all" on public.usuario_preferencias
  for all using (true) with check (true);
