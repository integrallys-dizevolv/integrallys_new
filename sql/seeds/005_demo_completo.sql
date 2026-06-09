-- 005_demo_completo.sql
-- Seed canônico para demonstração ao cliente (apresentação 2026-05-22 quinta).
-- Substitui conceitualmente o 002_dashboard_full_seed.sql, expandindo cobertura
-- para todas as 37 tabelas com dados de demo (migrations 001-065).
--
-- Uso:
-- 1. Aplique todas as migrations 001-065 no banco alvo.
-- 2. Rode este arquivo (idempotente — pode rodar várias vezes).
-- 3. Opcionalmente rode 003_documento_templates.sql e 004_documentos_gerados_demo.sql
--    para dados de documentos clínicos (independentes deste seed).
--
-- Senha demo para TODOS os usuários: 1234
-- Logins:
--   d@admin / d@gestor / d@gestor2 / d@recepcao / d@recepcao2
--   d@especialista / d@especialista2 / d@paciente
--
-- Padrão de idempotência: cada INSERT usa `where not exists` ou `on conflict`.
-- Roda como service_role (bypassa RLS automaticamente — não desativa RLS no SQL).

begin;

-- ============================================================================
-- ===== UNIDADES =====
-- ============================================================================

insert into public.unidades (nome, cidade, status, endereco, gestor_nome, cnpj)
select *
from (
  values
    ('Unidade Principal', 'São Paulo', 'Ativa'::public.unidade_status, 'Rua Exemplo, 100', 'Gestor Demo', '12.345.678/0001-90'),
    ('Unidade Jardins', 'São Paulo', 'Ativa'::public.unidade_status, 'Alameda Exemplo, 200', 'Gestora Jardins', '12.345.678/0002-71'),
    ('Unidade Santana', 'São Paulo', 'Inativa'::public.unidade_status, 'Av. Norte, 300', 'Gestor Santana', '12.345.678/0003-52')
) as seed(nome, cidade, status, endereco, gestor_nome, cnpj)
where not exists (
  select 1 from public.unidades u where u.nome = seed.nome
);

-- ============================================================================
-- ===== CLINICA_CONFIG (1 por unidade ativa) =====
-- ============================================================================

insert into public.clinica_config
  (unidade_id, nome, cidade_uf, endereco, cep, telefone, cor_primaria, cor_secundaria)
select
  u.id,
  'Integrallys — ' || u.nome,
  coalesce(u.cidade, 'São Paulo') || '/SP',
  coalesce(u.endereco, 'Rua Exemplo, 100'),
  '01001-000',
  '(11) 3000-1000',
  '#0F62FE',
  '#F4F4F4'
from public.unidades u
on conflict (unidade_id) do nothing;

-- ============================================================================
-- ===== USUARIOS (admin, gestor, gestor2, recepcao, recepcao2, especialistas, paciente, paciente2) =====
-- Senha de TODOS: 1234
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.unidades where nome = 'Unidade Jardins' limit 1) as jardins_id
)
insert into public.usuarios (unidade_id, nome, email, senha_hash, perfil, status, telefone, conselho, tipo_vinculo)
select *
from (
  select principal_id, 'Administrador Demo', 'd@admin', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'admin'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0001', null::text, 'interno' from refs
  union all
  select principal_id, 'Gestor Demo', 'd@gestor', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'gestor'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0002', null::text, 'interno' from refs
  union all
  select principal_id, 'Recepção Demo', 'd@recepcao', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'recepcao'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0003', null::text, 'interno' from refs
  union all
  select principal_id, 'Dra. Maria Santos', 'd@especialista', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'especialista'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0004', 'CRM-SP 123456', 'interno' from refs
  union all
  select principal_id, 'Dr. João Silva', 'd@especialista2', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'especialista'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0005', 'CRM-SP 654321', 'parceiro' from refs
  union all
  select jardins_id, 'Gestora Jardins', 'd@gestor2', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'gestor'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0006', null::text, 'interno' from refs
  union all
  select jardins_id, 'Recepção Jardins', 'd@recepcao2', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'recepcao'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0007', null::text, 'interno' from refs
  union all
  select principal_id, 'Paciente Demo', 'd@paciente', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'paciente'::public.user_role, 'Ativo'::public.user_status, '(11) 99999-9999', null::text, null::text from refs
  union all
  select principal_id, 'Paciente Demo 2', 'd@paciente2', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'paciente'::public.user_role, 'Ativo'::public.user_status, '(11) 99999-9998', null::text, null::text from refs
) as seed(unidade_id, nome, email, senha_hash, perfil, status, telefone, conselho, tipo_vinculo)
where not exists (
  select 1 from public.usuarios u where u.email = seed.email
);

-- ============================================================================
-- ===== PACIENTES (12) =====
-- 6 originais (mesmos do 002) + 6 novos para demo expandida
-- Status mix: Ativo, Inativo, Aguardando, Alta, Óbito
-- ============================================================================

-- PRE-STEP: normalizar pacientes do portal já existentes.
-- Se o banco já tem pacientes linkados a d@paciente / d@paciente2 (de execuções
-- antigas do 002, testes manuais, ou dados parciais), o `where not exists` com
-- `or p.usuario_id = seed.usuario_id` abaixo bloqueia o INSERT e os subselects
-- por CPF nas seções seguintes (agendamentos, prescrições, etc.) retornam NULL.
-- O UPDATE garante que esses pacientes fantasma tenham os dados canônicos antes
-- do INSERT abaixo, preservando o `usuario_id` linkage existente.
update public.pacientes p set
  cpf = '12345678900',
  nome = 'Maria Silva',
  email = 'd@paciente'::citext,
  status = 'Ativo'::public.paciente_status,
  data_nascimento = date '1990-05-10',
  unidade_id = coalesce(p.unidade_id, (select id from public.unidades where nome = 'Unidade Principal' limit 1))
where p.usuario_id = (select id from public.usuarios where email = 'd@paciente' limit 1)
  and (p.cpf is null or p.cpf <> '12345678900' or p.nome <> 'Maria Silva');

update public.pacientes p set
  cpf = '66666666666',
  nome = 'Beatriz Mendes',
  email = 'd@paciente2'::citext,
  status = 'Ativo'::public.paciente_status,
  data_nascimento = date '1991-04-22',
  unidade_id = coalesce(p.unidade_id, (select id from public.unidades where nome = 'Unidade Principal' limit 1))
where p.usuario_id = (select id from public.usuarios where email = 'd@paciente2' limit 1)
  and (p.cpf is null or p.cpf <> '66666666666' or p.nome <> 'Beatriz Mendes');

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.unidades where nome = 'Unidade Jardins' limit 1) as jardins_id,
    (select id from public.usuarios where email = 'd@paciente' limit 1) as portal_user_id,
    (select id from public.usuarios where email = 'd@paciente2' limit 1) as portal_user_2_id
)
insert into public.pacientes (
  usuario_id, unidade_id, nome, email, telefone, status,
  data_nascimento, cpf, observacoes
)
select *
from (
  -- 6 originais (mantidos para compatibilidade)
  select portal_user_id, principal_id, 'Maria Silva', 'd@paciente'::citext, '(11) 99999-9999', 'Ativo'::public.paciente_status, date '1990-05-10', '12345678900', 'Paciente do portal' from refs
  union all
  select null::uuid, principal_id, 'Ana Rodrigues', 'ana@demo.local'::citext, '(11) 98888-1001', 'Ativo'::public.paciente_status, date '1988-03-12', '11111111111', 'Paciente recorrente da recepcao' from refs
  union all
  select null::uuid, principal_id, 'Carlos Almeida', 'carlos@demo.local'::citext, '(11) 98888-1002', 'Ativo'::public.paciente_status, date '1979-07-21', '22222222222', 'Paciente com historico clinico' from refs
  union all
  select null::uuid, principal_id, 'Fernanda Costa', 'fernanda@demo.local'::citext, '(11) 98888-1003', 'Ativo'::public.paciente_status, date '1995-11-02', '33333333333', 'Paciente com prescricoes e pagamentos' from refs
  union all
  select null::uuid, jardins_id, 'Roberto Lima', 'roberto@demo.local'::citext, '(11) 98888-1004', 'Ativo'::public.paciente_status, date '1985-08-18', '44444444444', 'Paciente da unidade Jardins' from refs
  union all
  select null::uuid, principal_id, 'Juliana Prado', 'juliana@demo.local'::citext, '(11) 98888-1005', 'Inativo'::public.paciente_status, date '1992-01-15', '55555555555', 'Paciente inativada para visualizacao de status' from refs
  -- 6 novos
  union all
  select portal_user_2_id, principal_id, 'Beatriz Mendes', 'd@paciente2'::citext, '(11) 99999-9998', 'Ativo'::public.paciente_status, date '1991-04-22', '66666666666', 'Segundo paciente do portal — fluxo de auto-agendamento' from refs
  union all
  select null::uuid, jardins_id, 'Pedro Henrique Souza', 'pedro@demo.local'::citext, '(11) 98888-1006', 'Aguardando'::public.paciente_status, date '1972-06-30', '77777777777', 'Aguardando primeira consulta' from refs
  union all
  select null::uuid, principal_id, 'Luciana Ferreira', 'luciana@demo.local'::citext, '(11) 98888-1007', 'Alta'::public.paciente_status, date '1983-09-14', '88888888888', 'Recebeu alta clínica há 2 meses' from refs
  union all
  select null::uuid, principal_id, 'José Antonio Pereira', 'jose@demo.local'::citext, '(11) 98888-1008', 'Óbito'::public.paciente_status, date '1948-02-05', '99999999911', 'Registro histórico — paciente falecido' from refs
  union all
  select null::uuid, jardins_id, 'Camila Ribeiro', 'camila@demo.local'::citext, '(11) 98888-1009', 'Ativo'::public.paciente_status, date '2001-12-08', '99999999922', 'Paciente jovem da unidade Jardins' from refs
  union all
  select null::uuid, principal_id, 'Marcos Vinicius Oliveira', 'marcos@demo.local'::citext, '(11) 98888-1010', 'Ativo'::public.paciente_status, date '1965-11-19', '99999999933', 'Paciente VIP — acompanhamento contínuo' from refs
) as seed(usuario_id, unidade_id, nome, email, telefone, status, data_nascimento, cpf, observacoes)
where not exists (
  select 1
  from public.pacientes p
  where p.cpf = seed.cpf
     or (seed.usuario_id is not null and p.usuario_id = seed.usuario_id)
);

