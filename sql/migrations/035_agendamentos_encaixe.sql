-- TAREFA-CR-M05-E · Encaixe manual fora da janela de atendimento
--
-- O modal de novo agendamento já tinha o toggle "Encaixe fora do horário
-- padrão" em UI, porém o estado não era persistido. Este migration adiciona
-- as colunas necessárias para registrar:
--
--   - tipo_encaixe   = 'normal' (default) | 'manual'
--   - fora_janela    = true quando o operador marcou o toggle (encaixe fora
--                      da janela configurada do especialista)
--   - motivo_encaixe = texto livre para auditoria (preenchido apenas quando
--                      o toggle está ativo)
--
-- A grade da agenda renderiza um badge "Encaixe" para agendamentos com
-- fora_janela = true. Não é alterada nenhuma validação existente — o
-- controle de janela continua sendo responsabilidade do front (que passa a
-- bypassar o aviso quando o toggle está ativo).

alter table public.agendamentos
  add column if not exists tipo_encaixe text not null default 'normal'
    check (tipo_encaixe in ('normal', 'manual')),
  add column if not exists fora_janela boolean not null default false,
  add column if not exists motivo_encaixe text null;

create index if not exists agendamentos_tipo_encaixe_idx on public.agendamentos (tipo_encaixe);
