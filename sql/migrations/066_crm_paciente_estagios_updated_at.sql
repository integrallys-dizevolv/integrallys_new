-- 066_crm_paciente_estagios_updated_at.sql
-- Fix do 500 em GET /api/pacientes.
--
-- O embed do PostgREST em src/app/api/pacientes/route.ts:74 pede:
--   crm:crm_paciente_estagios(estagio,observacoes,proxima_acao,data_proxima_acao,updated_at)
--
-- Em ambientes onde a migration 064_campanhas_whatsapp.sql criou
-- crm_paciente_estagios (schema mínimo: paciente_id, estagio, atualizado_em)
-- ANTES da 063_crm_estagios.sql (schema canônico de 9 colunas), a coluna
-- `updated_at` nunca foi adicionada — a 065_fix_064_crm_collision.sql deixou
-- esse ALTER comentado (065:63-81). Resultado: PostgREST retorna
-- 42703 "column crm_paciente_estagios.updated_at does not exist" → 500.
--
-- Esta migration alinha a tabela ao schema canônico da 063. Idempotente:
-- todas as colunas usam `add column if not exists`, então é no-op em
-- ambientes onde a 063 já criou a tabela completa.

alter table public.crm_paciente_estagios
  add column if not exists observacoes       text null,
  add column if not exists proxima_acao      text null,
  add column if not exists data_proxima_acao date null,
  add column if not exists responsavel_id    uuid null
    references public.usuarios(id) on delete set null,
  add column if not exists created_at        timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at        timestamptz not null default timezone('utc', now());

-- Se a tabela veio da 064 (coluna `atualizado_em`), propaga o valor histórico
-- para `updated_at` para não perder o timestamp de última atualização.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_paciente_estagios'
      and column_name = 'atualizado_em'
  ) then
    update public.crm_paciente_estagios
    set updated_at = atualizado_em
    where updated_at is distinct from atualizado_em;
  end if;
end $$;

-- Verificação (deve retornar 9 colunas, incluindo created_at e updated_at):
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'crm_paciente_estagios'
-- order by ordinal_position;