-- ============================================================================
-- ===== CONFIGURACOES (portal + sistema + atendimento + paciente_profile) =====
-- ============================================================================

insert into public.configuracoes (categoria, chave, valor)
values
  ('portal_paciente', 'clinic_patient_alert_title', 'Importante: Retornos com Desconto'),
  ('portal_paciente', 'clinic_patient_alert_message', 'Retornos de Bioressonancia Quantica tem 50% de desconto se agendados dentro de 35 dias corridos apos a ultima consulta. Apos esse prazo, o valor sera integral.'),
  ('sistema', 'company_name', 'Integrallys'),
  ('sistema', 'finance_dashboard_mode', 'full'),
  ('sistema', 'timezone', 'America/Sao_Paulo'),
  ('atendimento', 'retorno_desconto_ativo', 'true'),
  ('atendimento', 'retorno_desconto_dias', '35'),
  ('atendimento', 'retorno_desconto_percentual', '50')
on conflict (categoria, chave)
do update set
  valor = excluded.valor,
  updated_at = timezone('utc', now());

insert into public.configuracoes (categoria, chave, valor)
select
  'paciente_profile',
  'details_' || p.id::text,
  jsonb_build_object(
    'rg', seed.rg,
    'inscricaoEstadual', '',
    'sexo', seed.sexo,
    'source', seed.source,
    'vinculoTipo', 'cliente',
    'photoUrl', '',
    'addressDetails', jsonb_build_object(
      'zipCode', seed.cep,
      'street', seed.street,
      'number', seed.number,
      'complement', seed.complement,
      'neighborhood', seed.neighborhood,
      'city', seed.city,
      'state', seed.state
    ),
    'specialNeeds', jsonb_build_object(
      'hasNeeds', false,
      'categories', '[]'::jsonb,
      'details', ''
    ),
    'responsible', jsonb_build_object(
      'name', '',
      'cpf', '',
      'phone', '',
      'relationship', ''
    ),
    'financial', jsonb_build_object(
      'requiresReceipt', false,
      'receiptData', jsonb_build_object(
        'useProfileData', true,
        'taxId', '',
        'name', '',
        'address', ''
      )
    )
  )::text
from public.pacientes p
join (
  values
    ('12345678900', 'MG-10.000.111', 'feminino', 'google', '01001000', 'Rua das Flores', '120', 'Apto 12', 'Centro', 'São Paulo', 'SP'),
    ('11111111111', 'SP-20.000.222', 'feminino', 'instagram', '01311000', 'Av. Paulista', '900', '', 'Bela Vista', 'São Paulo', 'SP'),
    ('22222222222', 'SP-30.000.333', 'masculino', 'indicacao', '04002000', 'Rua Vergueiro', '450', '', 'Liberdade', 'São Paulo', 'SP'),
    ('33333333333', 'SP-40.000.444', 'feminino', 'site', '05001000', 'Rua Clélia', '80', '', 'Lapa', 'São Paulo', 'SP'),
    ('44444444444', 'SP-50.000.555', 'masculino', 'indicacao', '01414000', 'Rua Oscar Freire', '150', '', 'Jardins', 'São Paulo', 'SP'),
    ('55555555555', 'SP-60.000.666', 'feminino', 'outros', '02020000', 'Rua Voluntários', '52', '', 'Santana', 'São Paulo', 'SP'),
    ('66666666666', 'SP-70.000.777', 'feminino', 'site', '04543000', 'Av. Brigadeiro Faria Lima', '500', 'Apto 71', 'Itaim Bibi', 'São Paulo', 'SP'),
    ('77777777777', 'SP-70.000.888', 'masculino', 'indicacao', '01419000', 'Rua Augusta', '2010', '', 'Cerqueira César', 'São Paulo', 'SP'),
    ('88888888888', 'SP-70.000.999', 'feminino', 'google', '05402000', 'Rua Teodoro Sampaio', '700', '', 'Pinheiros', 'São Paulo', 'SP'),
    ('99999999911', 'SP-80.000.111', 'masculino', 'outros', '04101000', 'Av. Ibirapuera', '300', '', 'Indianópolis', 'São Paulo', 'SP'),
    ('99999999922', 'SP-80.000.222', 'feminino', 'instagram', '01310000', 'Av. Paulista', '1500', 'Sala 8', 'Bela Vista', 'São Paulo', 'SP'),
    ('99999999933', 'SP-80.000.333', 'masculino', 'indicacao', '04094050', 'Av. Engenheiro Luís Carlos Berrini', '1200', '', 'Brooklin', 'São Paulo', 'SP')
) as seed(cpf, rg, sexo, source, cep, street, number, complement, neighborhood, city, state)
  on p.cpf = seed.cpf
on conflict (categoria, chave)
do update set
  valor = excluded.valor,
  updated_at = timezone('utc', now());

-- ============================================================================
-- ===== PROCEDIMENTOS (catálogo da clínica) =====
-- ============================================================================

insert into public.procedimentos (nome, codigo, descricao, ativo, valor)
select *
from (
  values
    ('Consulta Clínica Geral', 'CONS-GERAL', 'Consulta médica clínica geral, 60 min', true, 180.00),
    ('Bioressonância Quântica', 'PROC-BIORES', 'Procedimento de bioressonância quântica, 90 min', true, 250.00),
    ('Hemograma Completo', 'EXAM-HEMO', 'Coleta e análise laboratorial de hemograma', true, 95.00),
    ('Consulta de Cardiologia', 'CONS-CARDIO', 'Consulta especializada em cardiologia, 60 min', true, 320.00),
    ('Sessão de Acupuntura', 'PROC-ACUP', 'Sessão terapêutica de acupuntura, 50 min', true, 180.00),
    ('Consulta Nutrição Funcional', 'CONS-NUTRI', 'Avaliação e plano alimentar nutricional', true, 220.00),
    ('Ecocardiograma', 'EXAM-ECO', 'Exame de imagem cardíaco', true, 380.00),
    ('Retorno (até 30 dias)', 'CONS-RETORNO', 'Retorno de consulta dentro do prazo', true, 0.00)
) as seed(nome, codigo, descricao, ativo, valor)
where not exists (
  select 1 from public.procedimentos pr where pr.nome = seed.nome
);

-- ============================================================================
-- ===== PRODUTOS ESTOQUE / MOVIMENTACOES =====
-- ============================================================================

with unidades as (
  select id, nome from public.unidades where nome in ('Unidade Principal', 'Unidade Jardins')
)
insert into public.produtos_estoque (
  unidade_id, nome, categoria, sku, quantidade, estoque_minimo, status,
  preco_custo, preco_venda
)
select
  u.id,
  seed.nome,
  seed.categoria,
  seed.sku,
  seed.quantidade,
  seed.estoque_minimo,
  seed.status,
  seed.preco_custo,
  seed.preco_venda
from unidades u
cross join (
  values
    ('Clínica Geral', 'Consulta',     'CONS-001', 999, 10, 'Disponível',   0.00,   180.00),
    ('Bioressonância Quântica', 'Procedimento', 'PROC-001', 999, 10, 'Disponível', 0.00, 250.00),
    ('Hemograma', 'Exame',           'EXAM-001', 999, 10, 'Disponível',   0.00,    95.00),
    ('Cardiologia', 'Consulta',      'CONS-002', 999, 10, 'Disponível',   0.00,   320.00),
    ('Kit de Coleta', 'Insumo',      'INS-001',   80, 15, 'Disponível',  12.50,    20.00),
    ('Luvas Nitrílicas', 'Insumo',   'INS-002',  120, 20, 'Disponível',  35.00,    55.00),
    ('Suplemento Vitamina D 5000UI', 'Produto', 'PROD-001', 45, 10, 'Disponível', 38.00, 89.90),
    ('Suplemento Magnésio Quelado', 'Produto',  'PROD-002', 32, 10, 'Disponível', 42.00, 95.00)
) as seed(nome, categoria, sku, quantidade, estoque_minimo, status, preco_custo, preco_venda)
where not exists (
  select 1 from public.produtos_estoque pe where pe.unidade_id = u.id and pe.sku = seed.sku
);

