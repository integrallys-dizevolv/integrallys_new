-- ============================================================================
-- Migration 079 · Fundação do cadastro de Profissionais
-- ============================================================================
-- Profissional = usuario com perfil='especialista' (não existe tabela própria;
-- regras_repasse/repasses/agendamentos já FKam profissional_id -> usuarios(id)).
-- Esta migration adiciona a FUNDAÇÃO que a Fase 2 (gerar agenda) vai consumir:
--
--   1) public.profissional_horarios     — grade semanal por profissional (dias
--      atendidos, turno manhã/tarde, janela e duração por turno).
--   2) public.profissional_procedimentos — junção N:N profissional <-> procedimento.
--
-- RECURSO: cria o recurso de FEATURE 'profissionais' (não reusa 'usuarios').
-- Os recursos deste sistema são por TELA/feature (dashboard, comunicacao,
-- procedimentos...), não por tabela — ver 073/076. A tela "Profissionais" é o
-- análogo direto da tela "Procedimentos" (076), então ganha recurso próprio. O
-- sidebar (itemToResource → href) e as rotas (requirePermission) passam a gatear
-- por 'profissionais', independente do recurso 'usuarios'. A rota grava em
-- usuarios apenas perfil='especialista' (mais restrita que /api/usuarios).
--
-- GRANTS:
--   master, admin  → read, create, update, delete
--   gestor         → read, create, update            (gerente operacional, sem delete)
--   recepcao, especialista, paciente → (nenhum)       (consomem especialistas via /api/usuarios)
-- Para master/admin os grants são redundantes (curto-circuito da 075) — ficam
-- como fallback consistente com 073/076 e corretos caso a 075 seja revertida.
-- Para gestor os grants SÃO a fonte da permissão.
--
-- RLS: enable sem policy = deny-by-default para anon/authenticated; o service_role
-- (getServiceSupabase) ignora RLS por design — alinhado à 060_rls_all_tables.
--
-- IDEMPOTENTE: create table if not exists; NOT EXISTS no recurso e nos grants
-- (a unique de perfil_permissoes é parcial — unidade_id IS NULL — desde a 008,
-- então não se usa ON CONFLICT).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) profissional_horarios — grade semanal por profissional
--    dia_semana: 0=Dom .. 6=Sáb, alinhado ao getDay() de api/agenda/gerar/route.ts
-- ---------------------------------------------------------------------------
create table if not exists public.profissional_horarios (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  unidade_id uuid null references public.unidades(id) on delete set null,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  turno text not null check (turno in ('manha', 'tarde')),
  hora_inicio time not null,
  hora_fim time not null check (hora_fim > hora_inicio),
  duracao_min int not null check (duracao_min > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profissional_horarios_prof_dia_turno_unique
    unique (profissional_id, dia_semana, turno)
);

create index if not exists idx_profissional_horarios_profissional
  on public.profissional_horarios (profissional_id);
create index if not exists idx_profissional_horarios_unidade
  on public.profissional_horarios (unidade_id);

drop trigger if exists profissional_horarios_set_updated_at on public.profissional_horarios;
create trigger profissional_horarios_set_updated_at
before update on public.profissional_horarios
for each row execute function public.set_updated_at();

alter table public.profissional_horarios enable row level security;

-- ---------------------------------------------------------------------------
-- 2) profissional_procedimentos — procedimentos que o profissional atende
-- ---------------------------------------------------------------------------
create table if not exists public.profissional_procedimentos (
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  procedimento_id uuid not null references public.procedimentos(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profissional_id, procedimento_id)
);

create index if not exists idx_profissional_procedimentos_procedimento
  on public.profissional_procedimentos (procedimento_id);

alter table public.profissional_procedimentos enable row level security;

-- ---------------------------------------------------------------------------
-- 3) Recurso 'profissionais' (feature) + grants
-- ---------------------------------------------------------------------------
insert into public.recursos (codigo, descricao)
select 'profissionais', 'Cadastro de profissionais (especialistas: horários e procedimentos)'
where not exists (select 1 from public.recursos where codigo = 'profissionais');

insert into public.perfil_permissoes (perfil, recurso_id, acao)
select g.perfil::public.user_role, r.id, g.acao
from public.recursos r
cross join (values
  ('master', 'read'), ('master', 'create'), ('master', 'update'), ('master', 'delete'),
  ('admin', 'read'),  ('admin', 'create'),  ('admin', 'update'),  ('admin', 'delete'),
  ('gestor', 'read'), ('gestor', 'create'), ('gestor', 'update')
) as g(perfil, acao)
where r.codigo = 'profissionais'
  and not exists (
    select 1 from public.perfil_permissoes pp
    where pp.perfil = g.perfil::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = g.acao
      and pp.unidade_id is null
  );

commit;

-- VERIFICAÇÃO:
-- select pp.perfil, pp.acao from public.perfil_permissoes pp
-- join public.recursos r on r.id = pp.recurso_id
-- where r.codigo = 'profissionais' order by pp.perfil, pp.acao;
