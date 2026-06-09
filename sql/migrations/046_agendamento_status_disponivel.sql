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