insert into public.movimentacoes_estoque (
  produto_id, usuario_id, unidade_id, tipo, quantidade, observacoes, tipo_movimentacao
)
select
  pe.id,
  (select id from public.usuarios where email = 'd@recepcao' limit 1),
  pe.unidade_id,
  seed.tipo,
  seed.quantidade,
  seed.observacoes,
  seed.tipo_mov
from public.produtos_estoque pe
join (
  values
    ('INS-001', 'entrada'::public.movimento_caixa_tipo, 20, 'Reposicao semanal', 'entrada'),
    ('INS-002', 'saida'::public.movimento_caixa_tipo, 10, 'Consumo em atendimentos', 'consumo_interno'),
    ('PROD-001', 'entrada'::public.movimento_caixa_tipo, 30, 'Compra mensal de suplementos', 'entrada'),
    ('PROD-002', 'entrada'::public.movimento_caixa_tipo, 20, 'Compra mensal de suplementos', 'entrada'),
    ('PROD-001', 'saida'::public.movimento_caixa_tipo, 3, 'Venda em prescrição (paciente Carlos)', 'saida'),
    ('PROD-002', 'saida'::public.movimento_caixa_tipo, 2, 'Venda em prescrição (paciente Fernanda)', 'saida'),
    ('INS-001', 'saida'::public.movimento_caixa_tipo, 5, 'Uso interno em coletas de exames', 'consumo_interno'),
    ('INS-002', 'entrada'::public.movimento_caixa_tipo, 50, 'Reposicao trimestral de EPIs', 'entrada')
) as seed(sku, tipo, quantidade, observacoes, tipo_mov)
  on pe.sku = seed.sku
  and pe.unidade_id = (select id from public.unidades where nome = 'Unidade Principal' limit 1)
where not exists (
  select 1
  from public.movimentacoes_estoque me
  where me.produto_id = pe.id
    and me.tipo = seed.tipo
    and me.quantidade = seed.quantidade
    and coalesce(me.observacoes, '') = seed.observacoes
);

-- ============================================================================
-- ===== AGENDAMENTOS (cobre 12 status do enum + datas relativas) =====
-- Status: Agendado, Confirmado, Check-in, Em Atendimento, Check-out,
--         Concluído, Cancelado, Em Atraso, Faltou, Bloqueado, Adiado, Disponível
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.unidades where nome = 'Unidade Jardins' limit 1) as jardins_id,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id,
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '12345678900' limit 1) as paciente_1,
    (select id from public.pacientes where cpf = '11111111111' limit 1) as paciente_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4,
    (select id from public.pacientes where cpf = '44444444444' limit 1) as paciente_5,
    (select id from public.pacientes where cpf = '66666666666' limit 1) as paciente_7,
    (select id from public.pacientes where cpf = '77777777777' limit 1) as paciente_8,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip
)
insert into public.agendamentos (
  unidade_id, paciente_id, profissional_id, criado_por_id,
  data_agendamento, horario_inicio, horario_fim,
  status, observacoes, tipo, modalidade_atendimento, valor_procedimento
)
select *
from (
  -- HOJE: 1 de cada status do "fluxo do dia"
  select principal_id, paciente_1, especialista_1, recepcao_id, current_date, time '08:00', time '09:00', 'Agendado'::public.agendamento_status, 'Clínica Geral', 'Consulta', 'Presencial'::public.modalidade_atendimento, 180.00 from refs
  union all
  select principal_id, paciente_2, especialista_1, recepcao_id, current_date, time '09:00', time '10:00', 'Confirmado'::public.agendamento_status, 'Bioressonância Quântica', 'Procedimento', 'Presencial'::public.modalidade_atendimento, 250.00 from refs
  union all
  select principal_id, paciente_3, especialista_2, recepcao_id, current_date, time '10:30', time '11:30', 'Check-in'::public.agendamento_status, 'Hemograma — paciente em sala de espera', 'Exame', 'Presencial'::public.modalidade_atendimento, 95.00 from refs
  union all
  select principal_id, paciente_4, especialista_2, recepcao_id, current_date, time '13:00', time '14:00', 'Em Atendimento'::public.agendamento_status, 'Cardiologia — atendimento em curso', 'Consulta', 'Presencial'::public.modalidade_atendimento, 320.00 from refs
  union all
  select principal_id, paciente_vip, especialista_1, recepcao_id, current_date, time '14:30', time '15:30', 'Check-out'::public.agendamento_status, 'Acupuntura — finalizando', 'Procedimento', 'Presencial'::public.modalidade_atendimento, 180.00 from refs
  union all
  select principal_id, paciente_7, especialista_2, recepcao_id, current_date, time '16:00', time '17:00', 'Em Atraso'::public.agendamento_status, 'Paciente atrasado mais de 15 min', 'Consulta', 'Presencial'::public.modalidade_atendimento, 220.00 from refs
  -- ONTEM: histórico (Concluído, Faltou)
  union all
  select principal_id, paciente_1, especialista_1, recepcao_id, current_date - 1, time '15:00', time '16:00', 'Concluído'::public.agendamento_status, 'Retorno concluído', 'Retorno', 'Presencial'::public.modalidade_atendimento, 0.00 from refs
  union all
  select principal_id, paciente_8, especialista_2, recepcao_id, current_date - 1, time '11:00', time '12:00', 'Faltou'::public.agendamento_status, 'Paciente não compareceu', 'Consulta', 'Presencial'::public.modalidade_atendimento, 180.00 from refs
  -- ONTEM-3: histórico mais antigo
  union all
  select principal_id, paciente_2, especialista_1, recepcao_id, current_date - 3, time '14:00', time '15:00', 'Concluído'::public.agendamento_status, 'Consulta concluída', 'Consulta', 'Online'::public.modalidade_atendimento, 180.00 from refs
  -- AMANHÃ: Agendados/Confirmados
  union all
  select principal_id, paciente_3, especialista_2, recepcao_id, current_date + 1, time '08:30', time '09:30', 'Agendado'::public.agendamento_status, 'Clínica Geral', 'Consulta', 'Presencial'::public.modalidade_atendimento, 180.00 from refs
  union all
  select jardins_id, paciente_5, especialista_2, recepcao_id, current_date + 1, time '11:00', time '12:00', 'Confirmado'::public.agendamento_status, 'Cardiologia (Jardins)', 'Consulta', 'Presencial'::public.modalidade_atendimento, 320.00 from refs
  -- AMANHÃ+2: Cancelado e Adiado
  union all
  select principal_id, paciente_4, especialista_1, recepcao_id, current_date + 2, time '10:00', time '11:00', 'Cancelado'::public.agendamento_status, 'Paciente cancelou', 'Consulta', 'Presencial'::public.modalidade_atendimento, 180.00 from refs
  union all
  select principal_id, paciente_2, especialista_2, recepcao_id, current_date + 2, time '14:00', time '15:00', 'Adiado'::public.agendamento_status, 'Reagendado para semana seguinte', 'Consulta', 'Presencial'::public.modalidade_atendimento, 220.00 from refs
  -- PRÓXIMA SEMANA: Bloqueado e Disponível
  union all
  select principal_id, null::uuid, especialista_1, recepcao_id, current_date + 7, time '09:00', time '10:00', 'Bloqueado'::public.agendamento_status, 'Horário bloqueado para reunião interna', 'Reunião', 'Presencial'::public.modalidade_atendimento, null::numeric from refs
  union all
  select principal_id, null::uuid, especialista_2, recepcao_id, current_date + 7, time '15:00', time '16:00', 'Disponível'::public.agendamento_status, 'Slot livre gerado em lote', 'Slot', 'Presencial'::public.modalidade_atendimento, null::numeric from refs
) as seed(unidade_id, paciente_id, profissional_id, criado_por_id, data_agendamento, horario_inicio, horario_fim, status, observacoes, tipo, modalidade_atendimento, valor_procedimento)
where not exists (
  select 1 from public.agendamentos a
  where (a.paciente_id is not distinct from seed.paciente_id)
    and a.data_agendamento = seed.data_agendamento
    and a.horario_inicio = seed.horario_inicio
    and a.profissional_id = seed.profissional_id
);

