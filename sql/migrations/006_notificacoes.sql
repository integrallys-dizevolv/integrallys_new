do $$
begin
  if not exists (select 1 from pg_type where typname = 'notificacao_kind') then
    create type public.notificacao_kind as enum ('agenda', 'financeiro', 'lista_espera', 'pagamento', 'prescricao');
  end if;
end $$;

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text not null,
  descricao text not null,
  href text not null,
  kind public.notificacao_kind not null,
  lida boolean not null default false,
  lida_em timestamptz null,
  ocorrido_em timestamptz not null default timezone('utc', now()),
  source_key text not null,
  source_table text null,
  source_id uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notificacoes_usuario_source_unique unique (usuario_id, source_key)
);

create index if not exists notificacoes_usuario_idx on public.notificacoes (usuario_id);
create index if not exists notificacoes_usuario_lida_idx on public.notificacoes (usuario_id, lida);
create index if not exists notificacoes_ocorrido_em_idx on public.notificacoes (ocorrido_em desc);

drop trigger if exists notificacoes_set_updated_at on public.notificacoes;
create trigger notificacoes_set_updated_at
before update on public.notificacoes
for each row execute function public.set_updated_at();
