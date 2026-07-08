-- 023_recepcao_usuarios_read.sql
-- Concede ao perfil recepcao a permissão 'usuarios.read'.
--
-- Motivação: o fluxo de Nova Prescrição/Venda (`nova-venda-modal` da
-- recepção) precisa listar usuários para popular o select de "Vendedor"
-- (TAREFA-019 — vendedor responsável pela venda). Hoje a recepcionista
-- tem apenas as permissões {dashboard, agenda, pacientes, prescricoes,
-- estoque, lista-espera, caixa, financeiro, relatorios, configuracoes}.
-- Sem 'usuarios.read', `GET /api/usuarios` retorna 403 e o select aparece
-- vazio.
--
-- O perfil especialista já recebeu 'usuarios.read' na migration 018
-- pelo mesmo motivo (lista de profissionais na agenda). Esta migration
-- aplica o mesmo padrão para recepcao.

insert into public.perfil_permissoes (perfil, recurso_id, acao, unidade_id)
select
  'recepcao'::public.user_role,
  r.id,
  'read',
  null
from public.recursos r
where r.codigo = 'usuarios'
  and not exists (
    select 1
    from public.perfil_permissoes pp
    where pp.perfil = 'recepcao'::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = 'read'
      and pp.unidade_id is null
  );
