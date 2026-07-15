-- 085_profissional_unidades.sql
-- Item 7a — Profissional atua em múltiplas filiais.
--
-- Modelo aprovado: `usuarios.unidade_id` continua sendo a unidade PRINCIPAL / de
-- login (leitura atual de agenda/gerar e repasse permanece intacta). Esta tabela
-- guarda apenas as filiais ADICIONAIS onde o profissional também atende.
--
-- Espelha o padrão N:N de `profissional_procedimentos` (079): PK composta,
-- ON DELETE CASCADE nos dois lados, RLS enable (deny-by-default; o service_role
-- do app ignora RLS por design, alinhado à 060).
--
-- Idempotente: create table / index if not exists.

create table if not exists public.profissional_unidades (
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profissional_id, unidade_id)
);

create index if not exists idx_profissional_unidades_unidade
  on public.profissional_unidades (unidade_id);

alter table public.profissional_unidades enable row level security;
