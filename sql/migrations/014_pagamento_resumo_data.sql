-- 014_pagamento_resumo_data.sql
-- Adiciona data_ultimo_pagamento à view v_agendamento_pagamento_resumo.
-- Idempotente: CREATE OR REPLACE.

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
  end as situacao,
  max(case when p.status = 'Pago' then p.pago_em else null end)::date as data_ultimo_pagamento
from public.agendamentos a
left join public.agendamentos_pagamentos p on p.agendamento_id = a.id
group by a.id, a.valor_procedimento;
