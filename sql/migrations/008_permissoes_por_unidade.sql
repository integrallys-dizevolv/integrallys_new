begin;

alter table public.perfil_permissoes
  add column if not exists unidade_id uuid null references public.unidades(id) on delete cascade;

alter table public.perfil_permissoes
  drop constraint if exists perfil_permissoes_unique;

create unique index if not exists perfil_permissoes_global_unique_idx
  on public.perfil_permissoes (perfil, recurso_id, acao)
  where unidade_id is null;

create unique index if not exists perfil_permissoes_unidade_unique_idx
  on public.perfil_permissoes (perfil, unidade_id, recurso_id, acao)
  where unidade_id is not null;

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
  role_allows as (
    select r.codigo as resource, pp.acao, 'allow'::public.permission_effect as efeito
    from base_user bu
    join public.perfil_permissoes pp
      on pp.perfil = bu.perfil
     and (pp.unidade_id is null or pp.unidade_id = bu.unidade_id)
    join public.recursos r on r.id = pp.recurso_id
  ),
  user_overrides as (
    select r.codigo as resource, up.acao, up.efeito
    from public.usuario_permissoes up
    join public.recursos r on r.id = up.recurso_id
    where up.usuario_id = p_usuario_id
  ),
  combined as (
    select * from role_allows
    union all
    select * from user_overrides
  ),
  resolved as (
    select
      resource,
      acao,
      case
        when bool_or(efeito = 'deny') then false
        when bool_or(efeito = 'allow') then true
        else false
      end as permitido
    from combined
    group by resource, acao
  )
  select resource, array_agg(acao order by acao) as actions
  from resolved
  where permitido = true
  group by resource
  order by resource;
$$;

commit;
