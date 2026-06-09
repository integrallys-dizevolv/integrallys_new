-- 013_agendamentos_expansion.sql
-- Expande agendamentos com tipo, modalidade, dados de consulta online e valor.
-- Cria agendamentos_pagamentos para histórico financeiro por agendamento.
-- Idempotente: pode rodar múltiplas vezes sem erro.

-- 1) Enum para modalidade de atendimento
do $$
begin
  if not exists (select 1 from pg_type where typname = 'modalidade_atendimento') then
    create type public.modalidade_atendimento as enum ('Presencial','Online','Hibrido');
  end if;
  if not exists (select 1 from pg_type where typname = 'pagamento_status') then
    create type public.pagamento_status as enum ('Pendente','Pago','Parcial','Estornado','Cancelado');
  end if;
end $$;

-- 2) Colunas novas em public.agendamentos
alter table public.agendamentos
  add column if not exists tipo text null;

alter table public.agendamentos
  add column if not exists modalidade_atendimento public.modalidade_atendimento not null default 'Presencial';

alter table public.agendamentos
  add column if not exists plataforma_online text null;

alter table public.agendamentos
  add column if not exists url_online text null;

alter table public.agendamentos
  add column if not exists valor_procedimento numeric(10,2) null;

-- 3) Tabela agendamentos_pagamentos (histórico por agendamento)
create table if not exists public.agendamentos_pagamentos (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  valor numeric(10,2) not null,
  metodo text null,
  status public.pagamento_status not null default 'Pendente',
  pago_em timestamptz null,
  observacoes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists agendamentos_pagamentos_agendamento_idx
  on public.agendamentos_pagamentos (agendamento_id);

create index if not exists agendamentos_pagamentos_status_idx
  on public.agendamentos_pagamentos (status);

-- 4) Trigger de updated_at (reusa função pública já criada em 001_auth_core.sql)
drop trigger if exists agendamentos_pagamentos_set_updated_at on public.agendamentos_pagamentos;
create trigger agendamentos_pagamentos_set_updated_at
  before update on public.agendamentos_pagamentos
  for each row execute function public.set_updated_at();

-- 5) View auxiliar: resumo de pagamento por agendamento
--    (facilita o cálculo de "Pago" / "Pendente" / "Parcial" sem agregar no app).
create or replace view public.v_agendamento_pagamento_resumo as
select
  a.id as agendamento_id,
  coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0)::numeric(10,2) as total_pago,
  coalesce(a.valor_procedimento, 0)::numeric(10,2) as valor_devido,
  case
    when coalesce(a.valor_procedimento, 0) = 0 then 'Sem valor'
    when coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0) >= a.valor_procedimento
      then 'Pago'
    when coalesce(sum(case when p.status = 'Pago' then p.valor else 0 end), 0) > 0
      then 'Parcial'
    else 'Pendente'
  end as situacao
from public.agendamentos a
left join public.agendamentos_pagamentos p on p.agendamento_id = a.id
group by a.id, a.valor_procedimento;

-- 6) Permissões padrão: quem pode ler/escrever agendamentos também mexe em pagamentos
--    (alinha com o padrão de perfil_permissoes existente).
insert into public.perfil_permissoes (perfil, recurso_id, acao, unidade_id)
select
  pp.perfil,
  r.id,
  pp.acao,
  pp.unidade_id
from public.recursos r
cross join (
  select distinct pp.perfil, pp.acao, pp.unidade_id
  from public.perfil_permissoes pp
  join public.recursos r2 on r2.id = pp.recurso_id
  where r2.codigo = 'agenda'
) pp
where r.codigo = 'agenda_pagamentos'
  and not exists (
    select 1
    from public.perfil_permissoes existing
    where existing.perfil = pp.perfil
      and existing.recurso_id = r.id
      and existing.acao = pp.acao
      and (existing.unidade_id is not distinct from pp.unidade_id)
  );

-- Garante que o recurso existe (sem truncar se já estiver)
insert into public.recursos (codigo, descricao)
values ('agenda_pagamentos', 'Pagamentos de agendamentos')
on conflict (codigo) do nothing;
