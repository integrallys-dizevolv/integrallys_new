-- Migration 025 — Identidade da Clínica (configuração global por unidade)
-- Contexto:
--   * TAREFA-CR-REV-G exige tela "Configurações → Identidade da Clínica"
--     (acesso Gestor/Admin) com nome, logo, cores — usados em todos os
--     documentos gerados (atestados, laudos, recibos etc.).
--   * Também atende TAREFA-CR-M19-F / TAREFA-052, que precisam resolver as
--     variáveis #CLINICA_NOME#, #CLINICA_ENDERECO#, #CLINICA_CEP#,
--     #CLINICA_TELEFONE#, #CLINICA_CIDADE_UF# nos templates de documento.
--
-- Decisões:
--   * 1:1 com public.unidades (unidade_id UNIQUE, FK on delete cascade) —
--     uma configuração de identidade por unidade/clínica. Mantida em tabela
--     separada de `unidades` porque identidade visual/comercial pode diferir
--     da razão social da unidade.
--   * Sem RLS — segue o padrão das migrations 001–024: controle de acesso é
--     feito na camada de API via `requirePermission`.
--   * Reutiliza `public.set_updated_at()` já definida no schema.

begin;

create table if not exists public.clinica_config (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null unique references public.unidades(id) on delete cascade,
  nome text not null,
  cidade_uf text null,
  endereco text null,
  cep text null,
  telefone text null,
  logo_url text null,
  cor_primaria text not null default '#000000'
    check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_secundaria text not null default '#ffffff'
    check (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists clinica_config_unidade_idx
  on public.clinica_config (unidade_id);

drop trigger if exists clinica_config_set_updated_at on public.clinica_config;
create trigger clinica_config_set_updated_at
  before update on public.clinica_config
  for each row execute function public.set_updated_at();

commit;
