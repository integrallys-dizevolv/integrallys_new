-- Migration 028 — Campo de conselho profissional em usuarios
-- Contexto:
--   * A variável #PROFISSIONAL_CONSELHO# usada nos templates de documento
--     (Declaração de Comparecimento, Encaminhamento, etc.) precisa de uma
--     fonte no schema. Ex.: "CRTH-BR 7452 CRTHE-BR 168873".
--   * Campo opcional — não obrigatório para perfis não-clínicos
--     (recepção, gestor, admin).

begin;

alter table public.usuarios
  add column if not exists conselho text null;

comment on column public.usuarios.conselho is
  'Registro(s) de conselho profissional do usuário (ex.: CRM, CRTH, CREFITO). '
  'Usado na geração de documentos clínicos via variável #PROFISSIONAL_CONSELHO#.';

commit;