-- ============================================================================
-- ===== AGENDA_BLOQUEIOS (férias, reunião, manutenção) =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@gestor' limit 1) as gestor_id,
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1
)
insert into public.agenda_bloqueios (
  profissional_id, unidade_id, data_inicio, data_fim,
  horario_inicio, horario_fim, dia_inteiro, tipo, justificativa, created_by
)
select *
from (
  select especialista_1, principal_id, current_date + 14, current_date + 21, null::time, null::time, true, 'Férias', 'Férias programadas Dra. Maria Santos', gestor_id from refs
  union all
  select especialista_1, principal_id, current_date + 1, current_date + 1, time '15:00', time '16:00', false, 'Reunião', 'Reunião de equipe clínica', gestor_id from refs
  union all
  select null::uuid, principal_id, current_date + 3, current_date + 3, null::time, null::time, true, 'Manutenção', 'Manutenção de equipamento de bioressonância — dia inteiro', gestor_id from refs
) as seed(profissional_id, unidade_id, data_inicio, data_fim, horario_inicio, horario_fim, dia_inteiro, tipo, justificativa, created_by)
where not exists (
  select 1 from public.agenda_bloqueios ab
  where ab.data_inicio = seed.data_inicio
    and ab.data_fim = seed.data_fim
    and (ab.profissional_id is not distinct from seed.profissional_id)
    and ab.tipo = seed.tipo
);

-- ============================================================================
-- ===== LISTA DE ESPERA =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4,
    (select id from public.pacientes where cpf = '55555555555' limit 1) as paciente_6,
    (select id from public.pacientes where cpf = '77777777777' limit 1) as paciente_8,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip,
    (select id from public.procedimentos where codigo = 'PROC-BIORES' limit 1) as proc_biores
)
insert into public.lista_espera (
  paciente_id, unidade_id, prioridade, observacoes,
  procedimento, especialista, preferencia_horario, procedimento_id, especialista_id
)
select *
from (
  select paciente_4, principal_id, 'Alta'::public.fila_prioridade, 'Paciente aguardando encaixe para retorno', 'Bioressonância Quântica', 'Dra. Maria Santos', 'manha', proc_biores, especialista_1 from refs
  union all
  select paciente_6, principal_id, 'Média'::public.fila_prioridade, 'Preferência por período da manhã', 'Consulta Clínica Geral', 'Dra. Maria Santos', 'manha', null::uuid, especialista_1 from refs
  union all
  select paciente_8, principal_id, 'Urgente'::public.fila_prioridade, 'Encaixe urgente solicitado pela recepção', 'Consulta Clínica Geral', 'Dra. Maria Santos', 'tarde', null::uuid, especialista_1 from refs
  union all
  select paciente_vip, principal_id, 'Alta'::public.fila_prioridade, 'Paciente VIP — preferência absoluta', 'Bioressonância Quântica', 'Dra. Maria Santos', 'tarde', proc_biores, especialista_1 from refs
) as seed(paciente_id, unidade_id, prioridade, observacoes, procedimento, especialista, preferencia_horario, procedimento_id, especialista_id)
where not exists (
  select 1 from public.lista_espera le where le.paciente_id = seed.paciente_id
);

-- ============================================================================
-- ===== TAREFAS =====
-- ============================================================================

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id,
    (select id from public.usuarios where email = 'd@gestor' limit 1) as gestor_id
)
insert into public.tarefas (titulo, descricao, responsavel_id, status, vencimento_em, created_by_id)
select *
from (
  select 'Retornar ligação para paciente', 'Confirmar preparo do exame agendado.', especialista_1, 'Pendente'::public.tarefa_status, timezone('utc', now()) + interval '4 hours', recepcao_id from refs
  union all
  select 'Revisar prontuário pendente', 'Validar documentação clínica antes do atendimento da tarde.', especialista_2, 'Pendente'::public.tarefa_status, timezone('utc', now()) + interval '6 hours', recepcao_id from refs
  union all
  select 'Conferir fechamento de caixa', 'Validar fechamento do caixa de ontem e bater conferência.', gestor_id, 'Em andamento'::public.tarefa_status, timezone('utc', now()) + interval '2 hours', gestor_id from refs
  union all
  select 'Atualizar tabela de preços de exames', 'Cliente solicitou reajuste de tabela para o próximo mês.', gestor_id, 'Concluída'::public.tarefa_status, timezone('utc', now()) - interval '1 day', gestor_id from refs
  union all
  select 'Cancelar fornecedor inativo', 'Fornecedor não respondeu nos últimos 30 dias.', recepcao_id, 'Cancelada'::public.tarefa_status, timezone('utc', now()) - interval '5 days', gestor_id from refs
) as seed(titulo, descricao, responsavel_id, status, vencimento_em, created_by_id)
where not exists (
  select 1 from public.tarefas t
  where t.titulo = seed.titulo
    and t.responsavel_id = seed.responsavel_id
);

-- ============================================================================
-- ===== CAIXA_SESSOES (aberta hoje + fechada ontem) =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id
)
insert into public.caixa_sessoes (
  unidade_id, opened_by_id, operador_id,
  data_operacao, status, saldo_inicial, observacoes, aberto_em
)
select
  principal_id, recepcao_id, recepcao_id,
  current_date, 'aberto', 350.00, 'Sessão aberta para validação operacional', timezone('utc', now()) - interval '2 hours'
from refs
where not exists (
  select 1 from public.caixa_sessoes cs
  where cs.unidade_id = principal_id and cs.data_operacao = current_date
);

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id
)
insert into public.caixa_sessoes (
  unidade_id, opened_by_id, closed_by_id, operador_id,
  data_operacao, status, saldo_inicial, saldo_final,
  valor_transferido, saldo_restante,
  observacoes, aberto_em, fechado_em
)
select
  principal_id, recepcao_id, recepcao_id, recepcao_id,
  current_date - 1, 'fechado', 300.00, 980.00,
  680.00, 300.00,
  'Sessão fechada e transferida ao cofre', timezone('utc', now()) - interval '1 day' - interval '8 hours', timezone('utc', now()) - interval '1 day'
from refs
where not exists (
  select 1 from public.caixa_sessoes cs
  where cs.unidade_id = principal_id and cs.data_operacao = current_date - 1
);

-- ============================================================================
-- ===== CAIXA_MOVIMENTOS (sessão de hoje) =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id,
    (select id from public.caixa_sessoes
       where unidade_id = (select id from public.unidades where nome = 'Unidade Principal' limit 1)
         and data_operacao = current_date limit 1) as sessao_id
)
insert into public.caixa_movimentos (
  unidade_id, usuario_id, operador_id, sessao_id,
  descricao, tipo, valor, forma, origem, operador_nome,
  bandeira, parcelas, valor_parcela, data_movimento
)
select
  principal_id, recepcao_id, recepcao_id, sessao_id,
  seed.descricao, seed.tipo, seed.valor, seed.forma, seed.origem, 'Recepção Demo',
  seed.bandeira, seed.parcelas, seed.valor_parcela,
  timezone('utc', now()) - seed.offset_time
from refs
cross join (
  values
    ('Consulta particular Maria',        'entrada'::public.movimento_caixa_tipo, 180.00, 'dinheiro',       'manual',      null::text,      null::integer, null::numeric, interval '150 minutes'),
    ('Pagamento Bioressonância',         'entrada'::public.movimento_caixa_tipo, 250.00, 'cartao_credito', 'manual',      'Visa',          3,              83.33,          interval '120 minutes'),
    ('Pagamento consulta Cardiologia',   'entrada'::public.movimento_caixa_tipo, 320.00, 'cartao_debito',  'manual',      'Mastercard',    1,              320.00,         interval '90 minutes'),
    ('Pagamento Pix Acupuntura',         'entrada'::public.movimento_caixa_tipo, 180.00, 'pix',            'pagamento_online', null::text,  null::integer, null::numeric, interval '70 minutes'),
    ('Sangria parcial',                  'saida'::public.movimento_caixa_tipo,    50.00, 'dinheiro',       'manual',      null::text,      null::integer, null::numeric, interval '50 minutes'),
    ('Compra de água mineral',           'saida'::public.movimento_caixa_tipo,    30.00, 'dinheiro',       'manual',      null::text,      null::integer, null::numeric, interval '30 minutes'),
    ('Suprimento do caixa',              'entrada'::public.movimento_caixa_tipo, 100.00, 'dinheiro',       'manual',      null::text,      null::integer, null::numeric, interval '20 minutes'),
    ('Venda suplemento Vit D',           'entrada'::public.movimento_caixa_tipo,  89.90, 'dinheiro',       'manual',      null::text,      null::integer, null::numeric, interval '10 minutes')
) as seed(descricao, tipo, valor, forma, origem, bandeira, parcelas, valor_parcela, offset_time)
where sessao_id is not null
  and not exists (
    select 1 from public.caixa_movimentos cm
    where cm.sessao_id = sessao_id
      and cm.descricao = seed.descricao
      and cm.valor = seed.valor
  );

-- ============================================================================
-- ===== FINANCEIRO_LANCAMENTOS (mix receita/despesa, status variados) =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@gestor' limit 1) as gestor_id
)
insert into public.financeiro_lancamentos (
  unidade_id, usuario_id, descricao, categoria, categoria_dre, valor, tipo,
  data_lancamento, competencia, vencimento, metodo, status, observacoes
)
select
  principal_id, gestor_id,
  seed.descricao, seed.categoria, seed.categoria_dre::public.dre_categoria,
  seed.valor, seed.tipo, seed.data_lancamento, seed.competencia, seed.vencimento,
  seed.metodo, seed.status, seed.observacoes
