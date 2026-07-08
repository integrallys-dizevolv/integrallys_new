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
alter type public.agendamento_status rename value 'Em atendimento' to 'Em Atendimento';

-- Adiciona os valores que faltavam no fluxo da TAREFA-002.
alter type public.agendamento_status add value if not exists 'Check-in';
alter type public.agendamento_status add value if not exists 'Check-out';
alter type public.agendamento_status add value if not exists 'Em Atraso';
