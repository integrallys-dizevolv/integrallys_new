-- 002_dashboard_full_seed.sql
-- Seed mais completa para demonstracao de dashboards, modulos operacionais,
-- bloco clinico, financeiro, portal do paciente e notificacoes.
--
-- Uso:
-- 1. aplique todas as migrations
-- 2. rode 001_base_dev_seed.sql
-- 3. rode este arquivo

begin;

-- ============================================================================
-- BASE: unidades
-- ============================================================================

insert into public.unidades (nome, cidade, status, endereco, gestor_nome)
select *
from (
  values
    ('Unidade Principal', 'São Paulo', 'Ativa'::public.unidade_status, 'Rua Exemplo, 100', 'Gestor Demo'),
    ('Unidade Jardins', 'São Paulo', 'Ativa'::public.unidade_status, 'Alameda Exemplo, 200', 'Gestora Jardins'),
    ('Unidade Santana', 'São Paulo', 'Inativa'::public.unidade_status, 'Av. Norte, 300', 'Gestor Santana')
) as seed(nome, cidade, status, endereco, gestor_nome)
where not exists (
  select 1 from public.unidades u where u.nome = seed.nome
);

-- ============================================================================
-- BASE: usuarios demo
-- Senha demo para todos: 1234
-- ============================================================================

with unidades as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.unidades where nome = 'Unidade Jardins' limit 1) as jardins_id
)
insert into public.usuarios (unidade_id, nome, email, senha_hash, perfil, status, telefone)
select *
from (
  select principal_id, 'Administrador Demo', 'd@admin', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'admin'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0001' from unidades
  union all
  select principal_id, 'Gestor Demo', 'd@gestor', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'gestor'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0002' from unidades
  union all
  select principal_id, 'Recepção Demo', 'd@recepcao', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'recepcao'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0003' from unidades
  union all
  select principal_id, 'Dra. Maria Santos', 'd@especialista', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'especialista'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0004' from unidades
  union all
  select principal_id, 'Dr. João Silva', 'd@especialista2', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'especialista'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0005' from unidades
  union all
  select jardins_id, 'Gestora Jardins', 'd@gestor2', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'gestor'::public.user_role, 'Ativo'::public.user_status, '(11) 90000-0006' from unidades
  union all
  select principal_id, 'Paciente Demo', 'd@paciente', '$2b$10$Au1P3y8b4k/N5Fi4Cuf9jeO/nKxL9T6MIPIVuy4YxkUt0sxHR/yjS', 'paciente'::public.user_role, 'Ativo'::public.user_status, '(11) 99999-9999' from unidades
) as seed(unidade_id, nome, email, senha_hash, perfil, status, telefone)
where not exists (
  select 1 from public.usuarios u where u.email = seed.email
);

-- ============================================================================
-- PACIENTES
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.unidades where nome = 'Unidade Jardins' limit 1) as jardins_id,
    (select id from public.usuarios where email = 'd@paciente' limit 1) as portal_user_id
)
insert into public.pacientes (
  usuario_id,
  unidade_id,
  nome,
  email,
  telefone,
  status,
  data_nascimento,
  cpf,
  observacoes
)
select *
from (
  select portal_user_id, principal_id, 'Maria Silva', 'd@paciente', '(11) 99999-9999', 'Ativo'::public.paciente_status, date '1990-05-10', '12345678900', 'Paciente do portal' from refs
  union all
  select null, principal_id, 'Ana Rodrigues', 'ana@demo.local', '(11) 98888-1001', 'Ativo'::public.paciente_status, date '1988-03-12', '11111111111', 'Paciente recorrente da recepcao' from refs
  union all
  select null, principal_id, 'Carlos Almeida', 'carlos@demo.local', '(11) 98888-1002', 'Ativo'::public.paciente_status, date '1979-07-21', '22222222222', 'Paciente com historico clinico' from refs
  union all
  select null, principal_id, 'Fernanda Costa', 'fernanda@demo.local', '(11) 98888-1003', 'Ativo'::public.paciente_status, date '1995-11-02', '33333333333', 'Paciente com prescricoes e pagamentos' from refs
  union all
  select null, jardins_id, 'Roberto Lima', 'roberto@demo.local', '(11) 98888-1004', 'Ativo'::public.paciente_status, date '1985-08-18', '44444444444', 'Paciente da unidade Jardins' from refs
  union all
  select null, principal_id, 'Juliana Prado', 'juliana@demo.local', '(11) 98888-1005', 'Inativo'::public.paciente_status, date '1992-01-15', '55555555555', 'Paciente inativada para visualizacao de status' from refs
) as seed(usuario_id, unidade_id, nome, email, telefone, status, data_nascimento, cpf, observacoes)
where not exists (
  select 1
  from public.pacientes p
  where p.cpf = seed.cpf
     or (seed.usuario_id is not null and p.usuario_id = seed.usuario_id)
);