from refs
cross join (
  values
    ('Recebimento consulta particular',   'Consultas',         'receita_consultas', 180.00, 'receita'::public.financeiro_tipo, timezone('utc', now()) - interval '1 day', current_date, current_date - 1, 'Dinheiro', 'Pago',     'Consulta realizada'),
    ('Bioressonância Quântica',           'Procedimentos',     'receita_consultas', 250.00, 'receita'::public.financeiro_tipo, timezone('utc', now()),                    current_date, current_date,     'Cartão',   'Pendente', 'Pagamento pendente'),
    ('Compra de insumos',                 'Operacional',       'despesa_administrativa', 120.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '2 days', current_date, current_date - 2, 'PIX',     'Pago',     'Reposição de estoque'),
    ('Serviço terceirizado contabilidade','Administrativo',    'despesa_fixa',     300.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) + interval '2 days', current_date, current_date + 2, 'Boleto',   'Pendente', 'Prestador externo'),
    ('Receita de cardiologia',            'Consultas',         'receita_consultas', 420.00, 'receita'::public.financeiro_tipo, timezone('utc', now()) - interval '5 days', current_date, current_date - 5, 'PIX',     'Pago',     'Atendimentos fechados no período'),
    ('Aluguel mensal',                    'Despesa Fixa',      'despesa_fixa',    4500.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '10 days', current_date, current_date - 5, 'Boleto', 'Pago',     'Aluguel referente ao mês corrente'),
    ('Folha de pagamento',                'Pessoal',           'despesa_pessoal',12800.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '5 days', current_date, current_date - 5, 'Transferência', 'Pago', 'Salários e encargos'),
    ('Marketing — Google Ads',            'Comercial',         'despesa_comercial', 850.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '15 days', current_date, current_date - 10, 'Cartão', 'Pago', 'Campanha de captação'),
    ('Internet + telefonia',              'Operacional',       'despesa_fixa',     480.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '7 days', current_date, current_date - 5, 'Débito Automático', 'Pago', 'Plano corporativo'),
    ('Recebimento Pix avulso',            'Outros',            'receita_outros',   150.00, 'receita'::public.financeiro_tipo, timezone('utc', now()) - interval '3 days', current_date, current_date - 3, 'PIX',     'Pago',     'Pagamento avulso'),
    ('Venda de suplemento',               'Produtos',          'receita_produtos',  89.90, 'receita'::public.financeiro_tipo, timezone('utc', now()),                    current_date, current_date,     'Dinheiro', 'Pago',     'Venda balcão'),
    ('Honorário médico — Dra. Maria',     'Profissionais',     'despesa_pessoal', 2400.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '8 days', current_date, current_date + 5, 'PIX',    'Pendente', 'Repasse mensal de honorários'),
    ('Conta de luz',                      'Despesa Fixa',      'despesa_fixa',     680.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '20 days', current_date - interval '1 month', current_date - 12, 'Boleto', 'Vencido', 'Conta de luz vencida'),
    ('Receita Pix recorrente',            'Consultas',         'receita_consultas', 220.00, 'receita'::public.financeiro_tipo, timezone('utc', now()) - interval '12 days', current_date, current_date - 8, 'PIX',    'Pago',     'Nutrição funcional'),
    ('Material de escritório',            'Administrativo',    'despesa_administrativa', 215.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '6 days', current_date, current_date - 2, 'Cartão', 'Pago', 'Compra na papelaria')
) as seed(descricao, categoria, categoria_dre, valor, tipo, data_lancamento, competencia, vencimento, metodo, status, observacoes)
where not exists (
  select 1 from public.financeiro_lancamentos fl
  where fl.descricao = seed.descricao
    and fl.competencia = seed.competencia
    and fl.valor = seed.valor
);

-- ============================================================================
-- ===== REGRAS DE REPASSE =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2
)
insert into public.regras_repasse (profissional_id, unidade_id, percentual, valor_fixo, ativo, observacoes)
select *
from (
  select especialista_1, principal_id, 35.00, null::numeric(12,2), true, 'Regra padrão da especialista principal' from refs
  union all
  select especialista_2, principal_id, 30.00, null::numeric(12,2), true, 'Regra padrão da especialista secundária' from refs
) as seed(profissional_id, unidade_id, percentual, valor_fixo, ativo, observacoes)
where not exists (
  select 1 from public.regras_repasse rr where rr.profissional_id = seed.profissional_id and rr.unidade_id = seed.unidade_id
);

-- ============================================================================
-- ===== REPASSES (1 pendente, 1 pago, 1 do mês passado) =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2
)
insert into public.repasses (profissional_id, unidade_id, periodo_inicio, periodo_fim, valor, status, pago_em)
select *
from (
  select especialista_1, principal_id, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '29 days')::date, 430.50, 'Pendente'::public.repasse_status, null::timestamptz from refs
  union all
  select especialista_2, principal_id, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '29 days')::date, 380.00, 'Pago'::public.repasse_status, timezone('utc', now()) - interval '2 days' from refs
  union all
  select especialista_1, principal_id, (date_trunc('month', current_date) - interval '1 month')::date, (date_trunc('month', current_date) - interval '1 day')::date, 1820.00, 'Pago'::public.repasse_status, (date_trunc('month', current_date) + interval '5 days')::timestamptz from refs
) as seed(profissional_id, unidade_id, periodo_inicio, periodo_fim, valor, status, pago_em)
where not exists (
  select 1 from public.repasses r
  where r.profissional_id = seed.profissional_id
    and r.periodo_inicio = seed.periodo_inicio
);

-- ============================================================================
-- ===== RELATORIOS =====
-- ============================================================================

insert into public.relatorios (nome, descricao, slug, parametros)
select *
from (
  values
    ('Fluxo de Caixa Mensal', 'Resumo mensal de entradas e saídas',           'fluxo-caixa-mensal',  '{"periodo":"mes_atual"}'::jsonb),
    ('Agenda Consolidada',     'Resumo operacional da agenda por unidade',     'agenda-consolidada',  '{"visao":"dia"}'::jsonb),
    ('Produção Clínica',       'Indicadores clínicos por especialista',        'producao-clinica',    '{"periodo":"mes_atual"}'::jsonb)
) as seed(nome, descricao, slug, parametros)
where not exists (
  select 1 from public.relatorios r where r.slug = seed.slug
);

-- ============================================================================
-- ===== CONTAS_BANCARIAS =====
-- ============================================================================

with refs as (
  select (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id
)
insert into public.contas_bancarias (unidade_id, nome, banco, agencia, conta, tipo, saldo_inicial, ativo)
select *
from (
  select principal_id, 'Conta PJ Itaú',   'Itaú Unibanco', '1234', '56789-0', 'corrente',      45000.00, true from refs
  union all
  select principal_id, 'Conta PJ Sicredi', 'Sicredi',        '0001', '99887-7', 'corrente',     12500.00, true from refs
) as seed(unidade_id, nome, banco, agencia, conta, tipo, saldo_inicial, ativo)
where not exists (
  select 1 from public.contas_bancarias cb where cb.nome = seed.nome and cb.unidade_id is not distinct from seed.unidade_id
);

-- ============================================================================
-- ===== CONCILIACAO_OFX =====
-- ============================================================================

with refs as (
  select
    (select id from public.contas_bancarias where nome = 'Conta PJ Itaú' limit 1) as conta_itau,
    (select id from public.contas_bancarias where nome = 'Conta PJ Sicredi' limit 1) as conta_sicredi,
    (select id from public.financeiro_lancamentos where descricao = 'Aluguel mensal' limit 1) as lanc_aluguel
)
insert into public.conciliacao_ofx (conta_id, data_transacao, valor, descricao, lancamento_id, conciliado, tipo, fitid)
select *
from (
  -- não conciliadas
  select conta_itau,    current_date - 2, 1250.00,  'TED Recebido — Cliente X',           null::uuid, false, 'CREDIT', 'FITID-ITAU-001' from refs
  union all
  select conta_itau,    current_date - 3,  -85.00,  'Tarifa bancária mensal',             null::uuid, false, 'DEBIT',  'FITID-ITAU-002' from refs
  union all
  select conta_sicredi, current_date - 1,  320.00,  'Pix recebido — paciente Carlos',     null::uuid, false, 'CREDIT', 'FITID-SICREDI-001' from refs
  -- conciliada (vinculada ao lançamento de aluguel)
  union all
  select conta_itau,    current_date - 10, -4500.00, 'Pagamento aluguel — referência',    lanc_aluguel, true,  'DEBIT',  'FITID-ITAU-003' from refs
) as seed(conta_id, data_transacao, valor, descricao, lancamento_id, conciliado, tipo, fitid)
where seed.conta_id is not null
  and not exists (
    select 1 from public.conciliacao_ofx co
    where co.conta_id = seed.conta_id
      and co.fitid = seed.fitid
  );

-- ============================================================================
-- ===== PACIENTE_EXAMES =====
-- ============================================================================

with refs as (
  select
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip,
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@paciente' limit 1) as portal_user_id
)
insert into public.paciente_exames (paciente_id, nome, tipo, url, uploaded_by, uploaded_pelo_paciente)
select *
from (
  select paciente_3,   'Hemograma — resultado',     'hemograma',    'https://example.com/exames/hemograma-carlos.pdf', especialista_1,  false from refs
  union all
  select paciente_4,   'ECG pendente',              'ecg',          'https://example.com/exames/ecg-fernanda.pdf',      especialista_1,  false from refs
  union all
  select paciente_vip, 'Ultrassom abdominal',       'ultrassom',    'https://example.com/exames/usg-marcos.pdf',        portal_user_id,  true  from refs
) as seed(paciente_id, nome, tipo, url, uploaded_by, uploaded_pelo_paciente)
where not exists (
  select 1 from public.paciente_exames pe
  where pe.paciente_id = seed.paciente_id and pe.nome = seed.nome
);

-- ============================================================================
-- ===== CARTOES_EMPRESARIAIS + CARTAO_MOVIMENTOS =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.unidades where nome = 'Unidade Jardins' limit 1) as jardins_id
)
insert into public.cartoes_empresariais (
  unidade_id, nome, bandeira, ultimos_digitos, limite_total, dia_vencimento, ativo
)
select *
from (
  select principal_id, 'Cartão Corporativo Itaú PJ', 'Visa',       '4242', 25000.00, 10, true from refs
  union all
  select jardins_id,    'Cartão Corporativo Sicredi PJ', 'Mastercard', '5555', 15000.00, 15, true from refs
) as seed(unidade_id, nome, bandeira, ultimos_digitos, limite_total, dia_vencimento, ativo)
where not exists (
  select 1 from public.cartoes_empresariais ce
  where ce.nome = seed.nome and ce.unidade_id is not distinct from seed.unidade_id
);

