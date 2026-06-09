-- 039_usuarios_tipo_vinculo.sql
-- CR-M05-F: especialista pode ser "interno" (clínica paga repasse)
-- ou "parceiro" (% sobre valor bruto, sem dedução de custos da clínica).
--
-- Idempotente.

alter table public.usuarios
  add column if not exists tipo_vinculo text default 'interno';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'usuarios_tipo_vinculo_check'
  ) then
    alter table public.usuarios
      add constraint usuarios_tipo_vinculo_check
      check (tipo_vinculo in ('interno', 'parceiro'));
  end if;
end$$;
