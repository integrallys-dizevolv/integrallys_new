-- 043_paciente_exames.sql
-- CR-M19-H/I: exames anexados ao paciente (uploaded pela clínica ou pelo
-- próprio paciente via portal). Arquivos ficam no bucket
-- `exames-pacientes` (Supabase Storage); esta tabela mantém o índice.
--
-- Idempotente.

create table if not exists public.paciente_exames (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  nome text not null,
  tipo text null,
  url text not null,
  uploaded_by uuid null references public.usuarios(id) on delete set null,
  uploaded_pelo_paciente boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists paciente_exames_paciente_idx
  on public.paciente_exames (paciente_id);

alter table public.paciente_exames enable row level security;

drop policy if exists "paciente_exames_all" on public.paciente_exames;
create policy "paciente_exames_all"
  on public.paciente_exames
  for all
  using (true)
  with check (true);

-- Bucket de storage:
-- O Supabase Storage não pode ser criado via DDL do schema public; o admin do
-- projeto precisa criar o bucket `exames-pacientes` manualmente no dashboard
-- (Storage → New bucket, public = false). A API valida e lida com signed URLs.
do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'storage')
     and exists (
       select 1 from pg_catalog.pg_tables
       where schemaname = 'storage' and tablename = 'buckets'
     )
  then
    insert into storage.buckets (id, name, public)
    values ('exames-pacientes', 'exames-pacientes', false)
    on conflict (id) do nothing;
  end if;
end$$;
