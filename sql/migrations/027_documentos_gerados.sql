-- Migration 027 — Documentos gerados (snapshots imutáveis)
-- Contexto:
--   * Cada vez que um documento é emitido (declaração, laudo, dieta etc.),
--     as variáveis #CLIENTE_NOME#, #CLINICA_NOME# etc. são resolvidas e o
--     resultado é persistido em `conteudo_preenchido` (JSONB). Esse snapshot
--     é imutável — edições posteriores no template não alteram documentos
--     já emitidos.
--   * PDF gerado (via jspdf/html2canvas na camada cliente ou server) é
--     armazenado no bucket Storage `documentos-pdf`. A URL/caminho fica em
--     `pdf_url`. O bucket é criado em bloco separado (permissão Storage
--     depende do cargo que roda a migration — se falhar, criar manualmente
--     via dashboard).
--
-- Decisões:
--   * `agendamento_id` (não `atendimento_id`): o projeto não tem tabela
--     `atendimentos` — atendimento é um agendamento com status de
--     atendimento em curso/finalizado. Referência em agendamentos(id).
--   * `profissional_id` e `gerado_por` → `public.usuarios(id)` (não existe
--     tabela `profissionais` separada).
--   * Sem trigger `set_updated_at` — o documento gerado é imutável.

begin;

create table if not exists public.documentos_gerados (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.documento_templates(id) on delete restrict,
  agendamento_id uuid null references public.agendamentos(id) on delete set null,
  paciente_id uuid null references public.pacientes(id) on delete set null,
  profissional_id uuid null references public.usuarios(id) on delete set null,
  conteudo_preenchido jsonb not null,
  gerado_por uuid not null references public.usuarios(id) on delete restrict,
  gerado_em timestamptz not null default timezone('utc', now()),
  disponivel_no_portal boolean not null default false,
  pdf_url text null
);

create index if not exists documentos_gerados_template_idx
  on public.documentos_gerados (template_id);
create index if not exists documentos_gerados_agendamento_idx
  on public.documentos_gerados (agendamento_id);
create index if not exists documentos_gerados_paciente_idx
  on public.documentos_gerados (paciente_id, gerado_em desc);
create index if not exists documentos_gerados_portal_idx
  on public.documentos_gerados (paciente_id, gerado_em desc)
  where disponivel_no_portal = true;

commit;

-- Bucket de Storage para PDFs — acesso controlado por signed URL emitido
-- na API. Executado fora da transação porque o schema `storage` pode não
-- aceitar DDL transacional em todos os planos. Se a role atual não tiver
-- permissão para escrever em storage.buckets, criar manualmente via
-- dashboard (Storage → New bucket → "documentos-pdf", public = false).
do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'storage')
     and exists (
       select 1 from pg_catalog.pg_tables
       where schemaname = 'storage' and tablename = 'buckets'
     ) then
    insert into storage.buckets (id, name, public)
    values ('documentos-pdf', 'documentos-pdf', false)
    on conflict (id) do nothing;
  end if;
end $$;
