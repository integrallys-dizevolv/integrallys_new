-- ============================================================================
-- Migration 082 · Recurso de FEATURE 'gestao-bancaria'
-- ============================================================================
-- A tela "Gestão Bancária" (/gestao-bancaria) expõe as contas bancárias COMPLETAS
-- da clínica — nome, banco, agência, conta e saldo. Até aqui as rotas
-- /api/gestao-bancaria e /api/gestao-bancaria/ofx reaproveitavam o recurso
-- genérico 'financeiro' (necessário à recepção para Caixa/resumo financeiro), o
-- que concedia sem querer à recepção acesso a esse dado bem mais sensível.
--
-- Esta migration promove a tela a recurso por-feature próprio (análogo a
-- 'profissionais' na 079 e 'fornecedores' na 081) e NÃO cria nenhuma tabela —
-- as contas continuam em public.contas_bancarias (080) e os movimentos em
-- public.conciliacao_ofx.
--
-- O sidebar (itemToResource → href '/gestao-bancaria' = 'gestao-bancaria') e as
-- rotas (requirePermission('gestao-bancaria', ...)) passam a gatear por este
-- recurso, independente de 'financeiro'.
--
-- GRANTS (espelham 'profissionais' da 079 e 'fornecedores' da 081):
--   master, admin  → read, create, update, delete
--   gestor         → read, create, update            (sem delete)
--   recepcao, especialista, paciente → (nenhum)
-- Para master/admin os grants são redundantes (curto-circuito da 075) — ficam
-- como fallback consistente. Para gestor os grants SÃO a fonte da permissão.
--
-- IDEMPOTENTE: NOT EXISTS no recurso e nos grants (unique parcial de
-- perfil_permissoes é unidade_id IS NULL desde a 008).
-- ============================================================================

begin;

insert into public.recursos (codigo, descricao)
select 'gestao-bancaria', 'Gestão bancária (contas bancárias: banco, agência, conta e saldo)'
where not exists (select 1 from public.recursos where codigo = 'gestao-bancaria');

insert into public.perfil_permissoes (perfil, recurso_id, acao)
select g.perfil::public.user_role, r.id, g.acao
from public.recursos r
cross join (values
  ('master', 'read'), ('master', 'create'), ('master', 'update'), ('master', 'delete'),
  ('admin', 'read'),  ('admin', 'create'),  ('admin', 'update'),  ('admin', 'delete'),
  ('gestor', 'read'), ('gestor', 'create'), ('gestor', 'update')
) as g(perfil, acao)
where r.codigo = 'gestao-bancaria'
  and not exists (
    select 1 from public.perfil_permissoes pp
    where pp.perfil = g.perfil::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = g.acao
      and pp.unidade_id is null
  );

commit;

-- VERIFICAÇÃO:
-- select pp.perfil, pp.acao from public.perfil_permissoes pp
-- join public.recursos r on r.id = pp.recurso_id
-- where r.codigo = 'gestao-bancaria' order by pp.perfil, pp.acao;
