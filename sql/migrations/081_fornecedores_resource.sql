-- ============================================================================
-- Migration 081 · Recurso de FEATURE 'fornecedores'
-- ============================================================================
-- Fornecedor = pacientes com vinculo_tipo='fornecedor' + fornecedor_dados (JSONB,
-- migration 020). NÃO existe tabela própria e esta migration NÃO cria nenhuma —
-- só expõe a tela de Fornecedores como recurso por-feature (análogo a
-- 'profissionais' na 079 e 'procedimentos' na 076).
--
-- O sidebar (itemToResource → href '/fornecedores' = 'fornecedores') e a rota
-- /api/fornecedores (requirePermission('fornecedores', ...)) passam a gatear por
-- este recurso. A rota grava em pacientes apenas vinculo_tipo='fornecedor'
-- (mais restrita que /api/pacientes).
--
-- GRANTS (espelham 'profissionais' da 079):
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
select 'fornecedores', 'Cadastro de fornecedores (pacientes com vinculo_tipo=fornecedor)'
where not exists (select 1 from public.recursos where codigo = 'fornecedores');

insert into public.perfil_permissoes (perfil, recurso_id, acao)
select g.perfil::public.user_role, r.id, g.acao
from public.recursos r
cross join (values
  ('master', 'read'), ('master', 'create'), ('master', 'update'), ('master', 'delete'),
  ('admin', 'read'),  ('admin', 'create'),  ('admin', 'update'),  ('admin', 'delete'),
  ('gestor', 'read'), ('gestor', 'create'), ('gestor', 'update')
) as g(perfil, acao)
where r.codigo = 'fornecedores'
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
-- where r.codigo = 'fornecedores' order by pp.perfil, pp.acao;
