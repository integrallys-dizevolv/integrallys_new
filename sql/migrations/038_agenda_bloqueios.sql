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
