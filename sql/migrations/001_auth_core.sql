-- 001_auth_core.sql
-- Auth, enums base, recursos e permissões centrais

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('master','admin','gestor','recepcao','especialista','paciente');
  end if;
  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type public.user_status as enum ('Ativo','Inativo','Bloqueado');
  end if;
  if not exists (select 1 from pg_type where typname = 'permission_effect') then
    create type public.permission_effect as enum ('allow','deny');
  end if;
  if not exists (select 1 from pg_type where typname = 'unidade_status') then
    create type public.unidade_status as enum ('Ativa','Inativa','Em Manutenção');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text null,
  endereco text null,
  cidade text not null,
  gestor_nome text null,
  status public.unidade_status not null default 'Ativa',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  nome text not null,
  email citext not null unique,
  senha_hash text not null,
  perfil public.user_role not null,
  status public.user_status not null default 'Ativo',
  avatar_url text null,
  telefone text null,
  ultimo_login_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recursos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.perfil_permissoes (
  id uuid primary key default gen_random_uuid(),
  perfil public.user_role not null,
  recurso_id uuid not null references public.recursos(id) on delete cascade,
  acao text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint perfil_permissoes_unique unique (perfil, recurso_id, acao)
);

create table if not exists public.usuario_permissoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  recurso_id uuid not null references public.recursos(id) on delete cascade,
  acao text not null,
  efeito public.permission_effect not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint usuario_permissoes_unique unique (usuario_id, recurso_id, acao)
);

create index if not exists usuarios_unidade_idx on public.usuarios (unidade_id);
create index if not exists usuarios_perfil_idx on public.usuarios (perfil);
create index if not exists usuarios_status_idx on public.usuarios (status);
create index if not exists perfil_permissoes_perfil_idx on public.perfil_permissoes (perfil);
create index if not exists usuario_permissoes_usuario_idx on public.usuario_permissoes (usuario_id);

drop trigger if exists unidades_set_updated_at on public.unidades;
create trigger unidades_set_updated_at before update on public.unidades for each row execute function public.set_updated_at();
drop trigger if exists usuarios_set_updated_at on public.usuarios;
create trigger usuarios_set_updated_at before update on public.usuarios for each row execute function public.set_updated_at();

insert into public.recursos (codigo, descricao)
values
  ('dashboard', 'Dashboard principal'),
  ('agenda', 'Agenda'),
  ('pacientes', 'Pacientes'),
  ('anamnese', 'Anamnese'),
  ('prontuarios', 'Prontuários'),
  ('evolucoes', 'Evoluções'),
  ('documentacao', 'Documentação clínica'),
  ('prescricoes', 'Prescrições'),
  ('estoque', 'Estoque'),
  ('lista-espera', 'Lista de espera'),
  ('caixa', 'Caixa'),
  ('financeiro', 'Financeiro'),
  ('repasse', 'Repasse'),
  ('relatorios', 'Relatórios'),
  ('auditoria', 'Auditoria'),
  ('usuarios', 'Usuários'),
  ('permissoes', 'Permissões'),
  ('unidades', 'Unidades'),
  ('configuracoes', 'Configurações'),
  ('tarefas', 'Tarefas'),
  ('portal.dashboard', 'Portal do paciente'),
  ('portal.historico', 'Histórico do paciente'),
  ('portal.agendamentos', 'Agendamentos do paciente'),
  ('portal.cartoes', 'Cartões do paciente'),
  ('portal.pagamentos', 'Pagamentos do paciente')
on conflict (codigo) do nothing;

create or replace view public.vw_auth_login as
select
  u.id,
  u.nome,
  lower(u.email::text) as email,
  u.senha_hash,
  u.perfil,
  u.status,
  u.avatar_url
from public.usuarios u;

create or replace function public.touch_ultimo_login(p_usuario_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.usuarios
  set ultimo_login_em = timezone('utc', now())
  where id = p_usuario_id;
$$;

create or replace function public.get_user_permissions(p_usuario_id uuid)
returns table (resource text, actions text[])
language sql
security definer
set search_path = public
as $$
  with base_user as (
    select id, perfil from public.usuarios where id = p_usuario_id and status = 'Ativo'
  ),
  role_allows as (
    select r.codigo as resource, pp.acao, 'allow'::public.permission_effect as efeito
    from base_user bu
    join public.perfil_permissoes pp on pp.perfil = bu.perfil
    join public.recursos r on r.id = pp.recurso_id
  ),
  user_overrides as (
    select r.codigo as resource, up.acao, up.efeito
    from public.usuario_permissoes up
    join public.recursos r on r.id = up.recurso_id
    where up.usuario_id = p_usuario_id
  ),
  combined as (
    select * from role_allows
    union all
    select * from user_overrides
  ),
  resolved as (
    select resource, acao,
      case
        when bool_or(efeito = 'deny') then false
        when bool_or(efeito = 'allow') then true
        else false
      end as permitido
    from combined
    group by resource, acao
  )
  select resource, array_agg(acao order by acao) as actions
  from resolved
  where permitido = true
  group by resource
  order by resource;
$$;

create or replace function public.can_user(p_usuario_id uuid, p_resource text, p_action text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.get_user_permissions(p_usuario_id) gp
    where gp.resource = p_resource
      and p_action = any(gp.actions)
  );
$$;

create or replace function public.get_auth_me_payload(p_usuario_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user',
    jsonb_build_object(
      'id', u.id,
      'name', u.nome,
      'email', lower(u.email::text),
      'role', u.perfil,
      'avatarUrl', u.avatar_url
    ),
    'permissions',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'resource', gp.resource,
            'actions', to_jsonb(gp.actions)
          )
        )
        from public.get_user_permissions(p_usuario_id) gp
      ),
      '[]'::jsonb
    )
  )
  from public.usuarios u
  where u.id = p_usuario_id
    and u.status = 'Ativo';
$$;
