-- 099_agendamentos_procedimento_id.sql
-- EXTRA-V3-1: vincular procedimento ao horário da agenda (vídeo 3 — feedback cliente).
-- Complementa valor_procedimento (013) com FK para procedimentos.

begin;

alter table public.agendamentos
  add column if not exists procedimento_id uuid null
    references public.procedimentos(id) on delete set null;

create index if not exists agendamentos_procedimento_id_idx
  on public.agendamentos (procedimento_id);

comment on column public.agendamentos.procedimento_id is
  'Procedimento vinculado ao agendamento; valor_procedimento espelha procedimentos.valor na criação.';

commit;
