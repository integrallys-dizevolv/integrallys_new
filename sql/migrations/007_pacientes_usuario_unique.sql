-- 007_pacientes_usuario_unique.sql
-- Garante que um usuario tenha no maximo um paciente vinculado.

begin;

with duplicados as (
  select
    id,
    row_number() over (
      partition by usuario_id
      order by created_at asc, id asc
    ) as rn
  from public.pacientes
  where usuario_id is not null
)
update public.pacientes p
set
  usuario_id = null,
  updated_at = timezone('utc', now())
from duplicados d
where p.id = d.id
  and d.rn > 1;

create unique index if not exists pacientes_usuario_unique_idx
  on public.pacientes (usuario_id)
  where usuario_id is not null;

commit;
