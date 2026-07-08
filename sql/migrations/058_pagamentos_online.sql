-- 058_pagamentos_online.sql
-- TAREFA-FIN-01: cobranças online via Cielo (cartão) e Sicredi (Pix).
-- gateway: 'cielo' | 'sicredi' · tipo: 'cartao_credito' | 'cartao_debito' | 'pix'
-- status: 'pendente' | 'autorizado' | 'capturado' | 'cancelado' | 'erro'
--
-- Idempotente.

create table if not exists public.pagamentos_online (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid null references public.agendamentos(id) on delete set null,
  lancamento_id uuid null references public.financeiro_lancamentos(id) on delete set null,
  gateway text not null,
  gateway_id text null,
  tipo text not null,
  valor numeric(12,2) not null,
  status text not null default 'pendente',
  qr_code text null,
  qr_code_copia_cola text null,
  link_pagamento text null,
  payload_gateway jsonb null,
  webhook_payload jsonb null,
  pago_em timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pagamentos_online_agendamento_idx on public.pagamentos_online(agendamento_id);
create index if not exists pagamentos_online_gateway_id_idx on public.pagamentos_online(gateway, gateway_id);
create index if not exists pagamentos_online_status_idx on public.pagamentos_online(status);

alter table public.pagamentos_online enable row level security;
drop policy if exists "pagamentos_online_all" on public.pagamentos_online;
create policy "pagamentos_online_all" on public.pagamentos_online for all using (true) with check (true);
