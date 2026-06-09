-- TAREFA-065 · E-sign na assinatura da prescrição
--
-- Adiciona persistência da assinatura desenhada no SignaturePad ao salvar
-- a prescrição. A assinatura fica em base64 PNG (data URL), armazenada
-- como TEXT. assinado_em registra o timestamp de quando o profissional
-- confirmou a assinatura.

alter table public.prescricoes
  add column if not exists assinatura_base64 text null,
  add column if not exists assinado_em timestamptz null;

create index if not exists prescricoes_assinado_em_idx on public.prescricoes (assinado_em);
