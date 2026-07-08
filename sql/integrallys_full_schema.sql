-- Integrallys v2
-- Schema completo do app para PostgreSQL / Supabase
-- Derivado do estado atual do frontend, hooks e rotas API.
-- Não executa seeds de dados de negócio; cobre estrutura, índices e helpers.

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
  if not exists (select 1 from pg_type where typname = 'paciente_status') then
    create type public.paciente_status as enum ('Ativo','Inativo','Aguardando','Alta');
  end if;
  if not exists (select 1 from pg_type where typname = 'agendamento_status') then
    create type public.agendamento_status as enum ('Agendado','Confirmado','Check-in','Em Atendimento','Check-out','Concluído','Cancelado','Em Atraso','Faltou','Bloqueado','Adiado');
  end if;
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
  if not exists (select 1 from pg_type where typname = 'prontuario_status') then
    create type public.prontuario_status as enum ('Aberto','Fechado','Em revisão','Arquivado');
  end if;
  if not exists (select 1 from pg_type where typname = 'documento_meio') then
    create type public.documento_meio as enum ('digital','fisico','assinatura');
  end if;
  if not exists (select 1 from pg_type where typname = 'pagamento_status') then
    create type public.pagamento_status as enum ('Pendente','Pago','Vencido','Cancelado');
  end if;
  if not exists (select 1 from pg_type where typname = 'notificacao_kind') then
    create type public.notificacao_kind as enum ('agenda', 'financeiro', 'lista_espera', 'pagamento', 'prescricao');
  end if;
  if not exists (select 1 from pg_type where typname = 'dre_periodo_tipo') then
    create type public.dre_periodo_tipo as enum ('mensal', 'trimestral', 'anual');
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
  unidade_id uuid null references public.unidades(id) on delete cascade,
  recurso_id uuid not null references public.recursos(id) on delete cascade,
  acao text not null,
  created_at timestamptz not null default timezone('utc', now())
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

create table if not exists public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  chave text not null,
  valor text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint configuracoes_categoria_chave_unique unique (categoria, chave)
);

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
  sexo text null,
  rg text null,
  inscricao_estadual text null,
  origem text null,
  vinculo_tipo text null default 'cliente',
  photo_url text null,
  cep text null,
  logradouro text null,
  numero text null,
  complemento text null,
  bairro text null,
  cidade text null,
  estado text null,
  necessidades_especiais jsonb null,
  responsavel jsonb null,
  financeiro jsonb null,
  fornecedor_dados jsonb null,
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists pacientes_sexo_idx on public.pacientes (sexo);
create index if not exists pacientes_vinculo_tipo_idx on public.pacientes (vinculo_tipo);
create index if not exists pacientes_unidade_idx on public.pacientes (unidade_id);

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
  especialista text null,
  procedimento text null,
  preferencia_horario text null,
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
  sessao_id uuid null,
  descricao text not null,
  tipo public.movimento_caixa_tipo not null,
  valor numeric(12,2) not null check (valor >= 0),
  forma text null default 'dinheiro',
  origem text null default 'manual',
  operador_nome text null,
  data_movimento timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid null references public.unidades(id) on delete set null,
  usuario_id uuid null references public.usuarios(id) on delete set null,
  descricao text not null,
  categoria text not null,
  valor numeric(12,2) not null check (valor >= 0),
  tipo public.financeiro_tipo not null,
  data_lancamento timestamptz not null default timezone('utc', now()),
  competencia date null,
  metodo text null,
  status text not null default 'Pendente',
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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
  drop constraint if exists caixa_movimentos_sessao_id_fkey;

alter table public.caixa_movimentos
  add constraint caixa_movimentos_sessao_id_fkey
  foreign key (sessao_id) references public.caixa_sessoes(id) on delete set null;

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

create table if not exists public.prescricoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  vendedor_id uuid null references public.usuarios(id) on delete set null,
  numero text not null unique,
  status text not null default 'Pendente',
  tipo text null,
  valor_total numeric(12,2) not null default 0,
  valor_bruto numeric(12,2) null,
  numero_parcelas int null check (numero_parcelas is null or (numero_parcelas between 1 and 12)),
  valor_parcela numeric(12,2) null check (valor_parcela is null or valor_parcela >= 0),
  desconto_tipo text null check (desconto_tipo is null or desconto_tipo in ('value', 'percent')),
  desconto_percentual numeric(5,2) null check (desconto_percentual is null or (desconto_percentual >= 0 and desconto_percentual <= 100)),
  desconto_valor numeric(12,2) null check (desconto_valor is null or desconto_valor >= 0),
  justificativa_desconto text null,
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
  posologia text null,
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

