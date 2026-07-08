-- Integrallys v2
-- Base SQL para login manual com JWT + permissões centralizadas
-- Compatível com PostgreSQL/Supabase.
--
-- Este script foi derivado do estado atual do app:
-- - login lê a tabela `usuarios`
-- - perfis válidos: master, admin, gestor, recepcao, especialista, paciente
-- - permissões no frontend têm o formato { resource, actions[] }
--
-- Observação:
-- O app atual valida senha com bcrypt no servidor Next.js (`bcrypt.compare`).
-- Portanto este script armazena `senha_hash`, mas não tenta validar bcrypt dentro do banco.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'master',
      'admin',
      'gestor',
      'recepcao',
      'especialista',
      'paciente'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type public.user_status as enum (
      'Ativo',
      'Inativo',
      'Bloqueado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'permission_effect') then
    create type public.permission_effect as enum (
      'allow',
      'deny'
    );
  end if;
end $$;

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  senha_hash text not null,
  perfil public.user_role not null,
  status public.user_status not null default 'Ativo',
  avatar_url text null,
  ultimo_login_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint usuarios_email_unique unique (email)
);

create index if not exists usuarios_perfil_idx on public.usuarios (perfil);
create index if not exists usuarios_status_idx on public.usuarios (status);
create unique index if not exists usuarios_email_lower_unique_idx on public.usuarios ((lower(email)));

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

create index if not exists perfil_permissoes_perfil_idx on public.perfil_permissoes (perfil);
create index if not exists perfil_permissoes_recurso_idx on public.perfil_permissoes (recurso_id);

create table if not exists public.usuario_permissoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  recurso_id uuid not null references public.recursos(id) on delete cascade,
  acao text not null,
  efeito public.permission_effect not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint usuario_permissoes_unique unique (usuario_id, recurso_id, acao)
);

create index if not exists usuario_permissoes_usuario_idx on public.usuario_permissoes (usuario_id);
create index if not exists usuario_permissoes_recurso_idx on public.usuario_permissoes (recurso_id);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references public.usuarios(id) on delete set null,
  acao text not null,
  recurso text not null,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists usuarios_set_updated_at on public.usuarios;
create trigger usuarios_set_updated_at
before update on public.usuarios
for each row
execute function public.set_updated_at();

insert into public.recursos (codigo, descricao)
values
  ('dashboard', 'Dashboard principal'),
  ('agenda', 'Agenda'),
  ('pacientes', 'Pacientes'),
  ('anamnese', 'Anamnese'),
  ('prontuarios', 'Prontuarios'),
  ('evolucoes', 'Evolucoes clinicas'),
  ('documentacao', 'Documentacao clinica'),
  ('prescricoes', 'Prescricoes'),
  ('estoque', 'Estoque'),
  ('lista-espera', 'Lista de espera'),
  ('caixa', 'Caixa'),
  ('financeiro', 'Financeiro'),
  ('repasse', 'Repasse'),
  ('relatorios', 'Relatorios'),
  ('auditoria', 'Auditoria'),
  ('usuarios', 'Usuarios'),
  ('permissoes', 'Permissoes'),
  ('unidades', 'Unidades'),
  ('configuracoes', 'Configuracoes'),
  ('portal.dashboard', 'Portal do paciente'),
  ('portal.historico', 'Historico do paciente'),
  ('portal.agendamentos', 'Agendamentos do paciente'),
  ('portal.cartoes', 'Cartoes do paciente'),
  ('portal.pagamentos', 'Pagamentos do paciente')
on conflict (codigo) do nothing;

