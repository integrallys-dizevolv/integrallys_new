-- 049_permissoes_fix.sql
-- Corrige lacunas no seed de 004_permission_defaults.sql identificadas após
-- entrega da CR-REV-J (Dashboard Admin) e do uso real do sistema.
--
-- Problemas tratados:
--   1) Admin (proprietário da clínica) sem `read` em recursos clínicos/operacionais
--      — bloqueava acesso a pacientes, prescrições, lista de espera, estoque,
--      anamnese, prontuários, evoluções, documentação, tarefas. Sem leitura
--      ampla, o dashboard executivo do admin retorna 403 ao clicar nos atalhos.
--   2) Gestor sem permissão em `caixa` e `tarefas` — mas é o responsável operacional.
--   3) Especialista sem `repasse.read` — não conseguia ver os próprios repasses.
--   4) Recepção sem `prescricoes.update` — só podia criar, não editar/cancelar.
--   5) DELETE em recursos clínicos (anamnese, prontuários, evoluções,
--      documentacao/templates) — rotas exigiam *.delete mas NENHUM perfil tinha
--      essa permissão (nem o master). Modais "Excluir" da UI tomavam 403 silencioso.
--   6) `pacientes.delete` só existia para master — UI de gestor e recepção tem
--      `excluir-paciente-modal` mas a ação dava 403.
--   7) Paciente não enxergava "Prescrição/Vendas" e "Documentos" no sidebar:
--      o sidebar-builder mapeava esses itens para `prescricoes` e `portal.historico`,
--      mas o paciente só tem permissões `portal.*`. Criamos recursos próprios
--      `portal.prescricoes` e `portal.documentos` e concedemos ao paciente.
--
-- Idempotente — usa LEFT JOIN/NOT EXISTS em vez de ON CONFLICT, para
-- funcionar mesmo em instâncias onde o unique constraint nominal não existe
-- (ex.: tabela criada antes da declaração `unique` na coluna).

-- 7) Cadastrar recursos novos do portal
insert into public.recursos (codigo, descricao)
select v.codigo, v.descricao
from (values
  ('portal.prescricoes', 'Prescrições do paciente (portal)'),
  ('portal.documentos',  'Documentos do paciente (portal)')
) as v(codigo, descricao)
where not exists (
  select 1 from public.recursos r where r.codigo = v.codigo
);

-- Demais permissões: insert apenas onde a tripla (perfil, recurso, acao) ainda não existir
with novas_permissoes (perfil, recurso, acoes) as (
  values
    -- 1) Admin: read em todo o domínio clínico e operacional (visão executiva)
    ('admin'::public.user_role, 'pacientes',     array['read']),
    ('admin'::public.user_role, 'anamnese',      array['read']),
    ('admin'::public.user_role, 'prontuarios',   array['read']),
    ('admin'::public.user_role, 'evolucoes',     array['read']),
    ('admin'::public.user_role, 'documentacao',  array['read']),
    ('admin'::public.user_role, 'prescricoes',   array['read']),
    ('admin'::public.user_role, 'estoque',       array['read']),
    ('admin'::public.user_role, 'lista-espera',  array['read']),
    ('admin'::public.user_role, 'tarefas',       array['read']),

    -- 2) Gestor: ganha caixa CRU (alinhado a financeiro/repasse) e tarefas CRUD
    ('gestor'::public.user_role, 'caixa',   array['read','create','update']),
    ('gestor'::public.user_role, 'tarefas', array['read','create','update','delete']),

    -- 3) Especialista: lê os próprios repasses
    ('especialista'::public.user_role, 'repasse', array['read']),

    -- 4) Recepção: editar prescrição que criou + apagar tarefa que criou
    ('recepcao'::public.user_role, 'prescricoes', array['update']),
    ('recepcao'::public.user_role, 'tarefas',     array['delete']),

    -- 5) DELETEs clínicos — backend filtra por profissional_id no especialista,
    --    então cada um só consegue excluir o que é seu
    ('master'::public.user_role,       'anamnese',     array['delete']),
    ('master'::public.user_role,       'prontuarios',  array['delete']),
    ('master'::public.user_role,       'evolucoes',    array['delete']),
    ('master'::public.user_role,       'documentacao', array['delete']),
    ('especialista'::public.user_role, 'anamnese',     array['delete']),
    ('especialista'::public.user_role, 'prontuarios',  array['delete']),
    ('especialista'::public.user_role, 'evolucoes',    array['delete']),

    -- 6) Excluir templates de documentos: admin e gestor administram a clínica
    ('admin'::public.user_role,  'documentacao', array['delete']),
    ('gestor'::public.user_role, 'documentacao', array['delete']),

    -- 7) Excluir paciente: gestor e recepção operam o cadastro
    ('gestor'::public.user_role,   'pacientes', array['delete']),
    ('recepcao'::public.user_role, 'pacientes', array['delete']),

    -- 8) Portal do paciente — recursos novos
    ('paciente'::public.user_role, 'portal.prescricoes', array['read']),
    ('paciente'::public.user_role, 'portal.documentos',  array['read'])
),
expandido as (
  select np.perfil, r.id as recurso_id, acao
  from novas_permissoes np
  join public.recursos r on r.codigo = np.recurso
  cross join unnest(np.acoes) as acao
)
insert into public.perfil_permissoes (perfil, recurso_id, acao)
select e.perfil, e.recurso_id, e.acao
from expandido e
where not exists (
  select 1
  from public.perfil_permissoes pp
  where pp.perfil = e.perfil
    and pp.recurso_id = e.recurso_id
    and pp.acao = e.acao
);