-- ============================================================================
-- CONFIGURACOES DO PORTAL E PERFIS COMPLEMENTARES
-- ============================================================================

insert into public.configuracoes (categoria, chave, valor)
values
  ('portal_paciente', 'clinic_patient_alert_title', 'Importante: Retornos com Desconto'),
  ('portal_paciente', 'clinic_patient_alert_message', 'Retornos de Bioressonancia Quantica tem 50% de desconto se agendados dentro de 35 dias corridos apos a ultima consulta. Apos esse prazo, o valor sera integral.'),
  ('sistema', 'company_name', 'Integrallys'),
  ('sistema', 'finance_dashboard_mode', 'full'),
  ('atendimento', 'retorno_desconto_ativo', 'true')
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
    ('55555555555', 'SP-60.000.666', 'feminino', 'outros', '02020000', 'Rua Voluntários', '52', '', 'Santana', 'São Paulo', 'SP')
) as seed(cpf, rg, sexo, source, cep, street, number, complement, neighborhood, city, state)
  on p.cpf = seed.cpf
on conflict (categoria, chave)
do update set
  valor = excluded.valor,
  updated_at = timezone('utc', now());

-- ============================================================================
-- PRODUTOS / ESTOQUE
-- ============================================================================

with unidades as (
  select id, nome from public.unidades where nome in ('Unidade Principal', 'Unidade Jardins')
)
insert into public.produtos_estoque (unidade_id, nome, categoria, sku, quantidade, estoque_minimo, status)
select
  u.id,
  seed.nome,
  seed.categoria,
  seed.sku,
  seed.quantidade,
  seed.estoque_minimo,
  seed.status
from unidades u
cross join (
  values
    ('Clínica Geral', 'Consulta', 'CONS-001', 999, 10, 'Disponível'),
    ('Bioressonância Quântica', 'Procedimento', 'PROC-001', 999, 10, 'Disponível'),
    ('Hemograma', 'Exame', 'EXAM-001', 999, 10, 'Disponível'),
    ('Cardiologia', 'Consulta', 'CONS-002', 999, 10, 'Disponível'),
    ('Kit de Coleta', 'Insumo', 'INS-001', 80, 15, 'Disponível'),
    ('Luvas Nitrílicas', 'Insumo', 'INS-002', 120, 20, 'Disponível')
) as seed(nome, categoria, sku, quantidade, estoque_minimo, status)
where not exists (
  select 1 from public.produtos_estoque pe where pe.unidade_id = u.id and pe.sku = seed.sku
);

insert into public.movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, observacoes)
select
  pe.id,
  (select id from public.usuarios where email = 'd@recepcao' limit 1),
  seed.tipo,
  seed.quantidade,
  seed.observacoes
