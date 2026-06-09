-- 063_crm_estagios.sql
-- Agente 05 · Problemas 5.2 / 5.4
-- Funil CRM por paciente: estágio atual + observações + próxima ação.
-- Uma linha por paciente (UNIQUE), atualizada via upsert por paciente_id.
--
-- Idempotente: create table/index com `if (not) exists`.

create table if not exists public.crm_paciente_estagios (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  estagio text not null default 'lead',
  -- valores aceitos:
  --   lead | ativo | em_tratamento | retorno_pendente | inativo | vip
  -- (validação no /api/pacientes — não usa enum aqui pra permitir customização
  -- futura sem precisar de migration de enum.)
  observacoes text null,
  proxima_acao text null,
  data_proxima_acao date null,
  responsavel_id uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- um estágio ativo por paciente (target do onConflict no upsert)
  unique (paciente_id)
);

create index if not exists idx_crm_estagios_paciente on public.crm_paciente_estagios(paciente_id);
create index if not exists idx_crm_estagios_estagio on public.crm_paciente_estagios(estagio);

-- DIAGNÓSTICO (distribuição do funil):
-- select estagio, count(*) from public.crm_paciente_estagios group by estagio order by 2 desc;
