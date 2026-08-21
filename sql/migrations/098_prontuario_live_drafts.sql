-- 098_prontuario_live_drafts.sql
-- Draft efêmero para sync ≤1s da tela grande (não gera prontuario_versoes).

create table if not exists public.prontuario_live_drafts (
  paciente_id uuid primary key references public.pacientes(id) on delete cascade,
  texto text not null default '',
  author_id uuid not null references public.usuarios(id) on delete cascade,
  unidade_id uuid null references public.unidades(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prontuario_live_drafts_updated_idx
  on public.prontuario_live_drafts (updated_at desc);

comment on table public.prontuario_live_drafts is
  'Rascunho ao vivo do atendimento para tela grande (BroadcastChannel + poll). Sem auditoria de versões.';
