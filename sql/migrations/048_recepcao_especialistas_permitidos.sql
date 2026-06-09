-- 048_recepcao_especialistas_permitidos.sql
-- Adiciona o vínculo "uma recepcionista enxerga só essas agendas" no usuário.
-- A coluna é uma lista opcional de profissional_ids; quando NULL, a recepção
-- continua vendo todos os agendamentos da unidade (comportamento atual).
-- Quando preenchida, a API de agenda restringe os agendamentos retornados
-- aos especialistas listados.
--
-- Idempotente — pode ser rodada em transação normal.

alter table public.usuarios
  add column if not exists especialistas_permitidos uuid[] null;

comment on column public.usuarios.especialistas_permitidos is
  'Para perfil recepcao: lista de profissional_ids cujas agendas esta recepcionista pode ver. NULL = ver todos.';
