-- 020b_pacientes_migrate_data.sql
-- Copia dados do JSON legado (public.configuracoes) para as novas colunas
-- em public.pacientes (adicionadas em 020_pacientes_expand_schema.sql).
--
-- Estratégia de prioridade quando há conflito entre fontes:
--   1. Dados de 'paciente_profile' (editados pela tela de gestão) têm prioridade
--   2. Dados de 'portal_paciente_profile' (editados pelo próprio paciente)
--      só preenchem campos que ainda estão NULL após o passo 1
--
-- Esta migration é idempotente e segura pra rodar múltiplas vezes.
-- Não deleta as linhas antigas de configuracoes — mantém como backup.
-- Limpeza final deve ser feita manualmente após validar os dados migrados.

-- ═══════════════════════════════════════════════════════════════════
-- Passo 1: Migrar dados do schema 'paciente_profile' (JSON completo)
-- Chave no formato: details_<paciente_id>
-- ═══════════════════════════════════════════════════════════════════
update public.pacientes p
set
  sexo = coalesce(nullif(cfg.valor::jsonb->>'sexo', ''), p.sexo),
  rg = coalesce(nullif(cfg.valor::jsonb->>'rg', ''), p.rg),
  inscricao_estadual = coalesce(nullif(cfg.valor::jsonb->>'inscricaoEstadual', ''), p.inscricao_estadual),
  origem = coalesce(nullif(cfg.valor::jsonb->>'source', ''), p.origem),
  vinculo_tipo = coalesce(nullif(cfg.valor::jsonb->>'vinculoTipo', ''), p.vinculo_tipo),
  photo_url = coalesce(nullif(cfg.valor::jsonb->>'photoUrl', ''), p.photo_url),
  cep = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'zipCode', ''), p.cep),
  logradouro = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'street', ''), p.logradouro),
  numero = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'number', ''), p.numero),
  complemento = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'complement', ''), p.complemento),
  bairro = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'neighborhood', ''), p.bairro),
  cidade = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'city', ''), p.cidade),
  estado = coalesce(nullif(cfg.valor::jsonb->'addressDetails'->>'state', ''), p.estado),
  necessidades_especiais = coalesce(cfg.valor::jsonb->'specialNeeds', p.necessidades_especiais),
  responsavel = coalesce(cfg.valor::jsonb->'responsible', p.responsavel),
  financeiro = coalesce(cfg.valor::jsonb->'financial', p.financeiro),
  fornecedor_dados = coalesce(cfg.valor::jsonb->'supplierData', p.fornecedor_dados)
from public.configuracoes cfg
where cfg.categoria = 'paciente_profile'
  and cfg.chave = 'details_' || p.id::text;

-- ═══════════════════════════════════════════════════════════════════
-- Passo 2: Migrar dados do schema 'portal_paciente_profile' (chaves achatadas)
-- Chaves no formato: <campo>_<usuario_id> (ex: sexo_<uid>, rg_<uid>, zip_<uid>)
-- Só preenche se o campo ainda estiver NULL após passo 1.
-- ═══════════════════════════════════════════════════════════════════
update public.pacientes p set sexo = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'sexo_' || p.usuario_id::text
  and p.usuario_id is not null and p.sexo is null and nullif(c.valor, '') is not null;

update public.pacientes p set rg = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'rg_' || p.usuario_id::text
  and p.usuario_id is not null and p.rg is null and nullif(c.valor, '') is not null;

update public.pacientes p set inscricao_estadual = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'ie_' || p.usuario_id::text
  and p.usuario_id is not null and p.inscricao_estadual is null and nullif(c.valor, '') is not null;

update public.pacientes p set cep = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'zip_' || p.usuario_id::text
  and p.usuario_id is not null and p.cep is null and nullif(c.valor, '') is not null;

update public.pacientes p set logradouro = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'street_' || p.usuario_id::text
  and p.usuario_id is not null and p.logradouro is null and nullif(c.valor, '') is not null;

update public.pacientes p set numero = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'number_' || p.usuario_id::text
  and p.usuario_id is not null and p.numero is null and nullif(c.valor, '') is not null;

update public.pacientes p set complemento = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'complement_' || p.usuario_id::text
  and p.usuario_id is not null and p.complemento is null and nullif(c.valor, '') is not null;

update public.pacientes p set bairro = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'neighborhood_' || p.usuario_id::text
  and p.usuario_id is not null and p.bairro is null and nullif(c.valor, '') is not null;

update public.pacientes p set cidade = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'city_' || p.usuario_id::text
  and p.usuario_id is not null and p.cidade is null and nullif(c.valor, '') is not null;

update public.pacientes p set estado = nullif(c.valor, '')
from public.configuracoes c
where c.categoria = 'portal_paciente_profile'
  and c.chave = 'state_' || p.usuario_id::text
  and p.usuario_id is not null and p.estado is null and nullif(c.valor, '') is not null;

-- ═══════════════════════════════════════════════════════════════════
-- Validação rápida — verifique os resultados antes de apagar o legado:
--
-- select id, nome, sexo, rg, cep, cidade, estado, vinculo_tipo
-- from public.pacientes
-- order by nome;
--
-- Após validar, limpeza dos dados antigos (opcional — mantém como backup
-- por enquanto; descomentar quando tiver certeza):
--
-- delete from public.configuracoes
--  where categoria in ('paciente_profile', 'portal_paciente_profile');
-- ═══════════════════════════════════════════════════════════════════