from public.produtos_estoque pe
join (
  values
    ('INS-001', 'entrada'::public.movimento_caixa_tipo, 20, 'Reposicao semanal'),
    ('INS-002', 'saida'::public.movimento_caixa_tipo, 10, 'Consumo em atendimentos')
) as seed(sku, tipo, quantidade, observacoes)
  on pe.sku = seed.sku
where not exists (
  select 1
  from public.movimentacoes_estoque me
  where me.produto_id = pe.id
    and me.tipo = seed.tipo
    and me.quantidade = seed.quantidade
    and coalesce(me.observacoes, '') = seed.observacoes
);

-- ============================================================================
-- AGENDA / LISTA DE ESPERA / TAREFAS
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
    (select id from public.pacientes where cpf = '44444444444' limit 1) as paciente_5
)
insert into public.agendamentos (
  unidade_id,
  paciente_id,
  profissional_id,
  criado_por_id,
  data_agendamento,
  horario_inicio,
  horario_fim,
  status,
  observacoes
)
select *
from (
  select principal_id, paciente_1, especialista_1, recepcao_id, current_date, time '08:00', time '09:00', 'Agendado'::public.agendamento_status, 'Clínica Geral' from refs
  union all
  select principal_id, paciente_2, especialista_1, recepcao_id, current_date, time '09:00', time '10:00', 'Confirmado'::public.agendamento_status, 'Bioressonância Quântica' from refs
  union all
  select principal_id, paciente_3, especialista_2, recepcao_id, current_date, time '10:30', time '11:30', 'Confirmado'::public.agendamento_status, 'Hemograma' from refs
  union all
  select principal_id, paciente_4, especialista_2, recepcao_id, current_date, time '13:00', time '14:00', 'Em atendimento'::public.agendamento_status, 'Cardiologia' from refs
  union all
  select principal_id, paciente_1, especialista_1, recepcao_id, current_date - 3, time '15:00', time '16:00', 'Concluído'::public.agendamento_status, 'Retorno concluído' from refs
  union all
  select principal_id, paciente_2, especialista_1, recepcao_id, current_date - 10, time '14:00', time '15:00', 'Concluído'::public.agendamento_status, 'Consulta concluída' from refs
  union all
  select principal_id, paciente_3, especialista_2, recepcao_id, current_date + 1, time '08:30', time '09:30', 'Agendado'::public.agendamento_status, 'Clínica Geral' from refs
  union all
  select jardins_id, paciente_5, especialista_2, recepcao_id, current_date + 2, time '11:00', time '12:00', 'Confirmado'::public.agendamento_status, 'Cardiologia' from refs
) as seed(unidade_id, paciente_id, profissional_id, criado_por_id, data_agendamento, horario_inicio, horario_fim, status, observacoes)
where not exists (
  select 1 from public.agendamentos a
  where a.paciente_id = seed.paciente_id
    and a.data_agendamento = seed.data_agendamento
    and a.horario_inicio = seed.horario_inicio
);

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4,
    (select id from public.pacientes where cpf = '55555555555' limit 1) as paciente_6
)
insert into public.lista_espera (paciente_id, unidade_id, prioridade, observacoes)
select *
from (
  select paciente_4, principal_id, 'Alta'::public.fila_prioridade, 'Paciente aguardando encaixe para retorno' from refs
  union all
  select paciente_6, principal_id, 'Média'::public.fila_prioridade, 'Preferência por período da manhã' from refs
) as seed(paciente_id, unidade_id, prioridade, observacoes)
where not exists (
  select 1 from public.lista_espera le where le.paciente_id = seed.paciente_id
);

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id
)
insert into public.tarefas (titulo, descricao, responsavel_id, status, vencimento_em, created_by_id)
select *
from (
  select 'Retornar ligação para paciente', 'Confirmar preparo do exame agendado.', especialista_1, 'Pendente'::public.tarefa_status, timezone('utc', now()) + interval '4 hours', recepcao_id from refs
  union all
  select 'Revisar prontuário pendente', 'Validar documentação clínica antes do atendimento da tarde.', especialista_2, 'Pendente'::public.tarefa_status, timezone('utc', now()) + interval '6 hours', recepcao_id from refs
) as seed(titulo, descricao, responsavel_id, status, vencimento_em, created_by_id)
where not exists (
  select 1 from public.tarefas t
  where t.titulo = seed.titulo
    and t.responsavel_id = seed.responsavel_id
);

