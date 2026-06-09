-- 040_caixa_operador.sql
-- CR-M19-C: cada sessão de caixa vinculada ao operador.
--
-- A coluna `usuario_id` em `caixa_movimentos` e `opened_by_id`/`closed_by_id`
-- em `caixa_sessoes` já cobrem o vínculo. Este migration adiciona o nome
-- canonicamente esperado pelo spec (`operador_id`) como espelho de
-- `usuario_id`/`opened_by_id` para uso pela API e UI multi-operador, sem
-- quebrar consumidores legados.
--
-- Idempotente.

alter table public.caixa_movimentos
  add column if not exists operador_id uuid null references public.usuarios(id) on delete set null;

update public.caixa_movimentos
  set operador_id = usuario_id
  where operador_id is null
    and usuario_id is not null;

create index if not exists caixa_movimentos_operador_idx
  on public.caixa_movimentos (operador_id);

alter table public.caixa_sessoes
  add column if not exists operador_id uuid null references public.usuarios(id) on delete set null;

update public.caixa_sessoes
  set operador_id = opened_by_id
  where operador_id is null
    and opened_by_id is not null;

create index if not exists caixa_sessoes_operador_idx
  on public.caixa_sessoes (operador_id);
