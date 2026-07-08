-- maintenance_geral.sql
-- Script de manutenção geral do banco Integrallys.
-- 4 partes: DIAGNOSTIC → REPAIR → ANALYZE → DIAGNOSTIC FINAL
--
-- Características:
--   - Idempotente (pode rodar várias vezes)
--   - NÃO destrutivo (sem DELETE/TRUNCATE)
--   - Conservador (só normaliza dados órfãos óbvios)
--   - REPAIR está em transação (begin/commit) — se algo falhar, rollback total
--
-- Como rodar:
--   psql "$DATABASE_URL" -f sql/maintenance_geral.sql
-- ou cole inteiro no Supabase SQL Editor.
--
-- VACUUM completo NÃO pode rodar dentro de transação — comando separado no fim.

-- ============================================================================
-- PARTE 1 · DIAGNOSTIC (read-only) — estado inicial do banco
-- ============================================================================
-- IMPORTANTE: o Supabase SQL Editor só exibe o resultado do ÚLTIMO select
-- quando se roda vários de uma vez. Por isso esta parte é UMA query única
-- com UNION ALL — retorna as 14 checagens numa tabela só.
--
-- Leitura: coluna `status` = 'OK' significa tudo certo. 'VERIFICAR' = problema.
--   Linhas 1-4 (SCHEMA): valor tem que = esperado.
--   Linhas 5-14 (ANOMALIA): valor tem que = 0.

select check_name, valor, esperado,
       case when valor = esperado then 'OK' else 'VERIFICAR' end as status
from (
  -- ===== SCHEMA (valor deve = esperado) =====
  select 1 as ord, 'pacientes: colunas expandidas (mig 020)' as check_name,
    (select count(*) from information_schema.columns
       where table_schema='public' and table_name='pacientes'
         and column_name in ('fornecedor_dados','responsavel','financeiro','necessidades_especiais',
           'sexo','rg','inscricao_estadual','origem','vinculo_tipo','photo_url','cep','logradouro',
           'numero','complemento','bairro','cidade','estado'))::bigint as valor,
    17::bigint as esperado
  union all
  select 2, 'agendamento_status: valores enum (mig 002+019+046)',
    (select count(*) from unnest(enum_range(null::public.agendamento_status)))::bigint, 12::bigint
  union all
  select 3, 'paciente_status: valores enum (Ativo/Inativo/Aguardando/Alta + Obito mig 015)',
    (select count(*) from unnest(enum_range(null::public.paciente_status)))::bigint, 5::bigint
  union all
  select 4, 'tabelas criticas presentes',
    (select count(*) from information_schema.tables where table_schema='public'
       and table_name in ('unidades','usuarios','pacientes','agendamentos','prescricoes',
         'financeiro_lancamentos','caixa_sessoes','clinica_config','crm_paciente_estagios',
         'agenda_bloqueios','cartoes_empresariais','whatsapp_disparos','pagamentos_online',
         'procedimentos','contas_bancarias','conciliacao_ofx','paciente_exames',
         'chatbot_sessoes','whatsapp_campanhas','documento_templates','documentos_gerados'))::bigint,
    21::bigint
  -- ===== ANOMALIAS (valor deve = 0) =====
  union all
  select 5, 'ANOMALIA: pacientes com unidade_id invalida',
    (select count(*) from public.pacientes p where p.unidade_id is not null
       and not exists (select 1 from public.unidades u where u.id = p.unidade_id))::bigint, 0::bigint
  union all
  select 6, 'ANOMALIA: pacientes com usuario_id invalido',
    (select count(*) from public.pacientes p where p.usuario_id is not null
       and not exists (select 1 from public.usuarios u where u.id = p.usuario_id))::bigint, 0::bigint
  union all
  select 7, 'ANOMALIA: agendamentos com paciente_id invalido',
    (select count(*) from public.agendamentos a where a.paciente_id is not null
       and not exists (select 1 from public.pacientes p where p.id = a.paciente_id))::bigint, 0::bigint
  union all
  select 8, 'ANOMALIA: agendamentos com profissional_id invalido',
    (select count(*) from public.agendamentos a where a.profissional_id is not null
       and not exists (select 1 from public.usuarios u where u.id = a.profissional_id))::bigint, 0::bigint
  union all
  select 9, 'ANOMALIA: prescricoes com paciente_id invalido',
    (select count(*) from public.prescricoes pr where pr.paciente_id is not null
       and not exists (select 1 from public.pacientes p where p.id = pr.paciente_id))::bigint, 0::bigint
  union all
  select 10, 'ANOMALIA: crm_paciente_estagios orfaos',
    (select count(*) from public.crm_paciente_estagios c
       where not exists (select 1 from public.pacientes p where p.id = c.paciente_id))::bigint, 0::bigint
  union all
  select 11, 'ANOMALIA: pacientes com CPF formatado',
    (select count(*) from public.pacientes where cpf is not null and cpf ~ '[^0-9]')::bigint, 0::bigint
  union all
  select 12, 'ANOMALIA: agendamentos status case-errado',
    (select count(*) from public.agendamentos where status::text = 'Em atendimento')::bigint, 0::bigint
  union all
  select 13, 'ANOMALIA: pacientes do portal sem CPF',
    (select count(*) from public.pacientes p join public.usuarios u on u.id = p.usuario_id
       where u.email in ('d@paciente'::citext, 'd@paciente2'::citext)
         and (p.cpf is null or trim(p.cpf) = ''))::bigint, 0::bigint
  union all
  select 14, 'ANOMALIA: unidades ativas sem clinica_config',
    (select count(*) from public.unidades u where u.status = 'Ativa'::public.unidade_status
       and not exists (select 1 from public.clinica_config c where c.unidade_id = u.id))::bigint, 0::bigint
) t
order by ord;

