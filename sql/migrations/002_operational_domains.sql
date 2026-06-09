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
