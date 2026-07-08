-- ============================================================================
-- Migration 076 · Recurso próprio para Procedimentos (cadastro)
-- ============================================================================
-- Desacopla o cadastro de Procedimentos do recurso `configuracoes`/`write`
-- (ação inexistente). Concede:
--   master, admin          → read, create, update, delete
--   gestor                 → read, create, update     (gerente operacional, sem delete)
--   recepcao, especialista → read                     (consomem o catálogo)
--   paciente               → (nenhum)
--
-- RELAÇÃO COM A 075: para master/admin o acesso efetivo vem do curto-circuito da
-- migration 075 (superusuário itera public.recursos), então os grants explícitos
-- de master/admin abaixo são redundantes — ficam como fallback consistente com a
-- 073 e corretos caso a 075 seja revertida. Para gestor/recepcao/especialista
-- estes grants SÃO a fonte da permissão.
--
-- IDEMPOTENTE: NOT EXISTS no recurso e nos grants (unique inclui unidade_id desde a 008).
-- ============================================================================

insert into public.recursos (codigo, descricao)
select 'procedimentos', 'Cadastro de procedimentos (catálogo de serviços)'
where not exists (select 1 from public.recursos where codigo = 'procedimentos');

insert into public.perfil_permissoes (perfil, recurso_id, acao)
select g.perfil::public.user_role, r.id, g.acao
from public.recursos r
cross join (values
  ('master','read'), ('master','create'), ('master','update'), ('master','delete'),
  ('admin','read'),  ('admin','create'),  ('admin','update'),  ('admin','delete'),
  ('gestor','read'), ('gestor','create'), ('gestor','update'),
  ('recepcao','read'),
  ('especialista','read')
) as g(perfil, acao)
where r.codigo = 'procedimentos'
  and not exists (
    select 1 from public.perfil_permissoes pp
    where pp.perfil = g.perfil::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = g.acao
      and pp.unidade_id is null
  );

-- VERIFICAÇÃO:
-- select pp.perfil, pp.acao from public.perfil_permissoes pp
-- join public.recursos r on r.id = pp.recurso_id
-- where r.codigo = 'procedimentos' order by pp.perfil, pp.acao;
