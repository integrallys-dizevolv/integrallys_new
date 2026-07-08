-- Migration 026 — Templates de documentos clínicos editáveis por clínica
-- Contexto:
--   * TAREFA-CR-M19-F / TAREFA-052 / TAREFA-057 (IMPL_DOCUMENTOS_EDITAVEIS.md)
--   * Cada unidade tem seus próprios templates de documento (anamneses,
--     declarações, laudos, encaminhamentos, procedimentos, dieta). O
--     conteúdo do documento fica em JSONB — estrutura em seções tipadas
--     (texto_fixo, campo_texto, checklist, checkbox_grupo) + cabeçalho e
--     rodapé. Variáveis dinâmicas usam o padrão #VARIAVEL#.
--
-- Decisões:
--   * `slug` identifica o modelo (anamnese_consulta, laudo, dieta, …) e é
--     único por unidade — permite que cada clínica customize o template
--     partindo da mesma base sem colidir com outras clínicas.
--   * `tipo` controla o renderer/UI e é um enum aberto via CHECK.
--   * Permissões de leitura/escrita são aplicadas na API
--     (`requirePermission('documentos', 'read'|'update'|...)`), não via RLS.

begin;

create table if not exists public.documento_templates (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  slug text not null,
  nome text not null,
  tipo text not null
    check (tipo in ('formulario', 'declaracao', 'laudo', 'encaminhamento', 'procedimento', 'dieta')),
  conteudo jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  editavel_pelo_especialista boolean not null default true,
  disponivel_portal_paciente boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (unidade_id, slug)
);

create index if not exists documento_templates_unidade_idx
  on public.documento_templates (unidade_id);

create index if not exists documento_templates_ativos_idx
  on public.documento_templates (unidade_id, ativo)
  where ativo = true;

drop trigger if exists documento_templates_set_updated_at on public.documento_templates;
create trigger documento_templates_set_updated_at
  before update on public.documento_templates
  for each row execute function public.set_updated_at();

commit;
