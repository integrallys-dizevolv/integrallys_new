-- 020_pacientes_expand_schema.sql
-- Normaliza o schema de pacientes: move dados do JSON dumped em
-- public.configuracoes (categorias 'paciente_profile' e 'portal_paciente_profile')
-- para colunas dedicadas em public.pacientes.
--
-- Motivos:
-- - Permitir WHERE sexo = 'feminino' direto em SQL (antes exigia parse do JSON)
-- - Integridade referencial (on delete cascade do paciente limpa tudo)
-- - Fim da duplicação gestao vs portal (dois schemas diferentes pro mesmo dado)
-- - Performance (elimina join+merge na listagem)
--
-- Este arquivo só adiciona colunas — a cópia de dados está em 020b.

-- Identidade / documentos
alter table public.pacientes add column if not exists sexo text null;
alter table public.pacientes add column if not exists rg text null;
alter table public.pacientes add column if not exists inscricao_estadual text null;
alter table public.pacientes add column if not exists origem text null;
alter table public.pacientes add column if not exists vinculo_tipo text null default 'cliente';
alter table public.pacientes add column if not exists photo_url text null;

-- Endereço (1:1 com paciente; mantido inline pra simplicidade)
alter table public.pacientes add column if not exists cep text null;
alter table public.pacientes add column if not exists logradouro text null;
alter table public.pacientes add column if not exists numero text null;
alter table public.pacientes add column if not exists complemento text null;
alter table public.pacientes add column if not exists bairro text null;
alter table public.pacientes add column if not exists cidade text null;
alter table public.pacientes add column if not exists estado text null;

-- Dados complexos — JSONB em coluna própria (não mais em configuracoes)
alter table public.pacientes add column if not exists necessidades_especiais jsonb null;
alter table public.pacientes add column if not exists responsavel jsonb null;
alter table public.pacientes add column if not exists financeiro jsonb null;
alter table public.pacientes add column if not exists fornecedor_dados jsonb null;

-- Indexes úteis para filtros comuns
create index if not exists pacientes_sexo_idx on public.pacientes (sexo);
create index if not exists pacientes_vinculo_tipo_idx on public.pacientes (vinculo_tipo);
create index if not exists pacientes_unidade_idx on public.pacientes (unidade_id);
