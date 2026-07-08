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
