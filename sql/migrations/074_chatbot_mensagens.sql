-- ============================================================================
-- Migration 074 · chatbot_mensagens — transcript das conversas do chatbot
-- ============================================================================
-- Até aqui o webhook do WhatsApp processava as mensagens de forma stateful
-- (chatbot_sessoes.estado/contexto) mas NÃO guardava o conteúdo das mensagens,
-- então não havia como exibir a conversa na aba Comunicação > Chatbot.
-- Esta tabela registra cada turno (mensagem recebida 'in' e resposta enviada
-- 'out') por telefone, permitindo a tela de conversa. O histórico acumula a
-- partir de agora (sessões antigas não têm transcript).
--
-- RLS: deny-by-default (RLS habilitado, sem policy) — acesso só via service_role
-- (a API). IDEMPOTENTE: if not exists / enable RLS é no-op ao reexecutar.
-- ============================================================================

create table if not exists public.chatbot_mensagens (
  id         uuid primary key default gen_random_uuid(),
  telefone   text not null,
  direcao    text not null check (direcao in ('in', 'out')),
  conteudo   text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chatbot_mensagens_telefone_created
  on public.chatbot_mensagens (telefone, created_at);

alter table public.chatbot_mensagens enable row level security;