-- ============================================================================
-- PARTE 2 · REPAIR (idempotente, não-destrutivo)
-- ============================================================================
-- Todas as correções estão em transação. Se algo der erro, nada é aplicado.

begin;

-- 2a. Normalizar CPF — remove formatação (.- espaços), mantém só dígitos.
--     Não toca em CPFs nulos.
update public.pacientes
set cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
where cpf is not null and cpf ~ '[^0-9]';

-- 2b. Normalizar agendamento_status case-errado.
--     Migration 019 fez RENAME VALUE 'Em atendimento' → 'Em Atendimento', mas
--     se algum INSERT pegou o valor antigo antes da migration rodar, fica órfão.
--     ALTER TYPE não pode rodar em transação — então fazemos via cast string.
update public.agendamentos
set status = 'Em Atendimento'::public.agendamento_status
where status::text = 'Em atendimento';

-- 2c. Limpar FK órfã: pacientes.unidade_id apontando pra unidade que não existe.
update public.pacientes p set unidade_id = null
where p.unidade_id is not null
  and not exists (select 1 from public.unidades u where u.id = p.unidade_id);

-- 2d. Limpar FK órfã: pacientes.usuario_id apontando pra usuário que não existe.
update public.pacientes p set usuario_id = null
where p.usuario_id is not null
  and not exists (select 1 from public.usuarios u where u.id = p.usuario_id);

-- 2e. Limpar FK órfã: agendamentos.criado_por_id inválido.
update public.agendamentos a set criado_por_id = null
where a.criado_por_id is not null
  and not exists (select 1 from public.usuarios u where u.id = a.criado_por_id);

-- 2f. Reparar pacientes do portal sem CPF (causa o bug do seed).
--     Se algum paciente está linkado a d@paciente / d@paciente2 mas sem CPF/nome
--     completos, preenche com os dados canônicos do demo.
update public.pacientes p set
  cpf  = coalesce(nullif(trim(p.cpf), ''),  '12345678900'),
  nome = coalesce(nullif(trim(p.nome), ''), 'Maria Silva')
where p.usuario_id = (select id from public.usuarios where email = 'd@paciente'::citext limit 1)
  and (trim(coalesce(p.cpf, '')) = '' or trim(coalesce(p.nome, '')) = '');

update public.pacientes p set
  cpf  = coalesce(nullif(trim(p.cpf), ''),  '66666666666'),
  nome = coalesce(nullif(trim(p.nome), ''), 'Beatriz Mendes')
where p.usuario_id = (select id from public.usuarios where email = 'd@paciente2'::citext limit 1)
  and (trim(coalesce(p.cpf, '')) = '' or trim(coalesce(p.nome, '')) = '');

-- 2g. Garantir clinica_config para cada unidade Ativa.
--     Usa nome da unidade como nome da clínica (ajuste manual depois pelo UI).
insert into public.clinica_config (unidade_id, nome)
select u.id, u.nome
from public.unidades u
where u.status = 'Ativa'::public.unidade_status
  and not exists (select 1 from public.clinica_config c where c.unidade_id = u.id);

-- 2h. Atualizar `updated_at` em pacientes que tiveram qualquer mudança acima.
--     (Triggers podem cobrir isso, mas garantia explícita.)
update public.pacientes set updated_at = timezone('utc', now())
where updated_at is null;

