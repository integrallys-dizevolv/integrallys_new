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
