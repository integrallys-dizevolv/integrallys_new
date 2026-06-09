-- 045_conciliacao_ofx_tipo_fitid.sql
-- Atualiza CR-M19-D após análise de arquivos reais (Bradesco SGML + Sicredi XML).
-- Adiciona:
--   tipo  — 'CREDIT' | 'DEBIT' (extraído de TRNTYPE)
--   fitid — ID único da transação no extrato (extraído de FITID)
-- Constraint de unicidade (conta_id, fitid) evita reimportação duplicada
-- quando o usuário roda o mesmo OFX duas vezes.
--
-- Idempotente.

alter table public.conciliacao_ofx
  add column if not exists tipo text null,
  add column if not exists fitid text null;

-- Constraint de check em tipo (apenas valores aceitos quando preenchido)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conciliacao_ofx_tipo_check'
  ) then
    alter table public.conciliacao_ofx
      add constraint conciliacao_ofx_tipo_check
      check (tipo is null or tipo in ('CREDIT', 'DEBIT'));
  end if;
end$$;

-- Unicidade por conta + fitid — somente quando ambos preenchidos.
-- (Permite NULLs para conciliações importadas sem FITID, ex.: CSV.)
create unique index if not exists conciliacao_ofx_conta_fitid_unique
  on public.conciliacao_ofx (conta_id, fitid)
  where fitid is not null;