with refs as (
  select
    (select id from public.cartoes_empresariais where nome = 'Cartão Corporativo Itaú PJ' limit 1) as cartao_principal,
    (select id from public.usuarios where email = 'd@gestor' limit 1) as gestor_id
)
insert into public.cartao_movimentos (
  cartao_id, descricao, valor, parcelas, parcela_atual,
  data_compra, data_vencimento, beneficiario, categoria, operador_id
)
select *
from (
  select cartao_principal, 'Combustível posto Shell',           185.00, 1, 1, current_date - 2,  current_date + 8,  'Posto Shell',          'Combustível',  gestor_id from refs
  union all
  select cartao_principal, 'Material de escritório Kalunga',    340.00, 1, 1, current_date - 5,  current_date + 5,  'Kalunga SA',           'Escritório',   gestor_id from refs
  union all
  select cartao_principal, 'Assinatura software (anual)',      1188.00, 12, 3, current_date - 60, current_date + 10, 'Saas Provider',        'Software',     gestor_id from refs
  union all
  select cartao_principal, 'Almoço com fornecedor',             280.00, 1, 1, current_date - 7,  current_date + 3,  'Restaurante Demo',     'Representação', gestor_id from refs
  union all
  select cartao_principal, 'Uber corrida administrativa',        45.00, 1, 1, current_date - 1,  current_date + 9,  'Uber Trip',            'Transporte',   gestor_id from refs
) as seed(cartao_id, descricao, valor, parcelas, parcela_atual, data_compra, data_vencimento, beneficiario, categoria, operador_id)
where seed.cartao_id is not null
  and not exists (
    select 1 from public.cartao_movimentos cm
    where cm.cartao_id = seed.cartao_id
      and cm.descricao = seed.descricao
      and cm.data_compra = seed.data_compra
  );

-- ============================================================================
-- ===== PRESCRICOES + ITENS =====
-- ============================================================================

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '12345678900' limit 1) as paciente_1,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip
)
insert into public.prescricoes (
  paciente_id, profissional_id, numero, status, tipo,
  valor_total, data_prescricao, validade, observacoes
)
select *
from (
  select paciente_1,   especialista_1, 'RX-5001', 'Ativo',     'Prescrição', 180.00, current_date - 5,  current_date + 25, 'Prescrição ativa do portal' from refs
  union all
  select paciente_3,   especialista_2, 'AT-5002', 'Pendente',  'Atestado',     0.00, current_date - 2,  current_date + 7,  'Atestado pendente' from refs
  union all
  select paciente_4,   especialista_1, 'EX-5003', 'Cancelado', 'Exame',       95.00, current_date - 20, current_date - 2,  'Exame expirado' from refs
  union all
  select paciente_vip, especialista_1, 'VD-5004', 'Ativo',     'Venda',      184.90, current_date - 1,  current_date + 30, 'Venda de suplementos para paciente VIP' from refs
  union all
  select paciente_3,   especialista_1, 'PR-5005', 'Ativo',     'Prescrição', 220.00, current_date - 8,  current_date + 22, 'Prescrição nutricional ativa' from refs
  union all
  select paciente_4,   especialista_2, 'EN-5006', 'Pendente',  'Encaminhamento', 0.00, current_date - 1, current_date + 30, 'Encaminhamento para cardiologista' from refs
) as seed(paciente_id, profissional_id, numero, status, tipo, valor_total, data_prescricao, validade, observacoes)
where not exists (
  select 1 from public.prescricoes pr where pr.numero = seed.numero
);

insert into public.prescricao_itens (prescricao_id, produto_id, descricao, quantidade, valor_unitario)
select
  pr.id,
  pe.id,
  seed.descricao,
  seed.quantidade,
  seed.valor_unitario
from public.prescricoes pr
join (
  values
    ('RX-5001', 'CONS-001', 'Consulta Clínica Geral',                  1, 180.00),
    ('AT-5002', 'EXAM-001', 'Solicitação de exame laboratorial',       1,   0.00),
    ('EX-5003', 'EXAM-001', 'Hemograma completo',                       1,  95.00),
    ('VD-5004', 'PROD-001', 'Suplemento Vitamina D 5000UI',             1,  89.90),
    ('VD-5004', 'PROD-002', 'Suplemento Magnésio Quelado',              1,  95.00),
    ('PR-5005', 'CONS-001', 'Consulta de Nutrição Funcional',           1, 220.00),
    ('EN-5006', null,       'Encaminhamento para cardiologia',          1,   0.00)
) as seed(numero, sku, descricao, quantidade, valor_unitario)
  on pr.numero = seed.numero
left join public.produtos_estoque pe
  on pe.sku = seed.sku
  and pe.unidade_id = (select id from public.unidades where nome = 'Unidade Principal' limit 1)
where not exists (
  select 1 from public.prescricao_itens pi
  where pi.prescricao_id = pr.id and pi.descricao = seed.descricao
);

-- ============================================================================
-- ===== ANAMNESES =====
-- ============================================================================

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip
)
insert into public.anamneses (
  paciente_id, profissional_id, data_anamnese, tipo, queixa,
  imc, peso, gordura, altura, massa_muscular, gordura_visceral, massa_ossea, agua_corporal
)
select *
from (
  select paciente_3,   especialista_1, current_date - 15, 'Inicial', 'Dor lombar recorrente',                    24.40, 74.50, 18.20, 1.75, 31.10, 7.00, 3.20, 56.30 from refs
  union all
  select paciente_4,   especialista_2, current_date - 8,  'Retorno', 'Cansaço frequente e indisposição',         22.10, 61.30, 20.50, 1.66, 24.60, 5.00, 2.80, 54.10 from refs
  union all
  select paciente_vip, especialista_1, current_date - 30, 'Inicial', 'Check-up anual completo — preventivo',     26.20, 82.00, 22.10, 1.77, 32.50, 8.50, 3.40, 55.80 from refs
) as seed(paciente_id, profissional_id, data_anamnese, tipo, queixa, imc, peso, gordura, altura, massa_muscular, gordura_visceral, massa_ossea, agua_corporal)
where not exists (
  select 1 from public.anamneses a
  where a.paciente_id = seed.paciente_id and a.data_anamnese = seed.data_anamnese
);

-- ============================================================================
-- ===== PRONTUARIOS =====
-- ============================================================================

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip
)
insert into public.prontuarios (
  paciente_id, profissional_id, data_registro, tipo, status, conteudo
)
select *
from (
  select paciente_3,   especialista_1, current_date - 14, 'Consulta', 'Aberto'::public.prontuario_status,  '{"anotacoes":"Paciente em observacao, solicitar exames.","plano":"Voltar em 15 dias"}'::jsonb from refs
  union all
  select paciente_4,   especialista_2, current_date - 7,  'Retorno',  'Fechado'::public.prontuario_status, '{"anotacoes":"Conduta finalizada, manter acompanhamento.","plano":"Retornar em 60 dias se necessário"}'::jsonb from refs
  union all
  select paciente_vip, especialista_1, current_date - 29, 'Consulta', 'Em revisão'::public.prontuario_status, '{"anotacoes":"Paciente VIP — aguardando resultados de ultrassom.","plano":"Retorno agendado"}'::jsonb from refs
) as seed(paciente_id, profissional_id, data_registro, tipo, status, conteudo)
where not exists (
  select 1 from public.prontuarios p
  where p.paciente_id = seed.paciente_id and p.data_registro = seed.data_registro
);