-- ============================================================================
-- FINANCEIRO / CAIXA / REPASSE / RELATORIOS
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id
)
insert into public.caixa_sessoes (
  unidade_id,
  opened_by_id,
  data_operacao,
  status,
  saldo_inicial,
  observacoes,
  aberto_em
)
select
  principal_id,
  recepcao_id,
  current_date,
  'aberto',
  350.00,
  'Sessão aberta para validação operacional',
  timezone('utc', now()) - interval '2 hours'
from refs
where not exists (
  select 1 from public.caixa_sessoes cs
  where cs.unidade_id = principal_id
    and cs.data_operacao = current_date
);

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id,
    (select id from public.caixa_sessoes where unidade_id = (select id from public.unidades where nome = 'Unidade Principal' limit 1) and data_operacao = current_date limit 1) as sessao_id
)
insert into public.caixa_movimentos (
  unidade_id,
  usuario_id,
  sessao_id,
  descricao,
  tipo,
  valor,
  forma,
  origem,
  operador_nome,
  data_movimento
)
select
  principal_id,
  recepcao_id,
  sessao_id,
  seed.descricao,
  seed.tipo,
  seed.valor,
  seed.forma,
  seed.origem,
  'Recepção Demo',
  timezone('utc', now()) - seed.offset_time
from refs
cross join (
  values
    ('Consulta particular', 'entrada'::public.movimento_caixa_tipo, 180.00, 'dinheiro', 'manual', interval '90 minutes'),
    ('Pagamento em cartão', 'entrada'::public.movimento_caixa_tipo, 250.00, 'cartao', 'manual', interval '70 minutes'),
    ('Sangria parcial', 'saida'::public.movimento_caixa_tipo, 50.00, 'dinheiro', 'manual', interval '40 minutes'),
    ('Suprimento do caixa', 'entrada'::public.movimento_caixa_tipo, 100.00, 'dinheiro', 'manual', interval '20 minutes')
) as seed(descricao, tipo, valor, forma, origem, offset_time)
where not exists (
  select 1 from public.caixa_movimentos cm
  where cm.sessao_id = sessao_id
    and cm.descricao = seed.descricao
    and cm.valor = seed.valor
);

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@gestor' limit 1) as gestor_id
)
insert into public.financeiro_lancamentos (
  unidade_id,
  usuario_id,
  descricao,
  categoria,
  valor,
  tipo,
  data_lancamento,
  competencia,
  metodo,
  status,
  observacoes
)
select
  principal_id,
  gestor_id,
  seed.descricao,
  seed.categoria,
  seed.valor,
  seed.tipo,
  seed.data_lancamento,
  seed.competencia,
  seed.metodo,
  seed.status,
  seed.observacoes
