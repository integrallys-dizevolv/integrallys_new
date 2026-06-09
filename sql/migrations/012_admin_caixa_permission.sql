-- 012_admin_caixa_permission.sql
-- Garante que admin tenha acesso padrão ao recurso de caixa

insert into public.perfil_permissoes (perfil, recurso_id, acao, unidade_id)
select
  'admin'::public.user_role,
  r.id,
  perm.acao,
  null
from public.recursos r
cross join unnest(array['read','create','update']) as perm(acao)
where r.codigo = 'caixa'
  and not exists (
    select 1
    from public.perfil_permissoes pp
    where pp.perfil = 'admin'::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = perm.acao
      and pp.unidade_id is null
  );