-- ============================================================================
-- ===== EVOLUCOES =====
-- ============================================================================

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip
)
insert into public.evolucoes (
  paciente_id, profissional_id, data_evolucao, tipo, resumo, retorno_recepcao, docs_count
)
select *
from (
  select paciente_3,   especialista_1, current_date - 10, 'Reavaliação',     'Paciente apresentou melhora parcial do quadro doloroso.', 'Agendar retorno em 15 dias.', 2 from refs
  union all
  select paciente_4,   especialista_2, current_date - 4,  'Acompanhamento',  'Manter acompanhamento nutricional e reavaliar sintomas.',  'Confirmar preparo para retorno.', 1 from refs
  union all
  select paciente_vip, especialista_1, current_date - 20, 'Acompanhamento',  'Paciente estável, sem queixas — solicitado exame de imagem.', 'Agendar ultrassom abdominal.', 3 from refs
) as seed(paciente_id, profissional_id, data_evolucao, tipo, resumo, retorno_recepcao, docs_count)
where not exists (
  select 1 from public.evolucoes e
  where e.paciente_id = seed.paciente_id and e.data_evolucao = seed.data_evolucao
);

-- ============================================================================
-- ===== DOCUMENTOS_CLINICOS =====
-- ============================================================================

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip
)
insert into public.documentos_clinicos (
  paciente_id, profissional_id, tipo, meio, recebido, anexo_url, atualizado_em
)
select
  case
    when seed.tipo = 'Laudo de ultrassom' then refs.paciente_vip
    else refs.paciente_3
  end as paciente_id,
  refs.especialista_1,
  seed.tipo,
  seed.meio,
  seed.recebido,
  seed.anexo_url,
  timezone('utc', now()) - seed.offset_time
from refs
cross join (
  values
    ('Exame laboratorial',     'digital'::public.documento_meio,    true,  'https://example.com/exame.pdf'::text,                 interval '3 days'),
    ('Receita assinada',       'fisico'::public.documento_meio,     false, null::text,                                            interval '1 day'),
    ('Termo de consentimento', 'assinatura'::public.documento_meio, true,  'https://example.com/termo-consentimento.pdf'::text,   interval '5 days'),
    ('Laudo de ultrassom',     'digital'::public.documento_meio,    true,  'https://example.com/laudo-usg.pdf'::text,             interval '7 days')
) as seed(tipo, meio, recebido, anexo_url, offset_time)
where not exists (
  select 1 from public.documentos_clinicos dc
  where dc.paciente_id =
        case
          when seed.tipo = 'Laudo de ultrassom' then refs.paciente_vip
          else refs.paciente_3
        end
    and dc.tipo = seed.tipo
);

-- ============================================================================
-- ===== CARTOES_PACIENTE (portal) =====
-- ============================================================================

with refs as (
  select
    (select id from public.pacientes where cpf = '12345678900' limit 1) as paciente_1,
    (select id from public.pacientes where cpf = '66666666666' limit 1) as paciente_7
)
insert into public.cartoes_paciente (paciente_id, bandeira, final, titular, token_gateway)
select *
from (
  select paciente_1, 'Visa',       '4242', 'Maria Silva',     'tok_demo_visa_4242' from refs
  union all
  select paciente_7, 'Mastercard', '5555', 'Beatriz Mendes',  'tok_demo_master_5555' from refs
) as seed(paciente_id, bandeira, final, titular, token_gateway)
where not exists (
  select 1 from public.cartoes_paciente c
  where c.paciente_id = seed.paciente_id and c.final = seed.final
);

-- ============================================================================
-- ===== PAGAMENTOS_PACIENTE (portal) =====
-- ============================================================================

with refs as (
  select
    (select id from public.pacientes where cpf = '12345678900' limit 1) as paciente_1,
    (select id from public.pacientes where cpf = '66666666666' limit 1) as paciente_7
)
insert into public.pagamentos_paciente (paciente_id, descricao, valor, status, vencimento_em, pago_em)
select *
from (
  select paciente_1, 'Consulta Clínica Geral',   180.00, 'Pendente'::public.pagamento_status, current_date + 3,  null::timestamptz                                          from refs
  union all
  select paciente_1, 'Bioressonância Quântica',  250.00, 'Pago'::public.pagamento_status,     current_date - 12, timezone('utc', now()) - interval '10 days'                from refs
  union all
  select paciente_1, 'Hemograma',                 95.00, 'Vencido'::public.pagamento_status,  current_date - 5,  null::timestamptz                                          from refs
  union all
  select paciente_7, 'Consulta Nutrição',        220.00, 'Pago'::public.pagamento_status,     current_date - 3,  timezone('utc', now()) - interval '3 days'                 from refs
) as seed(paciente_id, descricao, valor, status, vencimento_em, pago_em)
where not exists (
  select 1 from public.pagamentos_paciente pg
  where pg.paciente_id = seed.paciente_id
    and pg.descricao = seed.descricao
    and pg.vencimento_em = seed.vencimento_em
);

-- ============================================================================
-- ===== WHATSAPP_DISPAROS =====
-- ============================================================================

with refs as (
  select
    (select id from public.pacientes where cpf = '12345678900' limit 1) as paciente_1,
    (select id from public.pacientes where cpf = '11111111111' limit 1) as paciente_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '99999999933' limit 1) as paciente_vip
)
insert into public.whatsapp_disparos (
  tipo, paciente_id, telefone, mensagem, status, erro_detalhe, agendado_para, enviado_em
)
select *
from (
  select 'lembrete_consulta',   paciente_1,   '(11) 99999-9999', 'Olá Maria! Sua consulta de Clínica Geral é amanhã às 08h. Confirma presença?', 'enviado',  null::text,                                  timezone('utc', now()) - interval '1 day',  timezone('utc', now()) - interval '23 hours' from refs
  union all
  select 'lembrete_consulta',   paciente_2,   '(11) 98888-1001', 'Olá Ana! Sua Bioressonância Quântica é hoje às 09h.',                          'enviado',  null::text,                                  timezone('utc', now()) - interval '6 hours', timezone('utc', now()) - interval '6 hours' from refs
  union all
  select 'pos_consulta',        paciente_3,   '(11) 98888-1002', 'Carlos, foi um prazer atendê-lo hoje. Cuide-se!',                              'enviado',  null::text,                                  timezone('utc', now()) - interval '2 hours', timezone('utc', now()) - interval '2 hours' from refs
  union all
  select 'lembrete_consulta',   paciente_vip, '(11) 98888-1010', 'Sr. Marcos, sua sessão de acupuntura é hoje às 14:30.',                       'enviado',  null::text,                                  timezone('utc', now()) - interval '4 hours', timezone('utc', now()) - interval '4 hours' from refs
  union all
  select 'aniversario',         paciente_2,   '(11) 98888-1001', 'Feliz aniversário, Ana! 🎉 A equipe Integrallys deseja muita saúde!',         'pendente', null::text,                                  timezone('utc', now()) + interval '8 hours',  null::timestamptz from refs
  union all
  select 'campanha',            paciente_1,   '(11) 99999-9999', 'Maria, retornos de Bioressonância com 50% de desconto até 31/05!',            'falha',    'Número não está no WhatsApp Business — erro 400', timezone('utc', now()) - interval '12 hours', null::timestamptz from refs
) as seed(tipo, paciente_id, telefone, mensagem, status, erro_detalhe, agendado_para, enviado_em)
where not exists (
  select 1 from public.whatsapp_disparos wd
  where wd.paciente_id = seed.paciente_id
    and wd.tipo = seed.tipo
    and wd.agendado_para = seed.agendado_para
);

-- ============================================================================
-- ===== CHATBOT_SESSOES =====
-- ============================================================================

with refs as (
  select
    (select id from public.pacientes where cpf = '11111111111' limit 1) as paciente_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3
)
insert into public.chatbot_sessoes (telefone, paciente_id, estado, contexto, ultima_interacao)
select *
from (
  select '(11) 91111-1111'::text, paciente_2,    'aguardando_data'::text,
         jsonb_build_object(
           'nome', 'Ana Rodrigues',
           'especialista', 'Dra. Maria Santos',
           'mensagens', jsonb_build_array(
             jsonb_build_object('from','bot','text','Olá! Para qual especialista?'),
             jsonb_build_object('from','user','text','Dra. Maria Santos'),
             jsonb_build_object('from','bot','text','Qual a data preferida?')
           )
         ),
         timezone('utc', now()) - interval '5 minutes' from refs
  union all
  select '(11) 92222-2222'::text, paciente_3,    'concluido'::text,
         jsonb_build_object(
           'nome', 'Carlos Almeida',
           'agendamento_id', null,
           'concluido_em', (timezone('utc', now()) - interval '1 day')::text,
           'mensagens', jsonb_build_array(
             jsonb_build_object('from','bot','text','Agendamento confirmado para amanhã 10h')
           )
         ),
         timezone('utc', now()) - interval '1 day' from refs
  union all
  select '(11) 93333-3333'::text, null::uuid,    'encerrado'::text,
         jsonb_build_object('motivo', 'timeout — sem resposta por mais de 30min'),
         timezone('utc', now()) - interval '2 days' from refs
) as seed(telefone, paciente_id, estado, contexto, ultima_interacao)
where not exists (
  select 1 from public.chatbot_sessoes cs where cs.telefone = seed.telefone
);

