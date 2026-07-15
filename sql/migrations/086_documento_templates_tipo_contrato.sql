-- 086_documento_templates_tipo_contrato.sql
-- Item 7c (infraestrutura) — habilitar 'contrato' como tipo de documento.
--
-- A 026 criou o check INLINE na coluna (sem nome explícito). O Postgres nomeia
-- checks de coluna únicos como <tabela>_<coluna>_check, ou seja
-- `documento_templates_tipo_check`. Nenhuma migration posterior tocou nesse
-- check (os tipos seguem os 6 originais), então esse é o nome real.
--
-- Padrão da 084: drop constraint if exists + add constraint (idempotente; o
-- Postgres não tem `add constraint if not exists`).

alter table public.documento_templates
  drop constraint if exists documento_templates_tipo_check;

alter table public.documento_templates
  add constraint documento_templates_tipo_check
  check (tipo in ('formulario', 'declaracao', 'laudo', 'encaminhamento',
                  'procedimento', 'dieta', 'contrato'));