from refs
cross join (
  values
    ('Recebimento consulta particular', 'Consultas', 180.00, 'receita'::public.financeiro_tipo, timezone('utc', now()) - interval '1 day', current_date, 'Dinheiro', 'Pago', 'Consulta realizada'),
    ('Bioressonância Quântica', 'Procedimentos', 250.00, 'receita'::public.financeiro_tipo, timezone('utc', now()), current_date, 'Cartão', 'Pendente', 'Pagamento pendente'),
    ('Compra de insumos', 'Operacional', 120.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) - interval '2 day', current_date, 'PIX', 'Pago', 'Reposição de estoque'),
    ('Serviço terceirizado', 'Administrativo', 300.00, 'despesa'::public.financeiro_tipo, timezone('utc', now()) + interval '2 day', current_date, 'Boleto', 'Pendente', 'Prestador externo'),
    ('Receita de cardiologia', 'Consultas', 420.00, 'receita'::public.financeiro_tipo, timezone('utc', now()) - interval '5 day', current_date, 'PIX', 'Pago', 'Atendimentos fechados no período')
) as seed(descricao, categoria, valor, tipo, data_lancamento, competencia, metodo, status, observacoes)
where not exists (
  select 1 from public.financeiro_lancamentos fl
  where fl.descricao = seed.descricao
    and fl.competencia = seed.competencia
);

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
  select especialista_2, principal_id, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '29 days')::date, 380.00, 'Pago'::public.repasse_status, timezone('utc', now()) - interval '2 day' from refs
) as seed(profissional_id, unidade_id, periodo_inicio, periodo_fim, valor, status, pago_em)
where not exists (
  select 1 from public.repasses r
  where r.profissional_id = seed.profissional_id
    and r.periodo_inicio = seed.periodo_inicio
);

insert into public.relatorios (nome, descricao, slug, parametros)
select *
from (
  values
    ('Fluxo de Caixa Mensal', 'Resumo mensal de entradas e saídas', 'fluxo-caixa-mensal', '{"periodo":"mes_atual"}'::jsonb),
    ('Agenda Consolidada', 'Resumo operacional da agenda por unidade', 'agenda-consolidada', '{"visao":"dia"}'::jsonb),
    ('Produção Clínica', 'Indicadores clínicos por especialista', 'producao-clinica', '{"periodo":"mes_atual"}'::jsonb)
) as seed(nome, descricao, slug, parametros)
where not exists (
  select 1 from public.relatorios r where r.slug = seed.slug
);

-- ============================================================================
-- PRESCRICOES / CLINICO
-- ============================================================================

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '12345678900' limit 1) as paciente_1,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4
)
insert into public.prescricoes (
  paciente_id,
  profissional_id,
  numero,
  status,
  tipo,
  valor_total,
  data_prescricao,
  validade,
  observacoes
)
select *
from (
  select paciente_1, especialista_1, 'RX-3001', 'Ativo', 'Prescrição', 180.00, current_date - 5, current_date + 25, 'Prescrição ativa do portal' from refs
  union all
  select paciente_3, especialista_2, 'AT-3002', 'Pendente', 'Atestado', 0.00, current_date - 2, current_date + 7, 'Atestado pendente' from refs
  union all
  select paciente_4, especialista_1, 'EX-3003', 'Cancelado', 'Exame', 95.00, current_date - 20, current_date - 2, 'Exame expirado' from refs
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
    ('RX-3001', 'CONS-001', 'Consulta Clínica Geral', 1, 180.00),
    ('AT-3002', 'EXAM-001', 'Solicitação de exame laboratorial', 1, 0.00),
    ('EX-3003', 'EXAM-001', 'Hemograma completo', 1, 95.00)
) as seed(numero, sku, descricao, quantidade, valor_unitario)
  on pr.numero = seed.numero
left join public.produtos_estoque pe
  on pe.sku = seed.sku and pe.unidade_id = (select id from public.unidades where nome = 'Unidade Principal' limit 1)
