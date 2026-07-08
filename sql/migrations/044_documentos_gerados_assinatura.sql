-- 044_documentos_gerados_assinatura.sql
-- TAREFA-065 (E1): permite assinar documentos clínicos gerados.
-- Espelha o esquema usado em prescricoes (migration 033): assinatura em
-- base64 PNG (data URL) + timestamp de quando o profissional confirmou.
--
-- Idempotente.

alter table public.documentos_gerados
  add column if not exists assinatura_base64 text null,
  add column if not exists assinado_em timestamptz null;

create index if not exists documentos_gerados_assinado_em_idx
  on public.documentos_gerados (assinado_em);