create index if not exists usuarios_unidade_idx on public.usuarios (unidade_id);
create index if not exists usuarios_perfil_idx on public.usuarios (perfil);
create index if not exists usuarios_status_idx on public.usuarios (status);
create index if not exists notificacoes_usuario_idx on public.notificacoes (usuario_id);
create index if not exists notificacoes_usuario_lida_idx on public.notificacoes (usuario_id, lida);
create index if not exists notificacoes_ocorrido_em_idx on public.notificacoes (ocorrido_em desc);
create index if not exists pacientes_unidade_idx on public.pacientes (unidade_id);
create index if not exists pacientes_status_idx on public.pacientes (status);
create unique index if not exists pacientes_usuario_unique_idx on public.pacientes (usuario_id) where usuario_id is not null;
create unique index if not exists perfil_permissoes_global_unique_idx on public.perfil_permissoes (perfil, recurso_id, acao) where unidade_id is null;
create unique index if not exists perfil_permissoes_unidade_unique_idx on public.perfil_permissoes (perfil, unidade_id, recurso_id, acao) where unidade_id is not null;
create index if not exists agendamentos_data_idx on public.agendamentos (data_agendamento);
create index if not exists agendamentos_paciente_idx on public.agendamentos (paciente_id);
create index if not exists agendamentos_profissional_idx on public.agendamentos (profissional_id);
create index if not exists lista_espera_prioridade_idx on public.lista_espera (prioridade);
create index if not exists tarefas_responsavel_idx on public.tarefas (responsavel_id);
create index if not exists caixa_movimentos_data_idx on public.caixa_movimentos (data_movimento desc);
create index if not exists caixa_movimentos_sessao_idx on public.caixa_movimentos (sessao_id);
create index if not exists caixa_sessoes_data_idx on public.caixa_sessoes (data_operacao desc);
create index if not exists caixa_sessoes_status_idx on public.caixa_sessoes (status);
create index if not exists financeiro_lancamentos_tipo_idx on public.financeiro_lancamentos (tipo);
create index if not exists financeiro_lancamentos_data_idx on public.financeiro_lancamentos (data_lancamento desc);
create index if not exists repasses_profissional_idx on public.repasses (profissional_id);
create unique index if not exists dre_demonstrativos_global_unique_idx on public.dre_demonstrativos (periodo_tipo, referencia, visao) where unidade_id is null;
create unique index if not exists dre_demonstrativos_unidade_unique_idx on public.dre_demonstrativos (unidade_id, periodo_tipo, referencia, visao) where unidade_id is not null;
create index if not exists dre_demonstrativos_referencia_idx on public.dre_demonstrativos (referencia desc);
create index if not exists produtos_estoque_categoria_idx on public.produtos_estoque (categoria);
create index if not exists prescricoes_paciente_idx on public.prescricoes (paciente_id);
create index if not exists prescricoes_vendedor_idx on public.prescricoes (vendedor_id);
create index if not exists prontuarios_paciente_idx on public.prontuarios (paciente_id);
create index if not exists evolucoes_paciente_idx on public.evolucoes (paciente_id);
create index if not exists documentos_clinicos_paciente_idx on public.documentos_clinicos (paciente_id);
create index if not exists cartoes_paciente_paciente_idx on public.cartoes_paciente (paciente_id);
create index if not exists pagamentos_paciente_paciente_idx on public.pagamentos_paciente (paciente_id);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

drop trigger if exists unidades_set_updated_at on public.unidades;
create trigger unidades_set_updated_at before update on public.unidades for each row execute function public.set_updated_at();
drop trigger if exists usuarios_set_updated_at on public.usuarios;
create trigger usuarios_set_updated_at before update on public.usuarios for each row execute function public.set_updated_at();
drop trigger if exists configuracoes_set_updated_at on public.configuracoes;
create trigger configuracoes_set_updated_at before update on public.configuracoes for each row execute function public.set_updated_at();
drop trigger if exists procedimentos_set_updated_at on public.procedimentos;
create trigger procedimentos_set_updated_at before update on public.procedimentos for each row execute function public.set_updated_at();
drop trigger if exists notificacoes_set_updated_at on public.notificacoes;
create trigger notificacoes_set_updated_at before update on public.notificacoes for each row execute function public.set_updated_at();
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
drop trigger if exists caixa_sessoes_set_updated_at on public.caixa_sessoes;
create trigger caixa_sessoes_set_updated_at before update on public.caixa_sessoes for each row execute function public.set_updated_at();
drop trigger if exists financeiro_lancamentos_set_updated_at on public.financeiro_lancamentos;
create trigger financeiro_lancamentos_set_updated_at before update on public.financeiro_lancamentos for each row execute function public.set_updated_at();
drop trigger if exists regras_repasse_set_updated_at on public.regras_repasse;
create trigger regras_repasse_set_updated_at before update on public.regras_repasse for each row execute function public.set_updated_at();
drop trigger if exists repasses_set_updated_at on public.repasses;
create trigger repasses_set_updated_at before update on public.repasses for each row execute function public.set_updated_at();
drop trigger if exists relatorios_set_updated_at on public.relatorios;
create trigger relatorios_set_updated_at before update on public.relatorios for each row execute function public.set_updated_at();
drop trigger if exists dre_demonstrativos_set_updated_at on public.dre_demonstrativos;
create trigger dre_demonstrativos_set_updated_at before update on public.dre_demonstrativos for each row execute function public.set_updated_at();
drop trigger if exists produtos_estoque_set_updated_at on public.produtos_estoque;
create trigger produtos_estoque_set_updated_at before update on public.produtos_estoque for each row execute function public.set_updated_at();
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
    select id, perfil, unidade_id from public.usuarios where id = p_usuario_id and status = 'Ativo'
  ),
  role_allows as (
    select r.codigo as resource, pp.acao, 'allow'::public.permission_effect as efeito
    from base_user bu
    join public.perfil_permissoes pp on pp.perfil = bu.perfil
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

comment on table public.usuarios is 'Usuários autenticáveis do Integrallys. O login Next.js lê desta tabela.';
comment on table public.pacientes is 'Cadastro principal de pacientes do app.';
comment on table public.notificacoes is 'Notificações persistidas por usuário, consumidas pelo sino global do app.';
comment on table public.agendamentos is 'Agenda compartilhada entre recepção, especialista e portal do paciente.';
comment on table public.prescricoes is 'Cabeçalho de prescrições clínicas e operacionais.';
comment on table public.prontuarios is 'Prontuários e registros clínicos estruturados.';
comment on table public.financeiro_lancamentos is 'Lançamentos financeiros usados pelas telas administrativas.';
comment on table public.dre_demonstrativos is 'Snapshots persistidos da DRE gerados pelo backend a partir dos lançamentos financeiros.';
comment on table public.audit_log is 'Log de auditoria centralizado do sistema.';
