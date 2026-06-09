-- 018_especialista_agenda_update.sql
-- Concede ao perfil especialista as permissões necessárias para transicionar
-- o status do agendamento no fluxo oficial definido em TAREFA-002:
-- Confirmado → Check-in → Em Atendimento → Check-out → Em Atraso → Cancelado.
--
-- Sem 'agenda.update' o especialista não consegue iniciar nem finalizar
-- atendimento pela UI (PUT /api/agenda retorna 403 via requirePermission).
--
-- Também concede 'usuarios.read' para eliminar 403 cosmético do
-- useUsuarios() que roda no agenda-view como fallback de lista de profissionais.

insert into public.perfil_permissoes (perfil, recurso_id, acao, unidade_id)
select
  'especialista'::public.user_role,
  r.id,
  perm.acao,
  null
from public.recursos r
cross join (
  values
    ('agenda', 'update'),
    ('usuarios', 'read')
) as perm(recurso, acao)
where r.codigo = perm.recurso
  and not exists (
    select 1
    from public.perfil_permissoes pp
    where pp.perfil = 'especialista'::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = perm.acao
      and pp.unidade_id is null
  );
