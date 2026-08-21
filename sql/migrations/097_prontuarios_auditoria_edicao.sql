-- 097_prontuarios_auditoria_edicao.sql
-- Opção 2 do de-para: prontuário editável pós-finalização com trilha de auditoria.

alter table public.prontuarios
  add column if not exists updated_by uuid null references public.usuarios(id) on delete set null;

create table if not exists public.prontuario_versoes (
  id uuid primary key default gen_random_uuid(),
  prontuario_id uuid not null references public.prontuarios(id) on delete cascade,
  conteudo jsonb not null default '{}'::jsonb,
  status text null,
  edited_by uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists prontuario_versoes_prontuario_idx
  on public.prontuario_versoes (prontuario_id, created_at desc);

comment on table public.prontuario_versoes is
  'Snapshot leve a cada edição do prontuário (auditoria pós-remoção do freeze RN-009).';