-- ============================================================================
-- ===== PAGAMENTOS_ONLINE =====
-- ============================================================================

with refs as (
  select
    (select id from public.agendamentos
       where data_agendamento = current_date and horario_inicio = time '09:00' limit 1) as agend_biores,
    (select id from public.agendamentos
       where data_agendamento = current_date and horario_inicio = time '13:00' limit 1) as agend_cardio,
    (select id from public.financeiro_lancamentos where descricao = 'Bioressonância Quântica' limit 1) as lanc_biores
)
insert into public.pagamentos_online (
  agendamento_id, lancamento_id, gateway, gateway_id, tipo, valor,
  status, qr_code, qr_code_copia_cola, link_pagamento, pago_em
)
select *
from (
  select agend_biores, lanc_biores, 'sicredi', 'pix-demo-001', 'pix',            250.00, 'pendente',  'iVBORw0KGgoAAAANSUhEUgAAA...(base64-truncated)'::text, '00020126360014BR.GOV.BCB.PIX0114+5511999999999...'::text, 'https://pay.sicredi.com.br/pix-demo-001'::text, null::timestamptz from refs
  union all
  select agend_biores, null::uuid,   'sicredi', 'pix-demo-002', 'pix',            180.00, 'capturado', 'iVBORw0KGgoAAAANSUhEUgAAA...(base64-truncated)'::text, '00020126360014BR.GOV.BCB.PIX0114+5511999999999...'::text, 'https://pay.sicredi.com.br/pix-demo-002'::text, timezone('utc', now()) - interval '2 hours' from refs
  union all
  select agend_cardio, null::uuid,   'cielo',   'cielo-demo-003', 'cartao_credito', 320.00, 'capturado', null::text, null::text, 'https://pay.cielo.com.br/cielo-demo-003'::text, timezone('utc', now()) - interval '1 hour' from refs
) as seed(agendamento_id, lancamento_id, gateway, gateway_id, tipo, valor, status, qr_code, qr_code_copia_cola, link_pagamento, pago_em)
where not exists (
  select 1 from public.pagamentos_online po
  where po.gateway = seed.gateway and po.gateway_id = seed.gateway_id
);

-- ============================================================================
-- ===== CRM_PACIENTE_ESTAGIOS =====
-- Distribuição: 2 lead, 2 ativo, 1 em_tratamento, 1 retorno_pendente, 1 vip, 1 inativo
-- ============================================================================

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id
)
insert into public.crm_paciente_estagios (
  paciente_id, estagio, observacoes, proxima_acao, data_proxima_acao, responsavel_id
)
select
  p.id, seed.estagio, seed.observacoes, seed.proxima_acao, seed.data_proxima_acao,
  case
    when seed.estagio in ('em_tratamento', 'vip', 'retorno_pendente') then (select especialista_1 from refs)
    else (select recepcao_id from refs)
  end
from public.pacientes p
join (
  values
    ('12345678900', 'ativo',             'Paciente do portal — frequência alta',                   'Confirmar próxima consulta',          current_date + 5),
    ('11111111111', 'em_tratamento',     'Bioressonância em andamento (3 de 6 sessões)',           'Marcar 4ª sessão',                    current_date + 7),
    ('22222222222', 'retorno_pendente',  'Aguardando agendar retorno pós-exame',                   'Ligar para agendar retorno',          current_date + 2),
    ('33333333333', 'ativo',             'Paciente recorrente — última visita há 30 dias',         'Enviar lembrete de retorno',          current_date + 10),
    ('44444444444', 'lead',              'Indicação recente — primeiro contato pendente',          'Contato inicial WhatsApp',            current_date + 1),
    ('55555555555', 'inativo',           'Sem retorno há mais de 6 meses',                          'Campanha de reativação',              current_date + 14),
    ('66666666666', 'lead',              'Cadastrou-se via portal — ainda não agendou primeira',   'Email de boas-vindas',                current_date + 1),
    ('99999999933', 'vip',               'Paciente VIP — acompanhamento contínuo, atenção máxima', 'Check-in mensal',                     current_date + 30)
) as seed(cpf, estagio, observacoes, proxima_acao, data_proxima_acao)
  on p.cpf = seed.cpf
on conflict (paciente_id) do nothing;

-- ============================================================================
-- ===== WHATSAPP_CAMPANHAS =====
-- ============================================================================

insert into public.whatsapp_campanhas (
  nome, tipo, mensagem_template, data_disparo, hora_disparo, status,
  total_enviados, total_erros, filtro_estagio
)
select *
from (
  values
    ('Retorno Bioressonância — Demo',
      'personalizado',
      'Olá {paciente}! Os retornos de Bioressonância têm 50% de desconto se agendados em até 35 dias. Aproveite!',
      current_date + 3,
      time '10:00',
      'agendada',
      0, 0, 'em_tratamento'),
    ('Campanha de Natal 2025 — concluída',
      'natal',
      'Feliz Natal, {paciente}! 🎄 A equipe Integrallys deseja muita saúde e paz a você e sua família.',
      current_date - 30,
      time '09:00',
      'concluida',
      127, 4, null::text)
) as seed(nome, tipo, mensagem_template, data_disparo, hora_disparo, status, total_enviados, total_erros, filtro_estagio)
on conflict (nome) do nothing;

-- ============================================================================
-- ===== AUDIT_LOG =====
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@admin' limit 1) as admin_id,
    (select id from public.usuarios where email = 'd@gestor' limit 1) as gestor_id,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id,
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1
)
insert into public.audit_log (actor_user_id, unidade_id, acao, recurso, descricao, ip, detalhes)
select *
from (
  select admin_id,        principal_id, 'create', 'usuarios',     'Cadastro de usuário realizado',                 '127.0.0.1'::inet, '{"origem":"seed"}'::jsonb from refs
  union all
  select gestor_id,       principal_id, 'update', 'configuracoes','Alteração em configuração do portal',           '127.0.0.1'::inet, '{"origem":"seed"}'::jsonb from refs
  union all
  select recepcao_id,     principal_id, 'read',   'financeiro',   'Consulta ao módulo financeiro',                 '127.0.0.1'::inet, '{"origem":"seed"}'::jsonb from refs
  union all
  select especialista_1,  principal_id, 'create', 'prescricoes',  'Nova prescrição emitida para paciente',         '127.0.0.1'::inet, '{"origem":"seed","numero":"RX-5001"}'::jsonb from refs
  union all
  select admin_id,        principal_id, 'delete', 'tarefas',      'Tarefa removida pelo administrador',             '127.0.0.1'::inet, '{"origem":"seed"}'::jsonb from refs
) as seed(actor_user_id, unidade_id, acao, recurso, descricao, ip, detalhes)
where not exists (
  select 1 from public.audit_log al
  where al.acao = seed.acao
    and al.recurso = seed.recurso
    and coalesce(al.descricao, '') = coalesce(seed.descricao, '')
);

-- ============================================================================
-- ===== NOTIFICACOES =====
-- ============================================================================

insert into public.notificacoes (
  usuario_id, titulo, descricao, href, kind, lida, ocorrido_em,
  source_key, source_table, source_id
)
select
  u.id,
  seed.titulo,
  seed.descricao,
  seed.href,
  seed.kind,
  seed.lida,
  timezone('utc', now()) - seed.offset_time,
  seed.source_key || '_' || u.email,
  seed.source_table,
  null::uuid
from public.usuarios u
cross join (
  values
    ('Próxima consulta',          'Há atendimento confirmado na agenda de hoje.',           '/agenda',       'agenda'::public.notificacao_kind,       false, interval '1 hour',   'agenda_hoje',         'agendamentos'),
    ('Pagamento pendente',        'Existe cobrança pendente aguardando baixa.',             '/financeiro',   'financeiro'::public.notificacao_kind,   false, interval '3 hours',  'financeiro_pendente', 'financeiro_lancamentos'),
    ('Nova prescrição disponível','Uma nova prescrição foi registrada para acompanhamento.','/prescricoes',  'prescricao'::public.notificacao_kind,   true,  interval '1 day',    'prescricao_nova',     'prescricoes'),
    ('Lista de espera atualizada','Há novos pacientes aguardando encaixe.',                 '/lista-espera', 'lista_espera'::public.notificacao_kind, false, interval '2 hours',  'fila_atualizada',     'lista_espera')
) as seed(titulo, descricao, href, kind, lida, offset_time, source_key, source_table)
where u.email in ('d@admin', 'd@gestor', 'd@recepcao', 'd@especialista', 'd@paciente')
  and not exists (
    select 1 from public.notificacoes n
    where n.usuario_id = u.id
      and n.source_key = seed.source_key || '_' || u.email
  );

commit;

-- ============================================================================
-- Fim do seed 005_demo_completo.sql
--
-- Para checar cobertura por tabela:
--   select 'unidades' as tabela, count(*) from public.unidades
--   union all select 'usuarios', count(*) from public.usuarios
--   union all select 'pacientes', count(*) from public.pacientes
--   union all select 'agendamentos', count(*) from public.agendamentos
--   union all select 'financeiro_lancamentos', count(*) from public.financeiro_lancamentos
--   -- ...etc
--   order by tabela;
-- ============================================================================