with role_permissions (perfil, recurso, acoes) as (
  values
    ('master'::public.user_role, 'dashboard', array['read']),
    ('master'::public.user_role, 'agenda', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'pacientes', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'anamnese', array['read', 'create', 'update']),
    ('master'::public.user_role, 'prontuarios', array['read', 'create', 'update']),
    ('master'::public.user_role, 'evolucoes', array['read', 'create', 'update']),
    ('master'::public.user_role, 'prescricoes', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'estoque', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'lista-espera', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'caixa', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'financeiro', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'repasse', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'relatorios', array['read']),
    ('master'::public.user_role, 'auditoria', array['read']),
    ('master'::public.user_role, 'usuarios', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'permissoes', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'unidades', array['read', 'create', 'update', 'delete']),
    ('master'::public.user_role, 'configuracoes', array['read', 'update']),

    ('admin'::public.user_role, 'dashboard', array['read']),
    ('admin'::public.user_role, 'agenda', array['read']),
    ('admin'::public.user_role, 'usuarios', array['read', 'create', 'update', 'delete']),
    ('admin'::public.user_role, 'permissoes', array['read', 'create', 'update', 'delete']),
    ('admin'::public.user_role, 'unidades', array['read', 'create', 'update', 'delete']),
    ('admin'::public.user_role, 'caixa', array['read', 'create', 'update']),
    ('admin'::public.user_role, 'financeiro', array['read', 'create', 'update']),
    ('admin'::public.user_role, 'repasse', array['read', 'create', 'update']),
    ('admin'::public.user_role, 'relatorios', array['read']),
    ('admin'::public.user_role, 'auditoria', array['read']),
    ('admin'::public.user_role, 'configuracoes', array['read', 'update']),

    ('gestor'::public.user_role, 'dashboard', array['read']),
    ('gestor'::public.user_role, 'agenda', array['read', 'create', 'update']),
    ('gestor'::public.user_role, 'pacientes', array['read', 'create', 'update']),
    ('gestor'::public.user_role, 'lista-espera', array['read', 'create', 'update']),
    ('gestor'::public.user_role, 'prescricoes', array['read', 'create', 'update']),
    ('gestor'::public.user_role, 'estoque', array['read', 'update']),
    ('gestor'::public.user_role, 'documentacao', array['read']),
    ('gestor'::public.user_role, 'financeiro', array['read']),
    ('gestor'::public.user_role, 'repasse', array['read']),
    ('gestor'::public.user_role, 'usuarios', array['read']),
    ('gestor'::public.user_role, 'permissoes', array['read']),
    ('gestor'::public.user_role, 'unidades', array['read']),
    ('gestor'::public.user_role, 'relatorios', array['read']),
    ('gestor'::public.user_role, 'configuracoes', array['read']),

    ('recepcao'::public.user_role, 'dashboard', array['read']),
    ('recepcao'::public.user_role, 'agenda', array['read', 'create', 'update']),
    ('recepcao'::public.user_role, 'pacientes', array['read', 'create', 'update']),
    ('recepcao'::public.user_role, 'prescricoes', array['read', 'create']),
    ('recepcao'::public.user_role, 'estoque', array['read']),
    ('recepcao'::public.user_role, 'lista-espera', array['read', 'create', 'update']),
    ('recepcao'::public.user_role, 'caixa', array['read', 'create', 'update']),
    ('recepcao'::public.user_role, 'financeiro', array['read']),
    ('recepcao'::public.user_role, 'relatorios', array['read']),
    ('recepcao'::public.user_role, 'configuracoes', array['read']),
    ('recepcao'::public.user_role, 'usuarios', array['read']),

    ('especialista'::public.user_role, 'dashboard', array['read']),
    ('especialista'::public.user_role, 'agenda', array['read', 'update']),
    ('especialista'::public.user_role, 'pacientes', array['read']),
    ('especialista'::public.user_role, 'anamnese', array['read', 'create', 'update']),
    ('especialista'::public.user_role, 'prontuarios', array['read', 'create', 'update']),
    ('especialista'::public.user_role, 'evolucoes', array['read', 'create', 'update']),
    ('especialista'::public.user_role, 'prescricoes', array['read', 'create', 'update']),
    ('especialista'::public.user_role, 'estoque', array['read']),
    ('especialista'::public.user_role, 'usuarios', array['read']),
    ('especialista'::public.user_role, 'relatorios', array['read']),
    ('especialista'::public.user_role, 'configuracoes', array['read']),

    ('paciente'::public.user_role, 'portal.dashboard', array['read']),
    ('paciente'::public.user_role, 'portal.historico', array['read']),
    ('paciente'::public.user_role, 'portal.agendamentos', array['read', 'create']),
    ('paciente'::public.user_role, 'portal.cartoes', array['read', 'create', 'update', 'delete']),
    ('paciente'::public.user_role, 'portal.pagamentos', array['read']),
    ('paciente'::public.user_role, 'configuracoes', array['read', 'update'])
)
insert into public.perfil_permissoes (perfil, recurso_id, acao)
select
  rp.perfil,
  r.id,
  acao
from role_permissions rp
join public.recursos r on r.codigo = rp.recurso
cross join unnest(rp.acoes) as acao
on conflict (perfil, recurso_id, acao) do nothing;

create or replace view public.vw_auth_login as
select
  u.id,
  u.nome,
  lower(u.email) as email,
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
returns table (
  resource text,
  actions text[]
)
language sql
security definer
set search_path = public
as $$
  with base_user as (
    select id, perfil
    from public.usuarios
    where id = p_usuario_id
      and status = 'Ativo'
  ),
  role_allows as (
    select
      r.codigo as resource,
      pp.acao,
      'allow'::public.permission_effect as efeito
    from base_user bu
    join public.perfil_permissoes pp on pp.perfil = bu.perfil
    join public.recursos r on r.id = pp.recurso_id
  ),
  user_overrides as (
    select
      r.codigo as resource,
      up.acao,
      up.efeito
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
    select
      resource,
      acao,
      case
        when bool_or(efeito = 'deny') then false
        when bool_or(efeito = 'allow') then true
        else false
      end as permitido
    from combined
    group by resource, acao
  )
  select
    resource,
    array_agg(acao order by acao) as actions
  from resolved
  where permitido = true
  group by resource
  order by resource;
$$;

create or replace function public.can_user(
  p_usuario_id uuid,
  p_resource text,
  p_action text
)
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
      'email', lower(u.email),
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

comment on table public.usuarios is 'Usuários autenticáveis do Integrallys. O login Next.js lê desta tabela.';
comment on table public.perfil_permissoes is 'Permissões padrão por perfil/role.';
comment on table public.usuario_permissoes is 'Overrides por usuário. deny tem precedência sobre allow.';
comment on view public.vw_auth_login is 'Visão pronta para consulta de login: id, nome, email, senha_hash, perfil, status.';
comment on function public.get_user_permissions(uuid) is 'Resolve permissões efetivas no formato próximo ao contrato do frontend.';
comment on function public.can_user(uuid, text, text) is 'Helper para checagem pontual de autorização no backend.';

-- Exemplo de consulta usada pelo login atual:
-- select id, nome, email, senha_hash, perfil, status
-- from public.vw_auth_login
-- where email = lower('usuario@integrallys.local');
--
-- Exemplo de payload de permissões:
-- select * from public.get_user_permissions('<uuid-do-usuario>');
--
-- Exemplo de checagem:
-- select public.can_user('<uuid-do-usuario>', 'usuarios', 'create');