commit;

-- ============================================================================
-- PARTE 3 · ANALYZE (atualiza estatísticas do query planner)
-- ============================================================================
-- ANALYZE roda fora de transação por convenção. Sem locks pesados.

analyze public.unidades;
analyze public.usuarios;
analyze public.pacientes;
analyze public.agendamentos;
analyze public.agenda_bloqueios;
analyze public.prescricoes;
analyze public.prescricao_itens;
analyze public.anamneses;
analyze public.prontuarios;
analyze public.evolucoes;
analyze public.documentos_clinicos;
analyze public.documentos_gerados;
analyze public.documento_templates;
analyze public.financeiro_lancamentos;
analyze public.caixa_sessoes;
analyze public.caixa_movimentos;
analyze public.repasses;
analyze public.regras_repasse;
analyze public.cartoes_empresariais;
analyze public.cartao_movimentos;
analyze public.cartoes_paciente;
analyze public.pagamentos_paciente;
analyze public.pagamentos_online;
analyze public.contas_bancarias;
analyze public.conciliacao_ofx;
analyze public.paciente_exames;
analyze public.crm_paciente_estagios;
analyze public.whatsapp_disparos;
analyze public.whatsapp_campanhas;
analyze public.chatbot_sessoes;
analyze public.lista_espera;
analyze public.tarefas;
analyze public.notificacoes;
analyze public.audit_log;
analyze public.produtos_estoque;
analyze public.movimentacoes_estoque;
analyze public.procedimentos;
analyze public.configuracoes;
analyze public.clinica_config;
analyze public.perfil_permissoes;
analyze public.usuario_permissoes;

-- ============================================================================
-- PARTE 4 · DIAGNOSTIC FINAL (re-roda checks pra confirmar repair)
-- ============================================================================

select 'após repair: CPFs formatados restantes' as check_name, count(*) as count
from public.pacientes where cpf is not null and cpf ~ '[^0-9]';

select 'após repair: agendamentos com case errado restantes' as check_name, count(*) as count
from public.agendamentos where status::text = 'Em atendimento';

select 'após repair: pacientes com unidade_id órfã restantes' as check_name, count(*) as count
from public.pacientes p
where p.unidade_id is not null
  and not exists (select 1 from public.unidades u where u.id = p.unidade_id);

select 'após repair: pacientes do portal sem CPF restantes' as check_name, count(*) as count
from public.pacientes p
join public.usuarios u on u.id = p.usuario_id
where u.email in ('d@paciente'::citext, 'd@paciente2'::citext)
  and (p.cpf is null or trim(p.cpf) = '');

select 'após repair: unidades ativas sem clinica_config restantes' as check_name, count(*) as count
from public.unidades u
where u.status = 'Ativa'::public.unidade_status
  and not exists (select 1 from public.clinica_config c where c.unidade_id = u.id);

-- Coverage geral (counts por tabela)
select 'unidades'              as tabela, count(*) as rows from public.unidades
union all select 'usuarios',           count(*) from public.usuarios
union all select 'pacientes',          count(*) from public.pacientes
union all select 'agendamentos',       count(*) from public.agendamentos
union all select 'prescricoes',        count(*) from public.prescricoes
union all select 'financeiro_lancamentos', count(*) from public.financeiro_lancamentos
union all select 'caixa_sessoes',      count(*) from public.caixa_sessoes
union all select 'caixa_movimentos',   count(*) from public.caixa_movimentos
union all select 'crm_paciente_estagios', count(*) from public.crm_paciente_estagios
union all select 'whatsapp_disparos',  count(*) from public.whatsapp_disparos
union all select 'pagamentos_online',  count(*) from public.pagamentos_online
union all select 'clinica_config',     count(*) from public.clinica_config
order by tabela;

-- ============================================================================
-- VACUUM (opcional, rode SEPARADO — não funciona dentro de transação)
-- ============================================================================
-- Copie e cole isto separado se quiser recuperar espaço e bloat:
--
-- vacuum (analyze, verbose) public.agendamentos;
-- vacuum (analyze, verbose) public.financeiro_lancamentos;
-- vacuum (analyze, verbose) public.notificacoes;
-- vacuum (analyze, verbose) public.audit_log;
-- vacuum (analyze, verbose) public.movimentacoes_estoque;
-- vacuum (analyze, verbose) public.whatsapp_disparos;
--
-- NÃO use `vacuum full` em produção sem manutenção programada — toma lock
-- exclusivo na tabela. `vacuum (analyze)` simples é seguro.
