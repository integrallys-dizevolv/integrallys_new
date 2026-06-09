-- 064_campanhas_whatsapp.sql
-- CR-WPP-03 (item 6.3): campanhas WhatsApp agendadas para datas
-- comemorativas (Natal, Páscoa, Dia das Mães etc.) + manuais.
-- Inclui tabela mínima `crm_paciente_estagios` para suportar o filtro
-- `filtro_estagio` (não existia no schema — criada nesta migration por
-- decisão explícita; sem UI de CRM ainda — substrato para o filtro).
--
-- Idempotente. Número 064 conforme spec (063 fica como gap — convenção
-- já adotada em migrations anteriores: 059, 061 também ausentes).

-- ====================================================================
-- 1. CRM · estágios de paciente (substrato mínimo do filtro)
-- ====================================================================
-- ⚠️ ATENÇÃO · COLISÃO COM 063 (RESOLVIDA EM 065) ⚠️
-- Este bloco criou public.crm_paciente_estagios com schema mínimo
-- (3 colunas) por desconhecer a 063_crm_estagios.sql, que já cria a
-- mesma tabela com schema rico (9 colunas).
-- DECISÃO DO ORQUESTRADOR: 063 é canônica. O `create table if not
-- exists` abaixo vira no-op em ambientes onde 063 rodou primeiro
-- (caso esperado). Em ambientes onde esta migration rodou antes da
-- 063, a 065_fix_064_crm_collision.sql adiciona as colunas que
-- ficaram ausentes (observacoes, proxima_acao, data_proxima_acao,
-- responsavel_id) via `add column if not exists`.
-- NÃO REMOVA AS LINHAS ABAIXO — preservadas por idempotência (já
-- foram aplicadas em alguns ambientes; remover quebraria re-execução).
-- NÃO USE ESTA DEFINIÇÃO COMO REFERÊNCIA DE SCHEMA — use a 063.
create table if not exists public.crm_paciente_estagios (
  paciente_id uuid primary key references public.pacientes(id) on delete cascade,
  estagio text not null,
  atualizado_em timestamptz not null default timezone('utc', now())
);

create index if not exists crm_paciente_estagios_estagio_idx
  on public.crm_paciente_estagios(estagio);

alter table public.crm_paciente_estagios enable row level security;
drop policy if exists "crm_paciente_estagios_all" on public.crm_paciente_estagios;
create policy "crm_paciente_estagios_all"
  on public.crm_paciente_estagios for all using (true) with check (true);

-- ====================================================================
-- 2. Campanhas WhatsApp agendadas
-- ====================================================================
create table if not exists public.whatsapp_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  tipo text not null default 'manual',
  -- tipo: manual | natal | pascoa | dia_maes | dia_pais | dia_crianca | personalizado
  mensagem_template text not null,
  data_disparo date not null,
  hora_disparo time not null default '09:00',
  status text not null default 'agendada',
  -- status: agendada | processando | concluida | cancelada
  total_enviados int not null default 0,
  total_erros int not null default 0,
  filtro_estagio text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists whatsapp_campanhas_status_data_idx
  on public.whatsapp_campanhas(status, data_disparo);

-- Trigger de updated_at (reaproveita função já existente set_updated_at)
drop trigger if exists whatsapp_campanhas_set_updated_at on public.whatsapp_campanhas;
create trigger whatsapp_campanhas_set_updated_at
  before update on public.whatsapp_campanhas
  for each row execute function public.set_updated_at();

alter table public.whatsapp_campanhas enable row level security;
drop policy if exists "whatsapp_campanhas_all" on public.whatsapp_campanhas;
create policy "whatsapp_campanhas_all"
  on public.whatsapp_campanhas for all using (true) with check (true);

-- ====================================================================
-- 3. Seed · campanhas comemorativas
-- ====================================================================
-- Desvio do snippet original do spec: `ON CONFLICT DO NOTHING` sem
-- conflict_target é erro de sintaxe no Postgres. Usamos UNIQUE(nome)
-- + ON CONFLICT (nome) DO NOTHING para tornar o seed verdadeiramente
-- idempotente.
insert into public.whatsapp_campanhas (nome, tipo, mensagem_template, data_disparo, status)
values
  ('Natal 2025', 'natal',
   'Feliz Natal, {paciente}! 🎄 A equipe Natur & Vida deseja a você e sua família muita saúde e paz.',
   '2025-12-24', 'agendada'),
  ('Ano Novo 2026', 'personalizado',
   'Feliz 2026, {paciente}! 🥂 Que o novo ano traga muita saúde e bem-estar para você!',
   '2025-12-31', 'agendada'),
  ('Dia das Mães 2026', 'dia_maes',
   'Feliz Dia das Mães, {paciente}! 💐 A Natur & Vida celebra com você esse dia tão especial.',
   '2026-05-10', 'agendada')
on conflict (nome) do nothing;
