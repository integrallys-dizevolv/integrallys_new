-- 088_pacientes_origem_detalhe_vinculos_nf.sql
-- Item 10 — Pacientes: origem detalhada, múltiplos vínculos e flag de Nota Fiscal.

-- 1) Campos aditivos.
--    origem_detalhe: texto livre condicional (quando origem = indicacao/outros).
--    precisa_nf: toggle "Precisa de Nota Fiscal?".
alter table public.pacientes
  add column if not exists origem_detalhe text null,
  add column if not exists precisa_nf boolean not null default false;

-- 2) Múltiplos vínculos: troca vinculo_tipo (string única) por vinculo_tipos text[].
--    O recurso Fornecedores passa a discriminar por "contém 'fornecedor'".
alter table public.pacientes
  add column if not exists vinculo_tipos text[] not null default array['cliente']::text[];

-- Backfill 1->array + drop da coluna antiga. Idempotente: só roda enquanto a
-- coluna vinculo_tipo existir (re-execução após o drop é no-op).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pacientes' and column_name = 'vinculo_tipo'
  ) then
    update public.pacientes
      set vinculo_tipos = array[vinculo_tipo]
      where nullif(trim(vinculo_tipo), '') is not null;
    alter table public.pacientes drop column vinculo_tipo;
  end if;
end $$;