where not exists (
  select 1 from public.prescricao_itens pi where pi.prescricao_id = pr.id and pi.descricao = seed.descricao
);

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4
)
insert into public.anamneses (
  paciente_id,
  profissional_id,
  data_anamnese,
  tipo,
  queixa,
  imc,
  peso,
  gordura,
  altura,
  massa_muscular,
  gordura_visceral,
  massa_ossea,
  agua_corporal
)
select *
from (
  select paciente_3, especialista_1, current_date - 15, 'Inicial', 'Dor lombar recorrente', 24.40, 74.50, 18.20, 1.75, 31.10, 7.00, 3.20, 56.30 from refs
  union all
  select paciente_4, especialista_2, current_date - 8, 'Retorno', 'Cansaço frequente e indisposição', 22.10, 61.30, 20.50, 1.66, 24.60, 5.00, 2.80, 54.10 from refs
) as seed(paciente_id, profissional_id, data_anamnese, tipo, queixa, imc, peso, gordura, altura, massa_muscular, gordura_visceral, massa_ossea, agua_corporal)
where not exists (
  select 1 from public.anamneses a where a.paciente_id = seed.paciente_id and a.data_anamnese = seed.data_anamnese
);

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4
)
insert into public.prontuarios (
  paciente_id,
  profissional_id,
  data_registro,
  tipo,
  status,
  conteudo
)
select *
from (
  select paciente_3, especialista_1, current_date - 14, 'Consulta', 'Aberto'::public.prontuario_status, '{"anotacoes":"Paciente em observacao, solicitar exames."}'::jsonb from refs
  union all
  select paciente_4, especialista_2, current_date - 7, 'Retorno', 'Fechado'::public.prontuario_status, '{"anotacoes":"Conduta finalizada, manter acompanhamento."}'::jsonb from refs
) as seed(paciente_id, profissional_id, data_registro, tipo, status, conteudo)
where not exists (
  select 1 from public.prontuarios p where p.paciente_id = seed.paciente_id and p.data_registro = seed.data_registro
);

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.usuarios where email = 'd@especialista2' limit 1) as especialista_2,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3,
    (select id from public.pacientes where cpf = '33333333333' limit 1) as paciente_4
)
insert into public.evolucoes (
  paciente_id,
  profissional_id,
  data_evolucao,
  tipo,
  resumo,
  retorno_recepcao,
  docs_count
)
select *
from (
  select paciente_3, especialista_1, current_date - 10, 'Reavaliação', 'Paciente apresentou melhora parcial do quadro doloroso.', 'Agendar retorno em 15 dias.', 2 from refs
  union all
  select paciente_4, especialista_2, current_date - 4, 'Acompanhamento', 'Manter acompanhamento nutricional e reavaliar sintomas.', 'Confirmar preparo para retorno.', 1 from refs
) as seed(paciente_id, profissional_id, data_evolucao, tipo, resumo, retorno_recepcao, docs_count)
where not exists (
  select 1 from public.evolucoes e where e.paciente_id = seed.paciente_id and e.data_evolucao = seed.data_evolucao
);

with refs as (
  select
    (select id from public.usuarios where email = 'd@especialista' limit 1) as especialista_1,
    (select id from public.pacientes where cpf = '22222222222' limit 1) as paciente_3
)
insert into public.documentos_clinicos (
  paciente_id,
  profissional_id,
  tipo,
  meio,
  recebido,
  anexo_url,
  atualizado_em
)
select
  paciente_3,
  especialista_1,
  seed.tipo,
  seed.meio,
  seed.recebido,
  seed.anexo_url,
  timezone('utc', now()) - seed.offset_time
from refs
cross join (
  values
    ('Exame laboratorial', 'digital'::public.documento_meio, true, 'https://example.com/exame.pdf', interval '3 days'),
    ('Receita assinada', 'fisico'::public.documento_meio, false, null::text, interval '1 day')
) as seed(tipo, meio, recebido, anexo_url, offset_time)
where not exists (
  select 1 from public.documentos_clinicos dc where dc.paciente_id = paciente_3 and dc.tipo = seed.tipo
);

-- ============================================================================
-- PORTAL DO PACIENTE
-- ============================================================================

with refs as (
  select (select id from public.pacientes where cpf = '12345678900' limit 1) as paciente_1
)
insert into public.cartoes_paciente (paciente_id, bandeira, final, titular, token_gateway)
select
  paciente_1,
  'Visa',
  '4242',
  'Maria Silva',
  'tok_demo_visa_4242'
