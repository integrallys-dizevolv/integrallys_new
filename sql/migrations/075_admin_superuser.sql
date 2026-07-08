-- 075_admin_superuser.sql
-- master e admin = superusuário: acesso total, ignora a enumeração de grants.
--
-- CONTEXTO
-- A UI e o backend autorizam via RPC `can_user` / `get_user_permissions`. Essas
-- funções foram definidas em sql/auth_permissions.sql e REDEFINIDAS depois em
-- sql/migrations/008_permissoes_por_unidade.sql, que adicionou o filtro de
-- permissões por unidade. O papel `admin` tinha permissões parciais (ex.: agenda
-- só 'read', financeiro sem 'delete'), causando HTTP 403 em criar agendamento e
-- excluir lançamento. Requisito: admin (e master) podem fazer tudo.
--
-- ABORDAGEM
-- Curto-circuita os papéis superusuário ('master','admin') em vez de enumerar
-- grants recurso a recurso (que drifta e volta a dar 403).
--
-- IMPORTANTE (correção sobre o spec original): este arquivo PRESERVA o filtro
-- por unidade da migration 008 para os usuários NÃO superusuário — a cláusula
-- `pp.unidade_id is null or pp.unidade_id = bu.unidade_id` em role_allows. O spec
-- enviado baseava-se na versão de auth_permissions.sql (sem unidade) e teria
-- regredido a 008, fazendo o usuário não-super receber permissões de TODAS as
-- unidades. A base correta aqui é a 008 + o curto-circuito de superusuário.
--
-- NOTAS
--   - Assinaturas inalteradas → `create or replace` basta (sem `drop function`).
--   - Os GRANT/REVOKE da migration 067 (EXECUTE só para service_role) são
--     preservados pelo `create or replace`.
--   - `usuarios.perfil` é o enum public.user_role; comparar com os literais
--     'master'/'admin' coage para o enum (labels válidos).
--   - Superusuário recebe array['read','create','update','delete'] por recurso na
--     UI. Ações custom (ex.: 'configuracoes'/'write' usado por /api/procedimentos)
--     NÃO aparecem nesse array, mas o backend (can_user) libera mesmo assim porque
--     o curto-circuito retorna true para qualquer ação. Nenhum gate de UI usa
--     'write' hoje, então não há botão escondido.

begin;

-- ---------------------------------------------------------------------------
-- can_user: superusuário curto-circuita para true; demais delegam à resolução.
-- ---------------------------------------------------------------------------
create or replace function public.can_user(
  p_usuario_id uuid,
  p_resource text,
  p_action text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    case
      when exists (
        select 1 from public.usuarios u
        where u.id = p_usuario_id
          and u.status = 'Ativo'
          and u.perfil in ('master','admin')
      ) then true
      else exists (
        select 1
        from public.get_user_permissions(p_usuario_id) gp
        where gp.resource = p_resource
          and p_action = any(gp.actions)
      )
    end;
$$;

-- ---------------------------------------------------------------------------
-- get_user_permissions: superusuário recebe CRUD em todos os recursos;
-- demais seguem a resolução normal de perfil+overrides COM filtro por unidade
-- (preservado da migration 008).
-- ---------------------------------------------------------------------------
create or replace function public.get_user_permissions(p_usuario_id uuid)
returns table (resource text, actions text[])
language sql
security definer
set search_path = public
as $$
  with base_user as (
    select id, perfil, unidade_id
    from public.usuarios
    where id = p_usuario_id
      and status = 'Ativo'
  ),
  flags as (
    select coalesce(bool_or(perfil in ('master','admin')), false) as is_super
    from base_user
  ),
  super_perms as (
    select r.codigo as resource,
           array['read','create','update','delete']::text[] as actions
    from public.recursos r
    where (select is_super from flags)
  ),
  role_allows as (
    select r.codigo as resource, pp.acao,
           'allow'::public.permission_effect as efeito
    from base_user bu
    join public.perfil_permissoes pp
      on pp.perfil = bu.perfil
     and (pp.unidade_id is null or pp.unidade_id = bu.unidade_id)
    join public.recursos r on r.id = pp.recurso_id
    where not (select is_super from flags)
  ),
  user_overrides as (
    select r.codigo as resource, up.acao, up.efeito
    from public.usuario_permissoes up
    join public.recursos r on r.id = up.recurso_id
    where up.usuario_id = p_usuario_id
      and not (select is_super from flags)
  ),
  combined as (
    select * from role_allows
    union all
    select * from user_overrides
  ),
  resolved as (
    select resource, acao,
      case
        when bool_or(efeito = 'deny') then false
        when bool_or(efeito = 'allow') then true
        else false
      end as permitido
    from combined
    group by resource, acao
  ),
  normal_perms as (
    select resource, array_agg(acao order by acao) as actions
    from resolved
    where permitido = true
    group by resource
  )
  select resource, actions from super_perms
  union all
  select resource, actions from normal_perms
  order by resource;
$$;

commit;
