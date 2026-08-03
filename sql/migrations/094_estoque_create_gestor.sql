-- 094_estoque_create_gestor.sql
-- Item 14 — concede `estoque:create` ao GESTOR. Hoje só o master cria produto
-- (defaults em 004; o 049 deu ao gestor apenas read/update em estoque). O gestor é
-- o responsável operacional da unidade e agora tem a tela "Novo produto".
--
-- Idempotente: insere só se a tripla (perfil, recurso, acao) ainda não existir,
-- mesmo padrão de 049_permissoes_fix.sql (NOT EXISTS em vez de ON CONFLICT).

with nova_permissao (perfil, recurso, acao) as (
  values ('gestor'::public.user_role, 'estoque', 'create')
),
expandido as (
  select np.perfil, r.id as recurso_id, np.acao
  from nova_permissao np
  join public.recursos r on r.codigo = np.recurso
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