from refs
where not exists (
  select 1 from public.cartoes_paciente c where c.paciente_id = paciente_1 and c.final = '4242'
);

with refs as (
  select (select id from public.pacientes where cpf = '12345678900' limit 1) as paciente_1
)
insert into public.pagamentos_paciente (paciente_id, descricao, valor, status, vencimento_em, pago_em)
select
  paciente_1,
  seed.descricao,
  seed.valor,
  seed.status,
  seed.vencimento_em,
  seed.pago_em
from refs
cross join (
  values
    ('Consulta Clínica Geral', 180.00, 'Pendente'::public.pagamento_status, current_date + 3, null::timestamptz),
    ('Bioressonância Quântica', 250.00, 'Pago'::public.pagamento_status, current_date - 12, timezone('utc', now()) - interval '10 day'),
    ('Hemograma', 95.00, 'Vencido'::public.pagamento_status, current_date - 5, null::timestamptz)
) as seed(descricao, valor, status, vencimento_em, pago_em)
where not exists (
  select 1 from public.pagamentos_paciente pg
  where pg.paciente_id = paciente_1
    and pg.descricao = seed.descricao
    and pg.vencimento_em = seed.vencimento_em
);

-- ============================================================================
-- AUDITORIA / NOTIFICACOES
-- ============================================================================

with refs as (
  select
    (select id from public.unidades where nome = 'Unidade Principal' limit 1) as principal_id,
    (select id from public.usuarios where email = 'd@admin' limit 1) as admin_id,
    (select id from public.usuarios where email = 'd@gestor' limit 1) as gestor_id,
    (select id from public.usuarios where email = 'd@recepcao' limit 1) as recepcao_id
)
insert into public.audit_log (actor_user_id, unidade_id, acao, recurso, descricao, ip, detalhes)
select *
from (
  select admin_id, principal_id, 'create', 'usuarios', 'Cadastro de usuário realizado', '127.0.0.1'::inet, '{"origem":"seed"}'::jsonb from refs
  union all
  select gestor_id, principal_id, 'update', 'configuracoes', 'Alteração em configuração do portal', '127.0.0.1'::inet, '{"origem":"seed"}'::jsonb from refs
  union all
  select recepcao_id, principal_id, 'read', 'financeiro', 'Consulta ao módulo financeiro', '127.0.0.1'::inet, '{"origem":"seed"}'::jsonb from refs
) as seed(actor_user_id, unidade_id, acao, recurso, descricao, ip, detalhes)
where not exists (
  select 1 from public.audit_log al
  where al.acao = seed.acao
    and al.recurso = seed.recurso
    and coalesce(al.descricao, '') = coalesce(seed.descricao, '')
);

insert into public.notificacoes (
  usuario_id,
  titulo,
  descricao,
  href,
  kind,
  lida,
  ocorrido_em,
  source_key,
  source_table,
  source_id
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
    ('Próxima consulta', 'Há atendimento confirmado na agenda de hoje.', '/agenda', 'agenda'::public.notificacao_kind, false, interval '1 hour', 'agenda_hoje', 'agendamentos'),
    ('Pagamento pendente', 'Existe cobrança pendente aguardando baixa.', '/financeiro', 'financeiro'::public.notificacao_kind, false, interval '3 hour', 'financeiro_pendente', 'financeiro_lancamentos'),
    ('Nova prescrição disponível', 'Uma nova prescrição foi registrada para acompanhamento.', '/prescricoes', 'prescricao'::public.notificacao_kind, true, interval '1 day', 'prescricao_nova', 'prescricoes')
) as seed(titulo, descricao, href, kind, lida, offset_time, source_key, source_table)
where u.email in ('d@admin', 'd@gestor', 'd@recepcao', 'd@especialista', 'd@paciente')
  and not exists (
    select 1 from public.notificacoes n
    where n.usuario_id = u.id
      and n.source_key = seed.source_key || '_' || u.email
  );

commit;
