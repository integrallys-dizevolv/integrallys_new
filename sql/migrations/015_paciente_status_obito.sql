-- 015_paciente_status_obito.sql
-- Adiciona valor 'Óbito' ao enum paciente_status.
-- Idempotente: verifica existência antes de adicionar.

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'Óbito'
      and enumtypid = (select oid from pg_type where typname = 'paciente_status')
  ) then
    alter type public.paciente_status add value 'Óbito';
  end if;
end $$;
