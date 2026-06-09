-- TAREFA-072 · Lista de Espera expandida na Agenda (Item 53 · 22/04/2026)
--
-- 1) Adiciona coluna `valor` em `procedimentos` para permitir exibir o valor
--    na seleção da Lista de Espera e somar a "Receita Futura" da agenda.
-- 2) Adiciona FKs `procedimento_id` e `especialista_id` em `lista_espera`,
--    mantendo as colunas textuais (`procedimento`, `especialista`) por
--    retrocompatibilidade com registros antigos. As colunas textuais são
--    populadas via trigger nos novos inserts/updates.

alter table public.procedimentos
  add column if not exists valor numeric(10,2) null;

alter table public.lista_espera
  add column if not exists procedimento_id uuid null references public.procedimentos(id) on delete set null,
  add column if not exists especialista_id uuid null references public.usuarios(id) on delete set null;

create index if not exists lista_espera_procedimento_id_idx on public.lista_espera (procedimento_id);
create index if not exists lista_espera_especialista_id_idx on public.lista_espera (especialista_id);
