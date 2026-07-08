-- ============================================================================
-- INTEGRALLYS - TODAS AS MIGRATIONS CONSOLIDADAS (versao IDEMPOTENTE)
-- ----------------------------------------------------------------------------
-- Gerado de sql/migrations/*.sql na ordem numerica (001 .. 060). 56 arquivos.
-- Conteudo copiado VERBATIM, com QUATRO excecoes marcadas no corpo:
--   (A) migration 004: o INSERT em perfil_permissoes teve
--   "ON CONFLICT (perfil, recurso_id, acao)" trocado por "WHERE NOT EXISTS"
--   (mesmo padrao das migrations 012/049 do proprio projeto). Motivo: a
--   migration 008 substitui a unique cheia por indices UNICOS PARCIAIS, e
--   ON CONFLICT nao aceita indice parcial como arbitro -> erro 42P10 ao
--   re-rodar contra um banco ja migrado.
--   (B) Antes de cada "CREATE OR REPLACE VIEW" foi inserido um
--   "DROP VIEW IF EXISTS" (3 views: vw_auth_login, e
--   v_agendamento_pagamento_resumo definida em 013 e 014). Motivo: a 013
--   cria a view com 4 colunas e a 014 adiciona a 5a; ao re-rodar contra um
--   banco que ja tem a view no formato da 014, o replay da 013 tentaria
--   remover coluna -> erro 42P16. Nada depende dessas views (DROP sem
--   CASCADE e seguro).
--   (C) migration 019: o "ALTER TYPE agendamento_status RENAME VALUE
--   'Em atendimento' TO 'Em Atendimento'" foi envolvido numa guarda DO
--   $$ + pg_enum (mesmo padrao da migration 015). Motivo: num banco ja
--   migrado o label ja foi renomeado, e replayar o RENAME -> erro 22023.
--   (D) migrations 027/029/043: os 3 blocos DO/INSERT em storage.buckets
--   foram REMOVIDOS do consolidado (substituidos por comentario). Criar
--   bucket via SQL exige ser dono de storage.buckets; a role do SQL Editor
--   do Supabase nao e -> erro 42501 abortava o script (handler nao bastou).
--   Os proprios comentarios dessas migrations ja mandam criar o bucket no
--   dashboard. ===> ACAO MANUAL OBRIGATORIA no Supabase Dashboard > Storage:
--       New bucket "documentos-pdf"   Public = OFF
--       New bucket "clinica-logos"    Public = ON
--       New bucket "exames-pacientes" Public = OFF
--   Os arquivos sql/migrations/027,029,043 ORIGINAIS nao foram alterados.
--   NENHUMA outra linha foi alterada.
--
-- IDEMPOTENTE: pode rodar contra banco vazio, parcialmente ou totalmente
-- migrado, quantas vezes for preciso, convergindo ao estado final.
--
-- NAO envolver em BEGIN/COMMIT externo: 007/008/025-028 abrem transacao
-- propria e 015/019/046 usam ALTER TYPE ADD VALUE (proibido em transacao).
-- Rode como script unico: psql -f sql/full_migrations.sql
-- ============================================================================


-- ############################################################################
-- >>> 001_auth_core.sql
-- ############################################################################

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

drop view if exists public.vw_auth_login;  -- [CONSOLIDADO] idempotencia: ver excecao (B) no cabecalho
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



-- ############################################################################
-- >>> 002_operational_domains.sql
-- ############################################################################

-- 002_operational_domains.sql
-- Recepção, admin operacional e base compartilhada

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fila_prioridade') then
    create type public.fila_prioridade as enum ('Baixa','Média','Alta','Urgente');
  end if;
  if not exists (select 1 from pg_type where typname = 'tarefa_status') then
    create type public.tarefa_status as enum ('Pendente','Em andamento','Concluída','Cancelada');
  end if;
  if not exists (select 1 from pg_type where typname = 'movimento_caixa_tipo') then
    create type public.movimento_caixa_tipo as enum ('entrada','saida');
  end if;
  if not exists (select 1 from pg_type where typname = 'financeiro_tipo') then
    create type public.financeiro_tipo as enum ('receita','despesa');
  end if;
  if not exists (select 1 from pg_type where typname = 'repasse_status') then
    create type public.repasse_status as enum ('Pendente','Processando','Pago','Cancelado');
  end if;
  if not exists (select 1 from pg_type where typname = 'paciente_status') then
    create type public.paciente_status as enum ('Ativo','Inativo','Aguardando','Alta');
  end if;
  if not exists (select 1 from pg_type where typname = 'agendamento_status') then
    create type public.agendamento_status as enum ('Agendado','Confirmado','Em atendimento','Concluído','Cancelado','Faltou','Bloqueado','Adiado');
  end if;
end $$;

create table if not exists public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  chave text not null,
  valor text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint configuracoes_categoria_chave_unique unique (categoria, chave)
);

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid null references public.usuarios(id) on delete set null,
  unidade_id uuid null references public.unidades(id) on delete set null,
  nome text not null,
  email citext null,
  telefone text null,
  status public.paciente_status not null default 'Ativo',
  data_nascimento date null,
  cpf text null,
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  criado_por_id uuid null references public.usuarios(id) on delete set null,
  data_agendamento date not null,
  horario_inicio time not null,
  horario_fim time null,
  status public.agendamento_status not null default 'Agendado',
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lista_espera (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  unidade_id uuid null references public.unidades(id) on delete set null,
  prioridade public.fila_prioridade not null default 'Média',
  entrada_em timestamptz not null default timezone('utc', now()),
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text null,
  responsavel_id uuid null references public.usuarios(id) on delete set null,
  status public.tarefa_status not null default 'Pendente',
  vencimento_em timestamptz null,
  created_by_id uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  usuario_id uuid null references public.usuarios(id) on delete set null,
  descricao text not null,
  tipo public.movimento_caixa_tipo not null,
  valor numeric(12,2) not null check (valor >= 0),
  data_movimento timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  descricao text not null,
  categoria text not null,
  valor numeric(12,2) not null check (valor >= 0),
  tipo public.financeiro_tipo not null,
  competencia date null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.regras_repasse (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  unidade_id uuid null references public.unidades(id) on delete set null,
  percentual numeric(5,2) null check (percentual >= 0 and percentual <= 100),
  valor_fixo numeric(12,2) null check (valor_fixo is null or valor_fixo >= 0),
  ativo boolean not null default true,
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.repasses (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  unidade_id uuid null references public.unidades(id) on delete set null,
  periodo_inicio date not null,
  periodo_fim date not null,
  valor numeric(12,2) not null check (valor >= 0),
  status public.repasse_status not null default 'Pendente',
  pago_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.relatorios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null,
  slug text null unique,
  parametros jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.produtos_estoque (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  nome text not null,
  categoria text not null,
  sku text null,
  quantidade integer not null default 0,
  estoque_minimo integer not null default 0,
  status text not null default 'Disponível',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos_estoque(id) on delete cascade,
  usuario_id uuid null references public.usuarios(id) on delete set null,
  tipo public.movimento_caixa_tipo not null,
  quantidade integer not null check (quantidade > 0),
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references public.usuarios(id) on delete set null,
  unidade_id uuid null references public.unidades(id) on delete set null,
  acao text not null,
  recurso text not null,
  descricao text null,
  ip inet null,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pacientes_unidade_idx on public.pacientes (unidade_id);
create index if not exists pacientes_status_idx on public.pacientes (status);
create index if not exists agendamentos_data_idx on public.agendamentos (data_agendamento);
create index if not exists agendamentos_paciente_idx on public.agendamentos (paciente_id);
create index if not exists agendamentos_profissional_idx on public.agendamentos (profissional_id);
create index if not exists lista_espera_prioridade_idx on public.lista_espera (prioridade);
create index if not exists tarefas_responsavel_idx on public.tarefas (responsavel_id);
create index if not exists caixa_movimentos_data_idx on public.caixa_movimentos (data_movimento desc);
create index if not exists financeiro_lancamentos_tipo_idx on public.financeiro_lancamentos (tipo);
create index if not exists repasses_profissional_idx on public.repasses (profissional_id);
create index if not exists produtos_estoque_categoria_idx on public.produtos_estoque (categoria);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

drop trigger if exists configuracoes_set_updated_at on public.configuracoes;
create trigger configuracoes_set_updated_at before update on public.configuracoes for each row execute function public.set_updated_at();
drop trigger if exists pacientes_set_updated_at on public.pacientes;
create trigger pacientes_set_updated_at before update on public.pacientes for each row execute function public.set_updated_at();
drop trigger if exists agendamentos_set_updated_at on public.agendamentos;
create trigger agendamentos_set_updated_at before update on public.agendamentos for each row execute function public.set_updated_at();
drop trigger if exists lista_espera_set_updated_at on public.lista_espera;
create trigger lista_espera_set_updated_at before update on public.lista_espera for each row execute function public.set_updated_at();
drop trigger if exists tarefas_set_updated_at on public.tarefas;
create trigger tarefas_set_updated_at before update on public.tarefas for each row execute function public.set_updated_at();
drop trigger if exists caixa_movimentos_set_updated_at on public.caixa_movimentos;
create trigger caixa_movimentos_set_updated_at before update on public.caixa_movimentos for each row execute function public.set_updated_at();
drop trigger if exists financeiro_lancamentos_set_updated_at on public.financeiro_lancamentos;
create trigger financeiro_lancamentos_set_updated_at before update on public.financeiro_lancamentos for each row execute function public.set_updated_at();
drop trigger if exists regras_repasse_set_updated_at on public.regras_repasse;
create trigger regras_repasse_set_updated_at before update on public.regras_repasse for each row execute function public.set_updated_at();
drop trigger if exists repasses_set_updated_at on public.repasses;
create trigger repasses_set_updated_at before update on public.repasses for each row execute function public.set_updated_at();
drop trigger if exists relatorios_set_updated_at on public.relatorios;
create trigger relatorios_set_updated_at before update on public.relatorios for each row execute function public.set_updated_at();
drop trigger if exists produtos_estoque_set_updated_at on public.produtos_estoque;
create trigger produtos_estoque_set_updated_at before update on public.produtos_estoque for each row execute function public.set_updated_at();



-- ############################################################################
-- >>> 003_clinical_and_patient_portal.sql
-- ############################################################################

-- 003_clinical_and_patient_portal.sql
-- Domínio clínico e portal do paciente

do $$
begin
  if not exists (select 1 from pg_type where typname = 'prontuario_status') then
    create type public.prontuario_status as enum ('Aberto','Fechado','Em revisão','Arquivado');
  end if;
  if not exists (select 1 from pg_type where typname = 'documento_meio') then
    create type public.documento_meio as enum ('digital','fisico','assinatura');
  end if;
  if not exists (select 1 from pg_type where typname = 'pagamento_status') then
    create type public.pagamento_status as enum ('Pendente','Pago','Vencido','Cancelado');
  end if;
end $$;

create table if not exists public.prescricoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  numero text not null unique,
  status text not null default 'Pendente',
  tipo text null,
  valor_total numeric(12,2) not null default 0,
  data_prescricao date null,
  validade date null,
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prescricao_itens (
  id uuid primary key default gen_random_uuid(),
  prescricao_id uuid not null references public.prescricoes(id) on delete cascade,
  produto_id uuid null references public.produtos_estoque(id) on delete set null,
  descricao text not null,
  quantidade integer not null default 1 check (quantidade > 0),
  valor_unitario numeric(12,2) null check (valor_unitario is null or valor_unitario >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  data_anamnese date not null,
  tipo text not null,
  queixa text not null,
  imc numeric(5,2) null,
  peso numeric(6,2) null,
  gordura numeric(5,2) null,
  altura numeric(5,2) null,
  massa_muscular numeric(6,2) null,
  gordura_visceral numeric(6,2) null,
  massa_ossea numeric(6,2) null,
  agua_corporal numeric(6,2) null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prontuarios (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  data_registro date not null,
  tipo text not null,
  status public.prontuario_status not null default 'Aberto',
  conteudo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evolucoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  data_evolucao date not null,
  tipo text not null,
  resumo text not null,
  retorno_recepcao text null,
  docs_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.documentos_clinicos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  tipo text not null,
  meio public.documento_meio null,
  recebido boolean not null default false,
  anexo_url text null,
  atualizado_em timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cartoes_paciente (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  bandeira text not null,
  final text not null,
  titular text not null,
  token_gateway text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pagamentos_paciente (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  descricao text not null,
  valor numeric(12,2) not null check (valor >= 0),
  status public.pagamento_status not null default 'Pendente',
  vencimento_em date null,
  pago_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prescricoes_paciente_idx on public.prescricoes (paciente_id);
create index if not exists prontuarios_paciente_idx on public.prontuarios (paciente_id);
create index if not exists evolucoes_paciente_idx on public.evolucoes (paciente_id);
create index if not exists documentos_clinicos_paciente_idx on public.documentos_clinicos (paciente_id);
create index if not exists cartoes_paciente_paciente_idx on public.cartoes_paciente (paciente_id);
create index if not exists pagamentos_paciente_paciente_idx on public.pagamentos_paciente (paciente_id);

drop trigger if exists prescricoes_set_updated_at on public.prescricoes;
create trigger prescricoes_set_updated_at before update on public.prescricoes for each row execute function public.set_updated_at();
drop trigger if exists anamneses_set_updated_at on public.anamneses;
create trigger anamneses_set_updated_at before update on public.anamneses for each row execute function public.set_updated_at();
drop trigger if exists prontuarios_set_updated_at on public.prontuarios;
create trigger prontuarios_set_updated_at before update on public.prontuarios for each row execute function public.set_updated_at();
drop trigger if exists evolucoes_set_updated_at on public.evolucoes;
create trigger evolucoes_set_updated_at before update on public.evolucoes for each row execute function public.set_updated_at();
drop trigger if exists documentos_clinicos_set_updated_at on public.documentos_clinicos;
create trigger documentos_clinicos_set_updated_at before update on public.documentos_clinicos for each row execute function public.set_updated_at();
drop trigger if exists cartoes_paciente_set_updated_at on public.cartoes_paciente;
create trigger cartoes_paciente_set_updated_at before update on public.cartoes_paciente for each row execute function public.set_updated_at();
drop trigger if exists pagamentos_paciente_set_updated_at on public.pagamentos_paciente;
create trigger pagamentos_paciente_set_updated_at before update on public.pagamentos_paciente for each row execute function public.set_updated_at();



-- ############################################################################
-- >>> 004_permission_defaults.sql
-- ############################################################################

-- 004_permission_defaults.sql
-- Permissões padrão por perfil

with role_permissions (perfil, recurso, acoes) as (
  values
    ('master'::public.user_role, 'dashboard', array['read']),
    ('master'::public.user_role, 'agenda', array['read','create','update','delete']),
    ('master'::public.user_role, 'pacientes', array['read','create','update','delete']),
    ('master'::public.user_role, 'anamnese', array['read','create','update']),
    ('master'::public.user_role, 'prontuarios', array['read','create','update']),
    ('master'::public.user_role, 'evolucoes', array['read','create','update']),
    ('master'::public.user_role, 'documentacao', array['read','create','update']),
    ('master'::public.user_role, 'prescricoes', array['read','create','update','delete']),
    ('master'::public.user_role, 'estoque', array['read','create','update','delete']),
    ('master'::public.user_role, 'lista-espera', array['read','create','update','delete']),
    ('master'::public.user_role, 'caixa', array['read','create','update','delete']),
    ('master'::public.user_role, 'financeiro', array['read','create','update','delete']),
    ('master'::public.user_role, 'repasse', array['read','create','update','delete']),
    ('master'::public.user_role, 'relatorios', array['read']),
    ('master'::public.user_role, 'auditoria', array['read']),
    ('master'::public.user_role, 'usuarios', array['read','create','update','delete']),
    ('master'::public.user_role, 'permissoes', array['read','create','update','delete']),
    ('master'::public.user_role, 'unidades', array['read','create','update','delete']),
    ('master'::public.user_role, 'configuracoes', array['read','update']),
    ('master'::public.user_role, 'tarefas', array['read','create','update','delete']),
    ('admin'::public.user_role, 'dashboard', array['read']),
    ('admin'::public.user_role, 'agenda', array['read']),
    ('admin'::public.user_role, 'usuarios', array['read','create','update','delete']),
    ('admin'::public.user_role, 'permissoes', array['read','create','update','delete']),
    ('admin'::public.user_role, 'unidades', array['read','create','update','delete']),
    ('admin'::public.user_role, 'caixa', array['read','create','update']),
    ('admin'::public.user_role, 'financeiro', array['read','create','update']),
    ('admin'::public.user_role, 'repasse', array['read','create','update']),
    ('admin'::public.user_role, 'relatorios', array['read']),
    ('admin'::public.user_role, 'auditoria', array['read']),
    ('admin'::public.user_role, 'configuracoes', array['read','update']),
    ('gestor'::public.user_role, 'dashboard', array['read']),
    ('gestor'::public.user_role, 'agenda', array['read','create','update']),
    ('gestor'::public.user_role, 'pacientes', array['read','create','update']),
    ('gestor'::public.user_role, 'lista-espera', array['read','create','update']),
    ('gestor'::public.user_role, 'prescricoes', array['read','create','update']),
    ('gestor'::public.user_role, 'estoque', array['read','update']),
    ('gestor'::public.user_role, 'documentacao', array['read']),
    ('gestor'::public.user_role, 'financeiro', array['read']),
    ('gestor'::public.user_role, 'repasse', array['read']),
    ('gestor'::public.user_role, 'usuarios', array['read']),
    ('gestor'::public.user_role, 'permissoes', array['read']),
    ('gestor'::public.user_role, 'unidades', array['read']),
    ('gestor'::public.user_role, 'relatorios', array['read']),
    ('gestor'::public.user_role, 'configuracoes', array['read']),
    ('recepcao'::public.user_role, 'dashboard', array['read']),
    ('recepcao'::public.user_role, 'agenda', array['read','create','update']),
    ('recepcao'::public.user_role, 'pacientes', array['read','create','update']),
    ('recepcao'::public.user_role, 'prescricoes', array['read','create']),
    ('recepcao'::public.user_role, 'estoque', array['read']),
    ('recepcao'::public.user_role, 'lista-espera', array['read','create','update']),
    ('recepcao'::public.user_role, 'caixa', array['read','create','update']),
    ('recepcao'::public.user_role, 'financeiro', array['read']),
    ('recepcao'::public.user_role, 'relatorios', array['read']),
    ('recepcao'::public.user_role, 'configuracoes', array['read']),
    ('recepcao'::public.user_role, 'tarefas', array['read','create','update']),
    ('recepcao'::public.user_role, 'usuarios', array['read']),
    ('especialista'::public.user_role, 'dashboard', array['read']),
    ('especialista'::public.user_role, 'agenda', array['read']),
    ('especialista'::public.user_role, 'pacientes', array['read']),
    ('especialista'::public.user_role, 'anamnese', array['read','create','update']),
    ('especialista'::public.user_role, 'prontuarios', array['read','create','update']),
    ('especialista'::public.user_role, 'evolucoes', array['read','create','update']),
    ('especialista'::public.user_role, 'prescricoes', array['read','create','update']),
    ('especialista'::public.user_role, 'estoque', array['read']),
    ('especialista'::public.user_role, 'documentacao', array['read','create','update']),
    ('especialista'::public.user_role, 'relatorios', array['read']),
    ('especialista'::public.user_role, 'configuracoes', array['read']),
    ('paciente'::public.user_role, 'portal.dashboard', array['read']),
    ('paciente'::public.user_role, 'portal.historico', array['read']),
    ('paciente'::public.user_role, 'portal.agendamentos', array['read','create']),
    ('paciente'::public.user_role, 'portal.cartoes', array['read','create','update','delete']),
    ('paciente'::public.user_role, 'portal.pagamentos', array['read']),
    ('paciente'::public.user_role, 'configuracoes', array['read','update'])
)
-- [CONSOLIDADO - DESVIO IDEMPOTENTE] Original (migration 004) usa
--   "on conflict (perfil, recurso_id, acao) do nothing;"
-- que falha com 42P10 num banco ja migrado (a migration 008 troca a
-- unique cheia por indices UNICOS PARCIAIS, que ON CONFLICT nao aceita).
-- Trocado pelo mesmo padrao WHERE NOT EXISTS das migrations 012/049.
-- O arquivo sql/migrations/004_permission_defaults.sql NAO foi alterado.
insert into public.perfil_permissoes (perfil, recurso_id, acao)
select rp.perfil, r.id, acao
from role_permissions rp
join public.recursos r on r.codigo = rp.recurso
cross join unnest(rp.acoes) as acao
where not exists (
  select 1
  from public.perfil_permissoes pp
  where pp.perfil = rp.perfil
    and pp.recurso_id = r.id
    and pp.acao = acao
);



-- ############################################################################
-- >>> 005_financeiro_caixa_sessions.sql
-- ############################################################################

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



-- ############################################################################
-- >>> 006_notificacoes.sql
-- ############################################################################

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



-- ############################################################################
-- >>> 007_pacientes_usuario_unique.sql
-- ############################################################################

-- 007_pacientes_usuario_unique.sql
-- Garante que um usuario tenha no maximo um paciente vinculado.

begin;

with duplicados as (
  select
    id,
    row_number() over (
      partition by usuario_id
      order by created_at asc, id asc
    ) as rn
  from public.pacientes
  where usuario_id is not null
)
update public.pacientes p
set
  usuario_id = null,
  updated_at = timezone('utc', now())
from duplicados d
where p.id = d.id
  and d.rn > 1;

create unique index if not exists pacientes_usuario_unique_idx
  on public.pacientes (usuario_id)
  where usuario_id is not null;

commit;



-- ############################################################################
-- >>> 008_permissoes_por_unidade.sql
-- ############################################################################

begin;

alter table public.perfil_permissoes
  add column if not exists unidade_id uuid null references public.unidades(id) on delete cascade;

alter table public.perfil_permissoes
  drop constraint if exists perfil_permissoes_unique;

create unique index if not exists perfil_permissoes_global_unique_idx
  on public.perfil_permissoes (perfil, recurso_id, acao)
  where unidade_id is null;

create unique index if not exists perfil_permissoes_unidade_unique_idx
  on public.perfil_permissoes (perfil, unidade_id, recurso_id, acao)
  where unidade_id is not null;

create or replace function public.get_user_permissions(p_usuario_id uuid)
returns table (resource text, actions text[])
language sql
security definer
set search_path = public
as $$
  with base_user as (
    select id, perfil, unidade_id
    from public.usuarios
    where id = p_usuario_id
      and status = 'Ativo'
  ),
  role_allows as (
    select r.codigo as resource, pp.acao, 'allow'::public.permission_effect as efeito
    from base_user bu
    join public.perfil_permissoes pp
      on pp.perfil = bu.perfil
     and (pp.unidade_id is null or pp.unidade_id = bu.unidade_id)
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
  select resource, array_agg(acao order by acao) as actions
  from resolved
  where permitido = true
  group by resource
  order by resource;
$$;

commit;



-- ############################################################################
-- >>> 009_dre_demonstrativos.sql
-- ############################################################################

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



-- ############################################################################
-- >>> 010_lista_espera_metadata.sql
-- ############################################################################

alter table public.lista_espera
  add column if not exists especialista text null,
  add column if not exists procedimento text null,
  add column if not exists preferencia_horario text null;



-- ############################################################################
-- >>> 011_procedimentos.sql
-- ############################################################################

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



-- ############################################################################
-- >>> 012_admin_caixa_permission.sql
-- ############################################################################

-- 012_admin_caixa_permission.sql
-- Garante que admin tenha acesso padrão ao recurso de caixa

insert into public.perfil_permissoes (perfil, recurso_id, acao, unidade_id)
select
  'admin'::public.user_role,
  r.id,
  perm.acao,
  null
from public.recursos r
cross join unnest(array['read','create','update']) as perm(acao)
where r.codigo = 'caixa'
  and not exists (
    select 1
    from public.perfil_permissoes pp
    where pp.perfil = 'admin'::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = perm.acao
      and pp.unidade_id is null
  );



-- ############################################################################
-- >>> 013_agendamentos_expansion.sql
-- ############################################################################

-- 013_agendamentos_expansion.sql
-- Expande agendamentos com tipo, modalidade, dados de consulta online e valor.
-- Cria agendamentos_pagamentos para histórico financeiro por agendamento.
-- Idempotente: pode rodar múltiplas vezes sem erro.

-- 1) Enum para modalidade de atendimento
do $$
begin
  if not exists (select 1 from pg_type where typname = 'modalidade_atendimento') then
    create type public.modalidade_atendimento as enum ('Presencial','Online','Hibrido');
  end if;
  if not exists (select 1 from pg_type where typname = 'pagamento_status') then
    create type public.pagamento_status as enum ('Pendente','Pago','Parcial','Estornado','Cancelado');
  end if;
end $$;

-- 2) Colunas novas em public.agendamentos
alter table public.agendamentos
  add column if not exists tipo text null;

alter table public.agendamentos
  add column if not exists modalidade_atendimento public.modalidade_atendimento not null default 'Presencial';

alter table public.agendamentos
  add column if not exists plataforma_online text null;

alter table public.agendamentos
  add column if not exists url_online text null;

alter table public.agendamentos
  add column if not exists valor_procedimento numeric(10,2) null;

-- 3) Tabela agendamentos_pagamentos (histórico por agendamento)
create table if not exists public.agendamentos_pagamentos (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  valor numeric(10,2) not null,
  metodo text null,
  status public.pagamento_status not null default 'Pendente',
  pago_em timestamptz null,
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists agendamentos_pagamentos_agendamento_idx
  on public.agendamentos_pagamentos (agendamento_id);

create index if not exists agendamentos_pagamentos_status_idx
  on public.agendamentos_pagamentos (status);

-- 4) Trigger de updated_at (reusa função pública já criada em 001_auth_core.sql)
drop trigger if exists agendamentos_pagamentos_set_updated_at on public.agendamentos_pagamentos;
create trigger agendamentos_pagamentos_set_updated_at
  before update on public.agendamentos_pagamentos
  for each row execute function public.set_updated_at();

-- 5) View auxiliar: resumo de pagamento por agendamento
--    (facilita o cálculo de "Pago" / "Pendente" / "Parcial" sem agregar no app).
drop view if exists public.v_agendamento_pagamento_resumo;  -- [CONSOLIDADO] idempotencia: ver excecao (B) no cabecalho
create or replace view public.v_agendamento_pagamento_resumo as
select
  a.id as agendamento_id,
  coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0)::numeric(10,2) as total_pago,
  coalesce(a.valor_procedimento, 0)::numeric(10,2) as valor_devido,
  case
    when coalesce(a.valor_procedimento, 0) = 0 then 'Sem valor'
    when coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0) >= a.valor_procedimento
      then 'Pago'
    when coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0) > 0
      then 'Parcial'
    else 'Pendente'
  end as situacao
from public.agendamentos a
left join public.agendamentos_pagamentos p on p.agendamento_id = a.id
group by a.id, a.valor_procedimento;

-- 6) Permissões padrão: quem pode ler/escrever agendamentos também mexe em pagamentos
--    (alinha com o padrão de perfil_permissoes existente).
insert into public.perfil_permissoes (perfil, recurso_id, acao, unidade_id)
select
  pp.perfil,
  r.id,
  pp.acao,
  pp.unidade_id
from public.recursos r
cross join (
  select distinct pp.perfil, pp.acao, pp.unidade_id
  from public.perfil_permissoes pp
  join public.recursos r2 on r2.id = pp.recurso_id
  where r2.codigo = 'agenda'
) pp
where r.codigo = 'agenda_pagamentos'
  and not exists (
    select 1
    from public.perfil_permissoes existing
    where existing.perfil = pp.perfil
      and existing.recurso_id = r.id
      and existing.acao = pp.acao
      and (existing.unidade_id is not distinct from pp.unidade_id)
  );

-- Garante que o recurso existe (sem truncar se já estiver)
insert into public.recursos (codigo, descricao)
values ('agenda_pagamentos', 'Pagamentos de agendamentos')
on conflict (codigo) do nothing;



-- ############################################################################
-- >>> 014_pagamento_resumo_data.sql
-- ############################################################################

-- 014_pagamento_resumo_data.sql
-- Adiciona data_ultimo_pagamento à view v_agendamento_pagamento_resumo.
-- Idempotente: CREATE OR REPLACE.

drop view if exists public.v_agendamento_pagamento_resumo;  -- [CONSOLIDADO] idempotencia: ver excecao (B) no cabecalho
create or replace view public.v_agendamento_pagamento_resumo as
select
  a.id as agendamento_id,
  coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0)::numeric(10,2) as total_pago,
  coalesce(a.valor_procedimento, 0)::numeric(10,2) as valor_devido,
  case
    when coalesce(a.valor_procedimento, 0) = 0 then 'Sem valor'
    when coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0) >= a.valor_procedimento
      then 'Pago'
    when coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0) > 0
      then 'Parcial'
    else 'Pendente'
  end as situacao,
  max(case when p.status = 'Pago' then p.pago_em else null end)::date as data_ultimo_pagamento
from public.agendamentos a
left join public.agendamentos_pagamentos p on p.agendamento_id = a.id
group by a.id, a.valor_procedimento;



-- ############################################################################
-- >>> 015_paciente_status_obito.sql
-- ############################################################################

-- 015_paciente_status_obito.sql
-- Adiciona valor 'Óbito' ao enum paciente_status.
-- Idempotente: verifica existência antes de adicionar.

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'Óbito'
      and enumtypid = (select oid from pg_type where typname = 'paciente_status')
  ) then
    alter type public.paciente_status add value 'Óbito';
  end if;
end $$;



-- ############################################################################
-- >>> 016_estoque_campos_detalhados.sql
-- ############################################################################

-- 016_estoque_campos_detalhados.sql
-- Adiciona campos financeiros e de rastreabilidade ao estoque.
-- Idempotente: usa ADD COLUMN IF NOT EXISTS.

alter table public.produtos_estoque
  add column if not exists lote text null;

alter table public.produtos_estoque
  add column if not exists validade date null;

alter table public.produtos_estoque
  add column if not exists preco_custo numeric(10,2) null;

alter table public.produtos_estoque
  add column if not exists preco_venda numeric(10,2) null;



-- ############################################################################
-- >>> 017_agendamentos_compromisso_pessoal.sql
-- ############################################################################

-- =============================================================================
-- Migration 017: Agendamentos — suporte a compromisso pessoal
-- =============================================================================
-- Permite que a tabela `agendamentos` armazene também compromissos pessoais
-- (reuniões, tarefas, lembretes) sem paciente vinculado.
--
-- Antes desta migration: `paciente_id` era NOT NULL; todo registro exigia
-- paciente. Com isso, a aba "Agenda pessoal" do frontend não tinha como exibir
-- reuniões internas, tarefas ou lembretes.
--
-- Após esta migration:
--   - `paciente_id` passa a ser NULLABLE.
--   - Registro com `paciente_id IS NULL` é interpretado pelo frontend como
--     "compromisso pessoal" (agenda-view.tsx separa via filtro `item.paciente`).
--   - Novas colunas opcionais: `titulo`, `local`, `participantes` para
--     suportar reuniões/tarefas sem paciente.
--   - O campo `tipo` (já existente) continua sendo usado para Reunião/Tarefa/
--     Lembrete/Evento/Aprovação nos compromissos pessoais.
-- =============================================================================

ALTER TABLE agendamentos
    ALTER COLUMN paciente_id DROP NOT NULL;

ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS titulo TEXT,
    ADD COLUMN IF NOT EXISTS local TEXT,
    ADD COLUMN IF NOT EXISTS participantes TEXT;

-- Índice parcial para compromissos pessoais (sem paciente) por profissional —
-- acelera a query da aba "Agenda pessoal" quando filtramos por profissional_id.
CREATE INDEX IF NOT EXISTS idx_agendamentos_compromisso_pessoal
    ON agendamentos (profissional_id, data_agendamento)
    WHERE paciente_id IS NULL;

COMMENT ON COLUMN agendamentos.paciente_id IS
    'Paciente vinculado ao agendamento. NULL indica compromisso pessoal (reunião, tarefa, lembrete).';
COMMENT ON COLUMN agendamentos.titulo IS
    'Título do compromisso pessoal (ex: "Reunião de planejamento"). Opcional para atendimentos com paciente.';
COMMENT ON COLUMN agendamentos.local IS
    'Local do compromisso pessoal (ex: "Sala de Reuniões 2"). Opcional para atendimentos.';
COMMENT ON COLUMN agendamentos.participantes IS
    'Participantes do compromisso pessoal (texto livre). Opcional para atendimentos.';



-- ############################################################################
-- >>> 018_especialista_agenda_update.sql
-- ############################################################################

-- 018_especialista_agenda_update.sql
-- Concede ao perfil especialista as permissões necessárias para transicionar
-- o status do agendamento no fluxo oficial definido em TAREFA-002:
-- Confirmado → Check-in → Em Atendimento → Check-out → Em Atraso → Cancelado.
--
-- Sem 'agenda.update' o especialista não consegue iniciar nem finalizar
-- atendimento pela UI (PUT /api/agenda retorna 403 via requirePermission).
--
-- Também concede 'usuarios.read' para eliminar 403 cosmético do
-- useUsuarios() que roda no agenda-view como fallback de lista de profissionais.

insert into public.perfil_permissoes (perfil, recurso_id, acao, unidade_id)
select
  'especialista'::public.user_role,
  r.id,
  perm.acao,
  null
from public.recursos r
cross join (
  values
    ('agenda', 'update'),
    ('usuarios', 'read')
) as perm(recurso, acao)
where r.codigo = perm.recurso
  and not exists (
    select 1
    from public.perfil_permissoes pp
    where pp.perfil = 'especialista'::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = perm.acao
      and pp.unidade_id is null
  );



-- ############################################################################
-- >>> 019_agendamento_status_tarefa_002.sql
-- ############################################################################

-- 019_agendamento_status_tarefa_002.sql
-- Alinha o enum public.agendamento_status com o fluxo oficial da TAREFA-002:
--   Confirmado → Check-in → Em Atendimento → Check-out → Em Atraso → Cancelado
--
-- Estado anterior (criado em 002_operational_domains.sql):
--   'Agendado','Confirmado','Em atendimento','Concluído',
--   'Cancelado','Faltou','Bloqueado','Adiado'
--
-- Gaps corrigidos:
--   1. 'Em atendimento' estava com case errado — o app envia 'Em Atendimento'
--      e o enum é case-sensitive, causando 500 em PUT /api/agenda.
--   2. 'Check-in', 'Check-out' e 'Em Atraso' não existiam no enum, mesmo
--      sendo exigidos pelo fluxo oficial da TAREFA-002.
--
-- IMPORTANTE: ALTER TYPE ADD VALUE não pode rodar dentro de transação.
-- Rode este arquivo no SQL editor do Supabase sem envolver em BEGIN/COMMIT.

-- Corrige o case. RENAME VALUE é metadata-only — atualiza todas as linhas
-- existentes de agendamentos que estavam com 'Em atendimento' para
-- 'Em Atendimento' sem UPDATE explícito.
-- [CONSOLIDADO - DESVIO IDEMPOTENTE (C)] Original (migration 019) usa direto:
--   alter type public.agendamento_status rename value 'Em atendimento' to 'Em Atendimento';
-- Num banco ja migrado o label ja foi renomeado -> 22023 ao re-rodar.
-- Envolvido em guarda pg_enum (mesmo padrao da migration 015). RENAME VALUE
-- e metadata-only e pode rodar dentro de DO/transacao (ao contrario de ADD
-- VALUE). O arquivo sql/migrations/019_*.sql NAO foi alterado.
do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'agendamento_status' and e.enumlabel = 'Em atendimento'
  ) and not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'agendamento_status' and e.enumlabel = 'Em Atendimento'
  ) then
    alter type public.agendamento_status rename value 'Em atendimento' to 'Em Atendimento';
  end if;
end $$;

-- Adiciona os valores que faltavam no fluxo da TAREFA-002.
alter type public.agendamento_status add value if not exists 'Check-in';
alter type public.agendamento_status add value if not exists 'Check-out';
alter type public.agendamento_status add value if not exists 'Em Atraso';



-- ############################################################################
-- >>> 020_pacientes_expand_schema.sql
-- ############################################################################

-- 020_pacientes_expand_schema.sql
-- Normaliza o schema de pacientes: move dados do JSON dumped em
-- public.configuracoes (categorias 'paciente_profile' e 'portal_paciente_profile')
-- para colunas dedicadas em public.pacientes.
--
-- Motivos:
-- - Permitir WHERE sexo = 'feminino' direto em SQL (antes exigia parse do JSON)
-- - Integridade referencial (on delete cascade do paciente limpa tudo)
-- - Fim da duplicação gestao vs portal (dois schemas diferentes pro mesmo dado)
-- - Performance (elimina join+merge na listagem)
--
-- Este arquivo só adiciona colunas — a cópia de dados está em 020b.

-- Identidade / documentos
alter table public.pacientes add column if not exists sexo text null;
alter table public.pacientes add column if not exists rg text null;
alter table public.pacientes add column if not exists inscricao_estadual text null;
alter table public.pacientes add column if not exists origem text null;
alter table public.pacientes add column if not exists vinculo_tipo text null default 'cliente';
alter table public.pacientes add column if not exists photo_url text null;

-- Endereço (1:1 com paciente; mantido inline pra simplicidade)
alter table public.pacientes add column if not exists cep text null;
alter table public.pacientes add column if not exists logradouro text null;
alter table public.pacientes add column if not exists numero text null;
alter table public.pacientes add column if not exists complemento text null;
alter table public.pacientes add column if not exists bairro text null;
alter table public.pacientes add column if not exists cidade text null;
alter table public.pacientes add column if not exists estado text null;

-- Dados complexos — JSONB em coluna própria (não mais em configuracoes)
alter table public.pacientes add column if not exists necessidades_especiais jsonb null;
alter table public.pacientes add column if not exists responsavel jsonb null;
alter table public.pacientes add column if not exists financeiro jsonb null;
alter table public.pacientes add column if not exists fornecedor_dados jsonb null;

-- Indexes úteis para filtros comuns
create index if not exists pacientes_sexo_idx on public.pacientes (sexo);
create index if not exists pacientes_vinculo_tipo_idx on public.pacientes (vinculo_tipo);
create index if not exists pacientes_unidade_idx on public.pacientes (unidade_id);



-- ############################################################################
-- >>> 020b_pacientes_migrate_data.sql
-- ############################################################################

-- 020b_pacientes_migrate_data.sql
-- Copia dados do JSON legado (public.configuracoes) para as novas colunas
-- em public.pacientes (adicionadas em 020_pacientes_expand_schema.sql).
--
-- Estratégia de prioridade quando há conflito entre fontes:
--   1. Dados de 'paciente_profile' (editados pela tela de gestão) têm prioridade
--   2. Dados de 'portal_paciente_profile' (editados pelo próprio paciente)
--      só preenchem campos que ainda estão NULL após o passo 1
--
-- Esta migration é idempotente e segura pra rodar múltiplas vezes.
-- Não deleta as linhas antigas de configuracoes — mantém como backup.
-- Limpeza final deve ser feita manualmente após validar os dados migrados.

-- ═══════════════════════════════════════════════════════════════════
-- Passo 1: Migrar dados do schema 'paciente_profile' (JSON completo)
-- Chave no formato: details_<paciente_id>
-- ═══════════════════════════════════════════════════════════════════
update public.pacientes p
set
  sexo = coalesce(nullif(cfg.valor::jsonb->>'sexo', ''), p.sexo),
  rg = coalesce(nullif(cfg.valor::jsonb->>'rg', ''), p.rg),
  inscricao_estadual = coalesce(nullif(cfg.valor::jsonb->>'inscricaoEstadual', ''), p.inscricao_estadual),
  origem = coalesce(nullif(cfg.valor::jsonb->>'source', ''), p.origem),
  vinculo_tipo = coalesce(nullif(cfg.valor::jsonb->>'vinculoTipo', ''), p.vinculo_tipo),
  photo_url = coalesce(nullif(cfg.valor::jsonb->>'photoUrl', ''), p.photo_url),
  cep = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'zipCode', ''), p.cep),
  logradouro = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'street', ''), p.logradouro),
  numero = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'number', ''), p.numero),
  complemento = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'complement', ''), p.complemento),
  bairro = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'neighborhood', ''), p.bairro),
  cidade = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'city', ''), p.cidade),
  estado = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'state', ''), p.estado),
  necessidades_especiais = coalesce(cfg.valor::jsonb->'specialNeeds', p.necessidades_especiais),
  responsavel = coalesce(cfg.valor::jsonb->'responsible', p.responsavel),
  financeiro = coalesce(cfg.valor::jsonb->'financial', p.financeiro),
  fornecedor_dados = coalesce(cfg.valor::jsonb->'supplierData', p.fornecedor_dados)
from public.configuracoes cfg
where cfg.categoria = 'paciente_profile'
  and cfg.chave = 'details_' || p.id::text;

-- ═══════════════════════════════════════════════════════════════════
-- Passo 2: Migrar dados do schema 'portal_paciente_profile' (chaves achatadas)
-- Chaves no formato: <campo>_<usuario_id> (ex: sexo_<uid>, rg_<uid>, zip_<uid>)
-- Só preenche se o campo ainda estiver NULL após passo 1.
-- ═══════════════════════════════════════════════════════════════════
update public.pacientes p set sexo = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'sexo_' || p.usuario_id::text
  and p.usuario_id is not null and p.sexo is null and nullif(c.valor, '') is not null;

update public.pacientes p set rg = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'rg_' || p.usuario_id::text
  and p.usuario_id is not null and p.rg is null and nullif(c.valor, '') is not null;

update public.pacientes p set inscricao_estadual = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'ie_' || p.usuario_id::text
  and p.usuario_id is not null and p.inscricao_estadual is null and nullif(c.valor, '') is not null;

update public.pacientes p set cep = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'zip_' || p.usuario_id::text
  and p.usuario_id is not null and p.cep is null and nullif(c.valor, '') is not null;

update public.pacientes p set logradouro = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'street_' || p.usuario_id::text
  and p.usuario_id is not null and p.logradouro is null and nullif(c.valor, '') is not null;

update public.pacientes p set numero = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'number_' || p.usuario_id::text
  and p.usuario_id is not null and p.numero is null and nullif(c.valor, '') is not null;

update public.pacientes p set complemento = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'complement_' || p.usuario_id::text
  and p.usuario_id is not null and p.complemento is null and nullif(c.valor, '') is not null;

update public.pacientes p set bairro = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'neighborhood_' || p.usuario_id::text
  and p.usuario_id is not null and p.bairro is null and nullif(c.valor, '') is not null;

update public.pacientes p set cidade = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'city_' || p.usuario_id::text
  and p.usuario_id is not null and p.cidade is null and nullif(c.valor, '') is not null;

update public.pacientes p set estado = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'state_' || p.usuario_id::text
  and p.usuario_id is not null and p.estado is null and nullif(c.valor, '') is not null;

-- ═══════════════════════════════════════════════════════════════════
-- Validação rápida — verifique os resultados antes de apagar o legado:
--
-- select id, nome, sexo, rg, cep, cidade, estado, vinculo_tipo
-- from public.pacientes
-- order by nome;
--
-- Após validar, limpeza dos dados antigos (opcional — mantém como backup
-- por enquanto; descomentar quando tiver certeza):
--
-- delete from public.configuracoes
--  where categoria in ('paciente_profile', 'portal_paciente_profile');
-- ═══════════════════════════════════════════════════════════════════



-- ############################################################################
-- >>> 021_prescricoes_desconto_vendedor.sql
-- ############################################################################

-- Migration 021 — Prescrições: desconto manual + justificativa + vendedor
-- Contexto:
--   * TAREFA-CR01 (Desconto Manual no Fechamento de Venda): requisitos exigem
--     persistir percentual/valor do desconto aplicado na finalização da venda e
--     registrar justificativa livre (ex: "Convênio Sindicato Água Boa").
--   * TAREFA-019 (Nova Prescrição/Venda avulsa): o checklist pede persistir o
--     vendedor responsável pela venda (especialista, recepcionista ou parceiro).
--
-- Schema atual (ver sql/integrallys_full_schema.sql) já tem `profissional_id`
-- (quem criou a prescrição no sistema). `vendedor_id` é distinto — é o
-- profissional escolhido no form como responsável pela venda, que pode diferir
-- de quem está logado (ex: recepção finaliza venda de prescrição criada pelo
-- especialista).
--
-- Colunas adicionadas:
--   valor_bruto             — subtotal antes de qualquer desconto (auditoria)
--   desconto_tipo           — 'value' (R$) ou 'percent' (%)
--   desconto_percentual     — preenchido quando desconto_tipo='percent'
--   desconto_valor          — valor absoluto do desconto em R$ (sempre calculado)
--   justificativa_desconto  — texto livre, obrigatório via UI quando há desconto
--   vendedor_id             — FK opcional para usuarios(id)
--
-- Regra de leitura:
--   Valor Líquido efetivo = valor_total (já persistido pós-desconto)
--   Valor Bruto           = valor_bruto (novo)
--   Desconto efetivo      = valor_bruto - valor_total (ou desconto_valor)

ALTER TABLE public.prescricoes
  ADD COLUMN IF NOT EXISTS valor_bruto numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS desconto_tipo text NULL
    CHECK (desconto_tipo IS NULL OR desconto_tipo IN ('value', 'percent')),
  ADD COLUMN IF NOT EXISTS desconto_percentual numeric(5,2) NULL
    CHECK (desconto_percentual IS NULL OR (desconto_percentual >= 0 AND desconto_percentual <= 100)),
  ADD COLUMN IF NOT EXISTS desconto_valor numeric(12,2) NULL
    CHECK (desconto_valor IS NULL OR desconto_valor >= 0),
  ADD COLUMN IF NOT EXISTS justificativa_desconto text NULL,
  ADD COLUMN IF NOT EXISTS vendedor_id uuid NULL
    REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS prescricoes_vendedor_idx ON public.prescricoes (vendedor_id);



-- ############################################################################
-- >>> 022_prescricao_itens_posologia.sql
-- ############################################################################

-- Migration 022 — Prescrição itens: posologia por linha + wiring estoque/caixa
-- Contexto:
--   * TAREFA-023 exigia "coluna de posologia visível para recepção porém bloqueada
--     para edição". A tabela `prescricao_itens` já existe (ver 003_clinical_and_patient_portal)
--     mas sem coluna de posologia. Este campo é preenchido pelo `nova-venda-modal` da
--     recepção no momento do cadastro do produto no carrinho e exibido nas
--     visualizações (`detalhes-venda-modal`, impressão de etiquetas).
--   * TAREFA-019 exigia persistência completa do fluxo de venda. A coluna permite que
--     o POST `/api/prescricoes` grave a posologia junto com cada item, e o GET devolva
--     essa informação para as views consumirem.
--
-- Nota operacional:
--   Após esta migration, o POST `/api/prescricoes` quando `status='Convertida'`
--   passa a (a) gravar linhas em `prescricao_itens`, (b) decrementar
--   `produtos_estoque.quantidade` + registrar `movimentacoes_estoque`, (c) lançar em
--   `caixa_movimentos` uma entrada de receita quando forma de pagamento ≠ 'consumo'.
--   A etapa (c) EXIGE que haja uma `caixa_sessoes` com status='aberto' para a unidade
--   do usuário no dia — caso contrário o POST falha com 409 CAIXA_NOT_OPEN.

ALTER TABLE public.prescricao_itens
  ADD COLUMN IF NOT EXISTS posologia text NULL;



-- ############################################################################
-- >>> 023_recepcao_usuarios_read.sql
-- ############################################################################

-- 023_recepcao_usuarios_read.sql
-- Concede ao perfil recepcao a permissão 'usuarios.read'.
--
-- Motivação: o fluxo de Nova Prescrição/Venda (`nova-venda-modal` da
-- recepção) precisa listar usuários para popular o select de "Vendedor"
-- (TAREFA-019 — vendedor responsável pela venda). Hoje a recepcionista
-- tem apenas as permissões {dashboard, agenda, pacientes, prescricoes,
-- estoque, lista-espera, caixa, financeiro, relatorios, configuracoes}.
-- Sem 'usuarios.read', `GET /api/usuarios` retorna 403 e o select aparece
-- vazio.
--
-- O perfil especialista já recebeu 'usuarios.read' na migration 018
-- pelo mesmo motivo (lista de profissionais na agenda). Esta migration
-- aplica o mesmo padrão para recepcao.

insert into public.perfil_permissoes (perfil, recurso_id, acao, unidade_id)
select
  'recepcao'::public.user_role,
  r.id,
  'read',
  null
from public.recursos r
where r.codigo = 'usuarios'
  and not exists (
    select 1
    from public.perfil_permissoes pp
    where pp.perfil = 'recepcao'::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = 'read'
      and pp.unidade_id is null
  );



-- ############################################################################
-- >>> 024_prescricoes_parcelamento.sql
-- ############################################################################

-- Migration 024 — Prescrições: parcelamento de cartão de crédito
-- Contexto:
--   * TAREFA-CR-M05-A exige que, quando a forma de pagamento for "Cartão de
--     Crédito", a venda permita configurar número de parcelas (1 a 12) e o
--     sistema exiba o valor de cada parcela.
--   * Configuração de taxas por parcelamento é persistida na tabela existente
--     `public.configuracoes` (categoria='pagamento', chave='pagamento.card_fees',
--     valor=JSON com {"1":0,"2":3.5,...,"12":15}). Não exige schema novo.
--
-- Colunas adicionadas em `prescricoes`:
--   numero_parcelas  — 1..12; NULL quando forma de pagamento ≠ cartão de crédito
--   valor_parcela    — valor_total / numero_parcelas (persistido pra evitar
--                      recálculo em relatórios financeiros)

ALTER TABLE public.prescricoes
  ADD COLUMN IF NOT EXISTS numero_parcelas int NULL
    CHECK (numero_parcelas IS NULL OR (numero_parcelas BETWEEN 1 AND 12)),
  ADD COLUMN IF NOT EXISTS valor_parcela numeric(12,2) NULL
    CHECK (valor_parcela IS NULL OR valor_parcela >= 0);



-- ############################################################################
-- >>> 025_clinica_config.sql
-- ############################################################################

-- Migration 025 — Identidade da Clínica (configuração global por unidade)
-- Contexto:
--   * TAREFA-CR-REV-G exige tela "Configurações → Identidade da Clínica"
--     (acesso Gestor/Admin) com nome, logo, cores — usados em todos os
--     documentos gerados (atestados, laudos, recibos etc.).
--   * Também atende TAREFA-CR-M19-F / TAREFA-052, que precisam resolver as
--     variáveis #CLINICA_NOME#, #CLINICA_ENDERECO#, #CLINICA_CEP#,
--     #CLINICA_TELEFONE#, #CLINICA_CIDADE_UF# nos templates de documento.
--
-- Decisões:
--   * 1:1 com public.unidades (unidade_id UNIQUE, FK on delete cascade) —
--     uma configuração de identidade por unidade/clínica. Mantida em tabela
--     separada de `unidades` porque identidade visual/comercial pode diferir
--     da razão social da unidade.
--   * Sem RLS — segue o padrão das migrations 001–024: controle de acesso é
--     feito na camada de API via `requirePermission`.
--   * Reutiliza `public.set_updated_at()` já definida no schema.

begin;

create table if not exists public.clinica_config (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null unique references public.unidades(id) on delete cascade,
  nome text not null,
  cidade_uf text null,
  endereco text null,
  cep text null,
  telefone text null,
  logo_url text null,
  cor_primaria text not null default '#000000'
    check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_secundaria text not null default '#ffffff'
    check (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists clinica_config_unidade_idx
  on public.clinica_config (unidade_id);

drop trigger if exists clinica_config_set_updated_at on public.clinica_config;
create trigger clinica_config_set_updated_at
  before update on public.clinica_config
  for each row execute function public.set_updated_at();

commit;



-- ############################################################################
-- >>> 026_documento_templates.sql
-- ############################################################################

-- Migration 026 — Templates de documentos clínicos editáveis por clínica
-- Contexto:
--   * TAREFA-CR-M19-F / TAREFA-052 / TAREFA-057 (IMPL_DOCUMENTOS_EDITAVEIS.md)
--   * Cada unidade tem seus próprios templates de documento (anamneses,
--     declarações, laudos, encaminhamentos, procedimentos, dieta). O
--     conteúdo do documento fica em JSONB — estrutura em seções tipadas
--     (texto_fixo, campo_texto, checklist, checkbox_grupo) + cabeçalho e
--     rodapé. Variáveis dinâmicas usam o padrão #VARIAVEL#.
--
-- Decisões:
--   * `slug` identifica o modelo (anamnese_consulta, laudo, dieta, …) e é
--     único por unidade — permite que cada clínica customize o template
--     partindo da mesma base sem colidir com outras clínicas.
--   * `tipo` controla o renderer/UI e é um enum aberto via CHECK.
--   * Permissões de leitura/escrita são aplicadas na API
--     (`requirePermission('documentos', 'read'|'update'|...)`), não via RLS.

begin;

create table if not exists public.documento_templates (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  slug text not null,
  nome text not null,
  tipo text not null
    check (tipo in ('formulario', 'declaracao', 'laudo', 'encaminhamento', 'procedimento', 'dieta')),
  conteudo jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  editavel_pelo_especialista boolean not null default true,
  disponivel_portal_paciente boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (unidade_id, slug)
);

create index if not exists documento_templates_unidade_idx
  on public.documento_templates (unidade_id);

create index if not exists documento_templates_ativos_idx
  on public.documento_templates (unidade_id, ativo)
  where ativo = true;

drop trigger if exists documento_templates_set_updated_at on public.documento_templates;
create trigger documento_templates_set_updated_at
  before update on public.documento_templates
  for each row execute function public.set_updated_at();

commit;



-- ############################################################################
-- >>> 027_documentos_gerados.sql
-- ############################################################################

-- Migration 027 — Documentos gerados (snapshots imutáveis)
-- Contexto:
--   * Cada vez que um documento é emitido (declaração, laudo, dieta etc.),
--     as variáveis #CLIENTE_NOME#, #CLINICA_NOME# etc. são resolvidas e o
--     resultado é persistido em `conteudo_preenchido` (JSONB). Esse snapshot
--     é imutável — edições posteriores no template não alteram documentos
--     já emitidos.
--   * PDF gerado (via jspdf/html2canvas na camada cliente ou server) é
--     armazenado no bucket Storage `documentos-pdf`. A URL/caminho fica em
--     `pdf_url`. O bucket é criado em bloco separado (permissão Storage
--     depende do cargo que roda a migration — se falhar, criar manualmente
--     via dashboard).
--
-- Decisões:
--   * `agendamento_id` (não `atendimento_id`): o projeto não tem tabela
--     `atendimentos` — atendimento é um agendamento com status de
--     atendimento em curso/finalizado. Referência em agendamentos(id).
--   * `profissional_id` e `gerado_por` → `public.usuarios(id)` (não existe
--     tabela `profissionais` separada).
--   * Sem trigger `set_updated_at` — o documento gerado é imutável.

begin;

create table if not exists public.documentos_gerados (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.documento_templates(id) on delete restrict,
  agendamento_id uuid null references public.agendamentos(id) on delete set null,
  paciente_id uuid null references public.pacientes(id) on delete set null,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  conteudo_preenchido jsonb not null,
  gerado_por uuid not null references public.usuarios(id) on delete restrict,
  gerado_em timestamptz not null default timezone('utc', now()),
  disponivel_no_portal boolean not null default false,
  pdf_url text null
);

create index if not exists documentos_gerados_template_idx
  on public.documentos_gerados (template_id);
create index if not exists documentos_gerados_agendamento_idx
  on public.documentos_gerados (agendamento_id);
create index if not exists documentos_gerados_paciente_idx
  on public.documentos_gerados (paciente_id, gerado_em desc);
create index if not exists documentos_gerados_portal_idx
  on public.documentos_gerados (paciente_id, gerado_em desc)
  where disponivel_no_portal = true;

commit;

-- Bucket de Storage para PDFs — acesso controlado por signed URL emitido
-- na API. Executado fora da transação porque o schema `storage` pode não
-- aceitar DDL transacional em todos os planos. Se a role atual não tiver
-- permissão para escrever em storage.buckets, criar manualmente via
-- dashboard (Storage → New bucket → "documentos-pdf", public = false).
-- [CONSOLIDADO - DESVIO (D)] Bloco DO/INSERT em storage.buckets ('documentos-pdf')
-- REMOVIDO do consolidado. Criar bucket via SQL exige ser dono de
-- storage.buckets (a role do SQL Editor do Supabase nao e) -> erro 42501
-- abortava o script. ACAO MANUAL no Supabase Dashboard:
--   Storage > New bucket: name = "documentos-pdf", Public = OFF (privado)
-- (O original sql/migrations/027_documentos_gerados.sql NAO foi alterado.)



-- ############################################################################
-- >>> 028_usuarios_conselho.sql
-- ############################################################################

-- Migration 028 — Campo de conselho profissional em usuarios
-- Contexto:
--   * A variável #PROFISSIONAL_CONSELHO# usada nos templates de documento
--     (Declaração de Comparecimento, Encaminhamento, etc.) precisa de uma
--     fonte no schema. Ex.: "CRTH-BR 7452 CRTHE-BR 168873".
--   * Campo opcional — não obrigatório para perfis não-clínicos
--     (recepção, gestor, admin).

begin;

alter table public.usuarios
  add column if not exists conselho text null;

comment on column public.usuarios.conselho is
  'Registro(s) de conselho profissional do usuário (ex.: CRM, CRTH, CREFITO). '
  'Usado na geração de documentos clínicos via variável #PROFISSIONAL_CONSELHO#.';

commit;



-- ############################################################################
-- >>> 029_clinica_logos_bucket.sql
-- ############################################################################

-- Migration 029 — Bucket Storage para logos de clínica
-- Contexto:
--   * TAREFA-CR-REV-G prevê upload de logo (PNG/SVG). O arquivo é
--     referenciado em `clinica_config.logo_url` e deve ser exibido nos
--     documentos gerados (atestados, laudos, recibos etc.).
--   * Bucket público — logos aparecem em documentos baixados/impressos
--     e em previews sem autenticação. Upload e write são controlados na
--     camada de API.

-- [CONSOLIDADO - DESVIO (D)] Bloco DO/INSERT em storage.buckets ('clinica-logos')
-- REMOVIDO do consolidado. Criar bucket via SQL exige ser dono de
-- storage.buckets (a role do SQL Editor do Supabase nao e) -> erro 42501
-- abortava o script. ACAO MANUAL no Supabase Dashboard:
--   Storage > New bucket: name = "clinica-logos", Public = ON (publico)
-- (O original sql/migrations/029_clinica_logos_bucket.sql NAO foi alterado.)



-- ############################################################################
-- >>> 030_lista_espera_procedimento_especialista_valor.sql
-- ############################################################################

-- TAREFA-072 · Lista de Espera expandida na Agenda (Item 53 · 22/04/2026)
--
-- 1) Adiciona coluna `valor` em `procedimentos` para permitir exibir o valor
--    na seleção da Lista de Espera e somar a "Receita Futura" da agenda.
-- 2) Adiciona FKs `procedimento_id` e `especialista_id` em `lista_espera`,
--    mantendo as colunas textuais (`procedimento`, `especialista`) por
--    retrocompatibilidade com registros antigos. As colunas textuais são
--    populadas via trigger nos novos inserts/updates.

alter table public.procedimentos
  add column if not exists valor numeric(10,2) null;

alter table public.lista_espera
  add column if not exists procedimento_id uuid null references public.procedimentos(id) on delete set null,
  add column if not exists especialista_id uuid null references public.usuarios(id) on delete set null;

create index if not exists lista_espera_procedimento_id_idx on public.lista_espera (procedimento_id);
create index if not exists lista_espera_especialista_id_idx on public.lista_espera (especialista_id);



-- ############################################################################
-- >>> 033_prescricoes_assinatura.sql
-- ############################################################################

-- TAREFA-065 · E-sign na assinatura da prescrição
--
-- Adiciona persistência da assinatura desenhada no SignaturePad ao salvar
-- a prescrição. A assinatura fica em base64 PNG (data URL), armazenada
-- como TEXT. assinado_em registra o timestamp de quando o profissional
-- confirmou a assinatura.

alter table public.prescricoes
  add column if not exists assinatura_base64 text null,
  add column if not exists assinado_em timestamptz null;

create index if not exists prescricoes_assinado_em_idx on public.prescricoes (assinado_em);



-- ############################################################################
-- >>> 034_caixa_resumo_fechamento.sql
-- ############################################################################

-- TAREFA-CR-REV-A · Resumo de fechamento de caixa
--
-- Persiste o snapshot completo do resumo (entradas/saídas, breakdown por forma
-- de pagamento, saldo final, valor transferido ao cofre, saldo restante) no
-- momento do fechamento. As colunas operacionais `valor_transferido` e
-- `saldo_restante` continuam sendo populadas (uso direto em queries), mas o
-- JSONB carrega o snapshot exato exibido na tela de resumo, para reimpressão
-- e auditoria histórica.

alter table public.caixa_sessoes
  add column if not exists resumo_fechamento jsonb null;



-- ############################################################################
-- >>> 035_agendamentos_encaixe.sql
-- ############################################################################

-- TAREFA-CR-M05-E · Encaixe manual fora da janela de atendimento
--
-- O modal de novo agendamento já tinha o toggle "Encaixe fora do horário
-- padrão" em UI, porém o estado não era persistido. Este migration adiciona
-- as colunas necessárias para registrar:
--
--   - tipo_encaixe   = 'normal' (default) | 'manual'
--   - fora_janela    = true quando o operador marcou o toggle (encaixe fora
--                      da janela configurada do especialista)
--   - motivo_encaixe = texto livre para auditoria (preenchido apenas quando
--                      o toggle está ativo)
--
-- A grade da agenda renderiza um badge "Encaixe" para agendamentos com
-- fora_janela = true. Não é alterada nenhuma validação existente — o
-- controle de janela continua sendo responsabilidade do front (que passa a
-- bypassar o aviso quando o toggle está ativo).

alter table public.agendamentos
  add column if not exists tipo_encaixe text not null default 'normal'
    check (tipo_encaixe in ('normal', 'manual')),
  add column if not exists fora_janela boolean not null default false,
  add column if not exists motivo_encaixe text null;

create index if not exists agendamentos_tipo_encaixe_idx on public.agendamentos (tipo_encaixe);



-- ############################################################################
-- >>> 036_estoque_saida_vinculo.sql
-- ############################################################################

-- TAREFA-075 · Vínculo na saída de estoque
--
-- Permite rastrear a quem foi destinada uma saída de estoque que NÃO é venda
-- (que já tem vínculo via prescricoes/prescricao_itens). Os campos abaixo são
-- opcionais — preenchidos apenas quando o operador escolhe um tipo de
-- vínculo no `saida-estoque-modal`.
--
--   - vinculo_tipo  = 'cliente' | 'especialista' | 'fornecedor'
--   - vinculo_id    = UUID do paciente/usuário (cliente ou especialista).
--                     Para fornecedor é null (não há tabela de fornecedores).
--   - vinculo_nome  = nome livre, principalmente para fornecedor; redundante
--                     mas evita join no relatório de movimentação.

alter table public.movimentacoes_estoque
  add column if not exists vinculo_tipo text null
    check (vinculo_tipo is null or vinculo_tipo in ('cliente', 'especialista', 'fornecedor')),
  add column if not exists vinculo_id uuid null,
  add column if not exists vinculo_nome text null;

create index if not exists movimentacoes_estoque_vinculo_idx
  on public.movimentacoes_estoque (vinculo_tipo, vinculo_id);



-- ############################################################################
-- >>> 037_caixa_bandeira_parcelas.sql
-- ############################################################################

-- TAREFA-076 · Bandeira e parcelamento ao registrar cartão no caixa
--
-- Quando uma movimentação de caixa é registrada com forma `cartao_debito` ou
-- `cartao_credito`, o operador agora pode informar a bandeira e (apenas para
-- crédito) o número de parcelas. Os campos são opcionais — não bloqueiam o
-- registro. `valor_parcela` é informativo (snapshot do cálculo no front),
-- não altera o `valor` registrado em caixa_movimentos.

alter table public.caixa_movimentos
  add column if not exists bandeira text null,
  add column if not exists parcelas integer null check (parcelas is null or (parcelas between 1 and 12)),
  add column if not exists valor_parcela numeric(12,2) null check (valor_parcela is null or valor_parcela >= 0);



-- ############################################################################
-- >>> 038_agenda_bloqueios.sql
-- ############################################################################

-- 038_agenda_bloqueios.sql
-- Persistência dos bloqueios de agenda (férias, folga, reunião, etc).
-- Sub-item da TAREFA-073 — antes apenas o tipo era persistido em
-- configuracoes.agenda.tipos_bloqueio; o bloqueio em si não tinha tabela.
--
-- Idempotente.

create table if not exists public.agenda_bloqueios (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid null references public.usuarios(id) on delete cascade,
  unidade_id uuid null references public.unidades(id) on delete set null,
  data_inicio date not null,
  data_fim date not null,
  horario_inicio time null,
  horario_fim time null,
  dia_inteiro boolean not null default false,
  tipo text not null,
  justificativa text null,
  created_by uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (data_fim >= data_inicio)
);

create index if not exists agenda_bloqueios_profissional_idx
  on public.agenda_bloqueios (profissional_id);
create index if not exists agenda_bloqueios_periodo_idx
  on public.agenda_bloqueios (data_inicio, data_fim);

alter table public.agenda_bloqueios enable row level security;

drop policy if exists "bloqueios_clinica_all" on public.agenda_bloqueios;
create policy "bloqueios_clinica_all"
  on public.agenda_bloqueios
  for all
  using (true)
  with check (true);



-- ############################################################################
-- >>> 039_usuarios_tipo_vinculo.sql
-- ############################################################################

-- 039_usuarios_tipo_vinculo.sql
-- CR-M05-F: especialista pode ser "interno" (clínica paga repasse)
-- ou "parceiro" (% sobre valor bruto, sem dedução de custos da clínica).
--
-- Idempotente.

alter table public.usuarios
  add column if not exists tipo_vinculo text default 'interno';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'usuarios_tipo_vinculo_check'
  ) then
    alter table public.usuarios
      add constraint usuarios_tipo_vinculo_check
      check (tipo_vinculo in ('interno', 'parceiro'));
  end if;
end$$;



-- ############################################################################
-- >>> 040_caixa_operador.sql
-- ############################################################################

-- 040_caixa_operador.sql
-- CR-M19-C: cada sessão de caixa vinculada ao operador.
--
-- A coluna `usuario_id` em `caixa_movimentos` e `opened_by_id`/`closed_by_id`
-- em `caixa_sessoes` já cobrem o vínculo. Este migration adiciona o nome
-- canonicamente esperado pelo spec (`operador_id`) como espelho de
-- `usuario_id`/`opened_by_id` para uso pela API e UI multi-operador, sem
-- quebrar consumidores legados.
--
-- Idempotente.

alter table public.caixa_movimentos
  add column if not exists operador_id uuid null references public.usuarios(id) on delete set null;

update public.caixa_movimentos
  set operador_id = usuario_id
  where operador_id is null
    and usuario_id is not null;

create index if not exists caixa_movimentos_operador_idx
  on public.caixa_movimentos (operador_id);

alter table public.caixa_sessoes
  add column if not exists operador_id uuid null references public.usuarios(id) on delete set null;

update public.caixa_sessoes
  set operador_id = opened_by_id
  where operador_id is null
    and opened_by_id is not null;

create index if not exists caixa_sessoes_operador_idx
  on public.caixa_sessoes (operador_id);



-- ############################################################################
-- >>> 041_contas_bancarias.sql
-- ############################################################################

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



-- ############################################################################
-- >>> 042_conciliacao_ofx.sql
-- ############################################################################

-- 042_conciliacao_ofx.sql
-- CR-M19-D: importação manual de extrato OFX para conciliação bancária.
--
-- Idempotente.

create table if not exists public.conciliacao_ofx (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid null references public.contas_bancarias(id) on delete cascade,
  data_transacao date null,
  valor numeric(12, 2) null,
  descricao text null,
  lancamento_id uuid null references public.financeiro_lancamentos(id) on delete set null,
  conciliado boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists conciliacao_ofx_conta_idx
  on public.conciliacao_ofx (conta_id);

alter table public.conciliacao_ofx enable row level security;

drop policy if exists "conciliacao_ofx_all" on public.conciliacao_ofx;
create policy "conciliacao_ofx_all"
  on public.conciliacao_ofx
  for all
  using (true)
  with check (true);



-- ############################################################################
-- >>> 043_paciente_exames.sql
-- ############################################################################

-- 043_paciente_exames.sql
-- CR-M19-H/I: exames anexados ao paciente (uploaded pela clínica ou pelo
-- próprio paciente via portal). Arquivos ficam no bucket
-- `exames-pacientes` (Supabase Storage); esta tabela mantém o índice.
--
-- Idempotente.

create table if not exists public.paciente_exames (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  nome text not null,
  tipo text null,
  url text not null,
  uploaded_by uuid null references public.usuarios(id) on delete set null,
  uploaded_pelo_paciente boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists paciente_exames_paciente_idx
  on public.paciente_exames (paciente_id);

alter table public.paciente_exames enable row level security;

drop policy if exists "paciente_exames_all" on public.paciente_exames;
create policy "paciente_exames_all"
  on public.paciente_exames
  for all
  using (true)
  with check (true);

-- Bucket de storage:
-- O Supabase Storage não pode ser criado via DDL do schema public; o admin do
-- projeto precisa criar o bucket `exames-pacientes` manualmente no dashboard
-- (Storage → New bucket, public = false). A API valida e lida com signed URLs.
-- [CONSOLIDADO - DESVIO (D)] Bloco DO/INSERT em storage.buckets ('exames-pacientes')
-- REMOVIDO do consolidado. Criar bucket via SQL exige ser dono de
-- storage.buckets (a role do SQL Editor do Supabase nao e) -> erro 42501
-- abortava o script. ACAO MANUAL no Supabase Dashboard:
--   Storage > New bucket: name = "exames-pacientes", Public = OFF (privado)
-- (O original sql/migrations/043_paciente_exames.sql NAO foi alterado.)



-- ############################################################################
-- >>> 044_documentos_gerados_assinatura.sql
-- ############################################################################

-- 044_documentos_gerados_assinatura.sql
-- TAREFA-065 (E1): permite assinar documentos clínicos gerados.
-- Espelha o esquema usado em prescricoes (migration 033): assinatura em
-- base64 PNG (data URL) + timestamp de quando o profissional confirmou.
--
-- Idempotente.

alter table public.documentos_gerados
  add column if not exists assinatura_base64 text null,
  add column if not exists assinado_em timestamptz null;

create index if not exists documentos_gerados_assinado_em_idx
  on public.documentos_gerados (assinado_em);



-- ############################################################################
-- >>> 045_conciliacao_ofx_tipo_fitid.sql
-- ############################################################################

-- 045_conciliacao_ofx_tipo_fitid.sql
-- Atualiza CR-M19-D após análise de arquivos reais (Bradesco SGML + Sicredi XML).
-- Adiciona:
--   tipo  — 'CREDIT' | 'DEBIT' (extraído de TRNTYPE)
--   fitid — ID único da transação no extrato (extraído de FITID)
-- Constraint de unicidade (conta_id, fitid) evita reimportação duplicada
-- quando o usuário roda o mesmo OFX duas vezes.
--
-- Idempotente.

alter table public.conciliacao_ofx
  add column if not exists tipo text null,
  add column if not exists fitid text null;

-- Constraint de check em tipo (apenas valores aceitos quando preenchido)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conciliacao_ofx_tipo_check'
  ) then
    alter table public.conciliacao_ofx
      add constraint conciliacao_ofx_tipo_check
      check (tipo is null or tipo in ('CREDIT', 'DEBIT'));
  end if;
end$$;

-- Unicidade por conta + fitid — somente quando ambos preenchidos.
-- (Permite NULLs para conciliações importadas sem FITID, ex.: CSV.)
create unique index if not exists conciliacao_ofx_conta_fitid_unique
  on public.conciliacao_ofx (conta_id, fitid)
  where fitid is not null;



-- ############################################################################
-- >>> 046_agendamento_status_disponivel.sql
-- ############################################################################

-- 046_agendamento_status_disponivel.sql
-- Adiciona o valor 'Disponível' ao enum public.agendamento_status para
-- permitir geração em lote de slots livres (sem paciente) via
-- POST /api/agenda/gerar. Slots gerados servem como horários abertos
-- na grade do dia para que o usuário (recepção/gestor) clique e crie o
-- agendamento real preenchendo o paciente.
--
-- IMPORTANTE: ALTER TYPE ADD VALUE não pode rodar dentro de transação.
-- Rode este arquivo no SQL editor do Supabase sem envolver em BEGIN/COMMIT.

alter type public.agendamento_status add value if not exists 'Disponível';



-- ############################################################################
-- >>> 047_estoque_tipo_movimentacao.sql
-- ############################################################################

-- 047_estoque_tipo_movimentacao.sql
-- Adiciona o discriminador `tipo_movimentacao` em movimentacoes_estoque para
-- permitir distinguir saídas avulsas (vinculadas ou não a clientes) de
-- consumo interno da clínica (uso administrativo, descarte, atendimento sem
-- prescrição). O campo `tipo` (entrada/saida) continua sendo a fonte de
-- verdade para impacto no saldo — o novo campo é apenas semântico para
-- relatórios e segregação no fluxo de gestão.
--
-- Idempotente: pode ser rodada em transação normal.

alter table public.movimentacoes_estoque
  add column if not exists tipo_movimentacao text not null default 'saida'
    check (tipo_movimentacao in ('saida', 'consumo_interno', 'entrada'));

create index if not exists movimentacoes_estoque_tipo_idx
  on public.movimentacoes_estoque (tipo_movimentacao);



-- ############################################################################
-- >>> 048_recepcao_especialistas_permitidos.sql
-- ############################################################################

-- 048_recepcao_especialistas_permitidos.sql
-- Adiciona o vínculo "uma recepcionista enxerga só essas agendas" no usuário.
-- A coluna é uma lista opcional de profissional_ids; quando NULL, a recepção
-- continua vendo todos os agendamentos da unidade (comportamento atual).
-- Quando preenchida, a API de agenda restringe os agendamentos retornados
-- aos especialistas listados.
--
-- Idempotente — pode ser rodada em transação normal.

alter table public.usuarios
  add column if not exists especialistas_permitidos uuid[] null;

comment on column public.usuarios.especialistas_permitidos is
  'Para perfil recepcao: lista de profissional_ids cujas agendas esta recepcionista pode ver. NULL = ver todos.';



-- ############################################################################
-- >>> 049_permissoes_fix.sql
-- ############################################################################

-- 049_permissoes_fix.sql
-- Corrige lacunas no seed de 004_permission_defaults.sql identificadas após
-- entrega da CR-REV-J (Dashboard Admin) e do uso real do sistema.
--
-- Problemas tratados:
--   1) Admin (proprietário da clínica) sem `read` em recursos clínicos/operacionais
--      — bloqueava acesso a pacientes, prescrições, lista de espera, estoque,
--      anamnese, prontuários, evoluções, documentação, tarefas. Sem leitura
--      ampla, o dashboard executivo do admin retorna 403 ao clicar nos atalhos.
--   2) Gestor sem permissão em `caixa` e `tarefas` — mas é o responsável operacional.
--   3) Especialista sem `repasse.read` — não conseguia ver os próprios repasses.
--   4) Recepção sem `prescricoes.update` — só podia criar, não editar/cancelar.
--   5) DELETE em recursos clínicos (anamnese, prontuários, evoluções,
--      documentacao/templates) — rotas exigiam *.delete mas NENHUM perfil tinha
--      essa permissão (nem o master). Modais "Excluir" da UI tomavam 403 silencioso.
--   6) `pacientes.delete` só existia para master — UI de gestor e recepção tem
--      `excluir-paciente-modal` mas a ação dava 403.
--   7) Paciente não enxergava "Prescrição/Vendas" e "Documentos" no sidebar:
--      o sidebar-builder mapeava esses itens para `prescricoes` e `portal.historico`,
--      mas o paciente só tem permissões `portal.*`. Criamos recursos próprios
--      `portal.prescricoes` e `portal.documentos` e concedemos ao paciente.
--
-- Idempotente — usa LEFT JOIN/NOT EXISTS em vez de ON CONFLICT, para
-- funcionar mesmo em instâncias onde o unique constraint nominal não existe
-- (ex.: tabela criada antes da declaração `unique` na coluna).

-- 7) Cadastrar recursos novos do portal
insert into public.recursos (codigo, descricao)
select v.codigo, v.descricao
from (values
  ('portal.prescricoes', 'Prescrições do paciente (portal)'),
  ('portal.documentos',  'Documentos do paciente (portal)')
) as v(codigo, descricao)
where not exists (
  select 1 from public.recursos r where r.codigo = v.codigo
);

-- Demais permissões: insert apenas onde a tripla (perfil, recurso, acao) ainda não existir
with novas_permissoes (perfil, recurso, acoes) as (
  values
    -- 1) Admin: read em todo o domínio clínico e operacional (visão executiva)
    ('admin'::public.user_role, 'pacientes',     array['read']),
    ('admin'::public.user_role, 'anamnese',      array['read']),
    ('admin'::public.user_role, 'prontuarios',   array['read']),
    ('admin'::public.user_role, 'evolucoes',     array['read']),
    ('admin'::public.user_role, 'documentacao',  array['read']),
    ('admin'::public.user_role, 'prescricoes',   array['read']),
    ('admin'::public.user_role, 'estoque',       array['read']),
    ('admin'::public.user_role, 'lista-espera',  array['read']),
    ('admin'::public.user_role, 'tarefas',       array['read']),

    -- 2) Gestor: ganha caixa CRU (alinhado a financeiro/repasse) e tarefas CRUD
    ('gestor'::public.user_role, 'caixa',   array['read','create','update']),
    ('gestor'::public.user_role, 'tarefas', array['read','create','update','delete']),

    -- 3) Especialista: lê os próprios repasses
    ('especialista'::public.user_role, 'repasse', array['read']),

    -- 4) Recepção: editar prescrição que criou + apagar tarefa que criou
    ('recepcao'::public.user_role, 'prescricoes', array['update']),
    ('recepcao'::public.user_role, 'tarefas',     array['delete']),

    -- 5) DELETEs clínicos — backend filtra por profissional_id no especialista,
    --    então cada um só consegue excluir o que é seu
    ('master'::public.user_role,       'anamnese',     array['delete']),
    ('master'::public.user_role,       'prontuarios',  array['delete']),
    ('master'::public.user_role,       'evolucoes',    array['delete']),
    ('master'::public.user_role,       'documentacao', array['delete']),
    ('especialista'::public.user_role, 'anamnese',     array['delete']),
    ('especialista'::public.user_role, 'prontuarios',  array['delete']),
    ('especialista'::public.user_role, 'evolucoes',    array['delete']),

    -- 6) Excluir templates de documentos: admin e gestor administram a clínica
    ('admin'::public.user_role,  'documentacao', array['delete']),
    ('gestor'::public.user_role, 'documentacao', array['delete']),

    -- 7) Excluir paciente: gestor e recepção operam o cadastro
    ('gestor'::public.user_role,   'pacientes', array['delete']),
    ('recepcao'::public.user_role, 'pacientes', array['delete']),

    -- 8) Portal do paciente — recursos novos
    ('paciente'::public.user_role, 'portal.prescricoes', array['read']),
    ('paciente'::public.user_role, 'portal.documentos',  array['read'])
),
expandido as (
  select np.perfil, r.id as recurso_id, acao
  from novas_permissoes np
  join public.recursos r on r.codigo = np.recurso
  cross join unnest(np.acoes) as acao
)
insert into public.perfil_permissoes (perfil, recurso_id, acao)
select e.perfil, e.recurso_id, e.acao
from expandido e
where not exists (
  select 1
  from public.perfil_permissoes pp
  where pp.perfil = e.perfil
    and pp.recurso_id = e.recurso_id
    and pp.acao = e.acao
);



-- ############################################################################
-- >>> 052_cartoes_empresariais.sql
-- ############################################################################

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



-- ############################################################################
-- >>> 053_financeiro_vencimento.sql
-- ############################################################################

-- 053_financeiro_vencimento.sql
-- TAREFA-054: adicionar coluna `vencimento` em financeiro_lancamentos
-- para suportar bloco de Inadimplência no AdminDashboard.
--
-- Idempotente.

alter table public.financeiro_lancamentos
  add column if not exists vencimento date null;

comment on column public.financeiro_lancamentos.vencimento is
  'Data de vencimento do lançamento a receber. NULL = sem prazo definido.';

create index if not exists financeiro_lancamentos_vencimento_idx
  on public.financeiro_lancamentos(vencimento)
  where vencimento is not null;



-- ############################################################################
-- >>> 054_movimentacoes_nf_campos.sql
-- ############################################################################

-- 054_movimentacoes_nf_campos.sql
-- TAREFA-EST-01: campos estruturados de NF para detecção de duplicata
-- na importação de XML de compra (substitui concatenação em `observacoes`).
--
-- Idempotente.

alter table public.movimentacoes_estoque
  add column if not exists numero_nf text null,
  add column if not exists cnpj_emitente text null;

create index if not exists movimentacoes_estoque_nf_idx
  on public.movimentacoes_estoque(numero_nf, cnpj_emitente)
  where numero_nf is not null;



-- ############################################################################
-- >>> 055_movimentacoes_estorno.sql
-- ############################################################################

-- 055_movimentacoes_estorno.sql
-- TAREFA-EST-05: campos para estorno de movimentações de estoque
-- e link para a movimentação de compensação criada.
--
-- Idempotente.

alter table public.movimentacoes_estoque
  add column if not exists estornada boolean not null default false,
  add column if not exists estorno_motivo text null,
  add column if not exists estornada_em timestamptz null,
  add column if not exists estorno_por uuid null references public.usuarios(id) on delete set null,
  add column if not exists movimentacao_origem_id uuid null
    references public.movimentacoes_estoque(id) on delete set null;

comment on column public.movimentacoes_estoque.movimentacao_origem_id is
  'Se preenchido, esta movimentação é uma compensação (estorno) da movimentação referenciada.';

create index if not exists movimentacoes_estoque_origem_idx
  on public.movimentacoes_estoque(movimentacao_origem_id)
  where movimentacao_origem_id is not null;



-- ############################################################################
-- >>> 056_whatsapp_disparos.sql
-- ############################################################################

-- 056_whatsapp_disparos.sql
-- TAREFA-WPP-01: fila de disparos automáticos de WhatsApp (Evolution API).
-- Tipos: 'lembrete_consulta' | 'pos_consulta' | 'aniversario' | 'campanha'.
-- Status: 'pendente' | 'enviado' | 'erro'.
--
-- Idempotente.

create table if not exists public.whatsapp_disparos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  agendamento_id uuid null references public.agendamentos(id) on delete set null,
  paciente_id uuid null references public.pacientes(id) on delete set null,
  telefone text not null,
  mensagem text not null,
  status text not null default 'pendente',
  erro_detalhe text null,
  agendado_para timestamptz not null,
  enviado_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists whatsapp_disparos_status_idx on public.whatsapp_disparos(status, agendado_para);
create index if not exists whatsapp_disparos_paciente_idx on public.whatsapp_disparos(paciente_id);

-- Índice UNIQUE em (agendamento_id, tipo): suporta o upsert de `agendar_lembrete`
-- (onConflict: 'agendamento_id,tipo') evitando lembrete duplicado por agendamento.
-- Linhas com agendamento_id NULL (campanha/aniversário) não colidem entre si,
-- pois o Postgres trata NULLs como distintos em índices únicos.
-- Substitui o índice não-único anterior (idempotente para bancos já migrados).
drop index if exists public.whatsapp_disparos_agendamento_tipo_idx;
create unique index if not exists whatsapp_disparos_agendamento_tipo_idx
  on public.whatsapp_disparos(agendamento_id, tipo);

alter table public.whatsapp_disparos enable row level security;
drop policy if exists "whatsapp_disparos_all" on public.whatsapp_disparos;
create policy "whatsapp_disparos_all" on public.whatsapp_disparos for all using (true) with check (true);



-- ############################################################################
-- >>> 057_chatbot_sessoes.sql
-- ############################################################################

-- 057_chatbot_sessoes.sql
-- TAREFA-WPP-02: sessões do chatbot de agendamento via WhatsApp.
-- Estados: 'inicio' | 'aguardando_nome' | 'aguardando_especialista' |
--          'aguardando_data' | 'aguardando_hora' | 'confirmando' |
--          'concluido' | 'encerrado'.
-- Sessões com ultima_interacao > 30 min são tratadas como expiradas (lógica na API).
--
-- Idempotente.

create table if not exists public.chatbot_sessoes (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  paciente_id uuid null references public.pacientes(id) on delete set null,
  estado text not null default 'inicio',
  contexto jsonb not null default '{}',
  ultima_interacao timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists chatbot_sessoes_telefone_idx
  on public.chatbot_sessoes(telefone);

alter table public.chatbot_sessoes enable row level security;
drop policy if exists "chatbot_sessoes_all" on public.chatbot_sessoes;
create policy "chatbot_sessoes_all" on public.chatbot_sessoes for all using (true) with check (true);



-- ############################################################################
-- >>> 058_pagamentos_online.sql
-- ############################################################################

-- 058_pagamentos_online.sql
-- TAREFA-FIN-01: cobranças online via Cielo (cartão) e Sicredi (Pix).
-- gateway: 'cielo' | 'sicredi' · tipo: 'cartao_credito' | 'cartao_debito' | 'pix'
-- status: 'pendente' | 'autorizado' | 'capturado' | 'cancelado' | 'erro'
--
-- Idempotente.

create table if not exists public.pagamentos_online (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid null references public.agendamentos(id) on delete set null,
  lancamento_id uuid null references public.financeiro_lancamentos(id) on delete set null,
  gateway text not null,
  gateway_id text null,
  tipo text not null,
  valor numeric(12,2) not null,
  status text not null default 'pendente',
  qr_code text null,
  qr_code_copia_cola text null,
  link_pagamento text null,
  payload_gateway jsonb null,
  webhook_payload jsonb null,
  pago_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pagamentos_online_agendamento_idx on public.pagamentos_online(agendamento_id);
create index if not exists pagamentos_online_gateway_id_idx on public.pagamentos_online(gateway, gateway_id);
create index if not exists pagamentos_online_status_idx on public.pagamentos_online(status);

alter table public.pagamentos_online enable row level security;
drop policy if exists "pagamentos_online_all" on public.pagamentos_online;
create policy "pagamentos_online_all" on public.pagamentos_online for all using (true) with check (true);



-- ############################################################################
-- >>> 060_rls_all_tables.sql
-- ############################################################################

-- ============================================================================
-- Migration 060 · Row Level Security (RLS) global · "deny-by-default"
-- ============================================================================
--
-- CONTEXTO
-- O projeto usa autenticação própria (JWT customizado via `jose`, cookie
-- `integrallys_token`) — NÃO usa Supabase Auth, portanto `auth.uid()` não
-- existe no contexto das requisições.
--
-- Toda a API Next.js acessa o banco com a chave `service_role`
-- (SUPABASE_SERVICE_ROLE_KEY via getAppSupabase()). O `service_role` BYPASSA
-- RLS por definição do PostgreSQL — logo a API continua funcionando
-- normalmente após esta migration.
--
-- O objetivo aqui é fechar o acesso direto de quem usa as chaves `anon` /
-- `authenticated` (Supabase Studio, REST público, SDK no browser): com RLS
-- habilitado e SEM nenhuma policy criada, esses papéis não conseguem
-- selecionar/inserir/atualizar/deletar nada.
--
-- ESTRATÉGIA
--   Habilitar RLS + NÃO criar policy  ==  negar tudo para anon/authenticated.
--   (NUNCA usar `USING (true)`: equivale a NÃO ter RLS.)
--
-- IDEMPOTÊNCIA
--   - Habilitar RLS via ALTER TABLE é no-op se a tabela já estiver com RLS
--     ligado (PostgreSQL não gera erro ao reexecutar) — não existe sintaxe
--     IF NOT EXISTS para esse comando.
--   - O DROP de policy usa a cláusula IF EXISTS, e REVOKE não gera erro ao
--     revogar privilégio inexistente — ambos idempotentes por natureza.
--   Esta migration pode rodar quantas vezes for necessário sem erro.
--
-- ORDEM
--   1) 30 tabelas do schema principal — habilitar RLS
--   2) 9 tabelas que já tinham RLS com policy permissiva — remover a policy
--   3) REVOKE nas 4 funções SECURITY DEFINER (uso restrito ao service_role)
-- ============================================================================


-- ============================================================================
-- 1) SCHEMA PRINCIPAL — habilitar RLS nas 30 tabelas sem proteção
-- ============================================================================
-- Nenhuma policy é criada de propósito: sem policy + RLS ligado = acesso
-- negado para anon/authenticated. O service_role da API continua passando.

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_repasse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dre_demonstrativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescricao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2) TABELAS COM RLS JÁ HABILITADO — remover policies permissivas
-- ============================================================================
-- Estas tabelas já tinham RLS ligado, porém com policy `FOR ALL USING (true)
-- WITH CHECK (true)` — o que ANULA a proteção (libera tudo para qualquer
-- papel). Removemos a policy permissiva e NÃO criamos nenhuma no lugar,
-- caindo no mesmo padrão "deny-by-default" da seção 1.
-- RLS já está habilitado nestas tabelas, então NÃO há ALTER TABLE aqui.

-- agenda_bloqueios  (criada na migration 038)
DROP POLICY IF EXISTS "bloqueios_clinica_all" ON public.agenda_bloqueios;

-- contas_bancarias  (criada na migration 041)
DROP POLICY IF EXISTS "contas_bancarias_all" ON public.contas_bancarias;

-- conciliacao_ofx  (criada na migration 042)
DROP POLICY IF EXISTS "conciliacao_ofx_all" ON public.conciliacao_ofx;

-- paciente_exames  (criada na migration 043)
DROP POLICY IF EXISTS "paciente_exames_all" ON public.paciente_exames;

-- cartoes_empresariais  (criada na migration 052)
DROP POLICY IF EXISTS "cartoes_empresariais_all" ON public.cartoes_empresariais;

-- cartao_movimentos  (criada na migration 052)
DROP POLICY IF EXISTS "cartao_movimentos_all" ON public.cartao_movimentos;

-- whatsapp_disparos  (criada na migration 056)
DROP POLICY IF EXISTS "whatsapp_disparos_all" ON public.whatsapp_disparos;

-- chatbot_sessoes  (criada na migration 057)
DROP POLICY IF EXISTS "chatbot_sessoes_all" ON public.chatbot_sessoes;

-- pagamentos_online  (criada na migration 058)
DROP POLICY IF EXISTS "pagamentos_online_all" ON public.pagamentos_online;


-- ============================================================================
-- 3) FUNÇÕES SECURITY DEFINER — restringir ao service_role
-- ============================================================================
-- Estas funções rodam com privilégios do owner (SECURITY DEFINER) e são
-- chamadas APENAS pela API via service_role. Revogamos a permissão de
-- execução de anon/authenticated para que não sejam invocáveis direto pelo
-- Studio/REST público. Definições originais na migration 001 (assinaturas
-- confirmadas: parâmetro único `uuid`, exceto can_user `uuid, text, text`).
-- REVOKE é idempotente — revogar privilégio inexistente não gera erro.

REVOKE ALL ON FUNCTION public.touch_ultimo_login(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_permissions(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.can_user(uuid, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_auth_me_payload(uuid) FROM anon, authenticated;


-- ============================================================================
-- DIAGNÓSTICO (rodar manualmente no Supabase Studio para verificar)
-- ============================================================================
-- Confirma que TODAS as tabelas do schema public têm RLS habilitado:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- Esperado: rowsecurity = true para todas as linhas
--
-- Confirma que nenhuma tabela ficou com policy permissiva sobrando:
--
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- Esperado: nenhuma linha (zero policies = deny-by-default em toda a base)
--
-- Confirma que as funções SECURITY DEFINER não têm EXECUTE para anon/auth:
--
-- SELECT p.proname,
--        has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
--        has_function_privilege('authenticated',  p.oid, 'EXECUTE') AS auth_exec
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('touch_ultimo_login','get_user_permissions',
--                      'can_user','get_auth_me_payload');
-- Esperado: anon_exec = false e auth_exec = false em todas as linhas
-- ============================================================================

