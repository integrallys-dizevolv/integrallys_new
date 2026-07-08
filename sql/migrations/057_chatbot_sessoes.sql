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
