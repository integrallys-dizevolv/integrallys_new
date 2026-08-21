-- 096_anamnese_campos_personalizados.sql
-- Cláusula 3 · Módulo 1: campos personalizados de anamnese.

alter table public.anamneses
  add column if not exists campos_extras jsonb not null default '{}'::jsonb;

comment on column public.anamneses.campos_extras is
  'Valores de campos personalizados definidos em configuracoes (categoria anamnese).';

-- Definição dos campos: configuracoes.categoria = 'anamnese', chave = 'campos_personalizados'
-- valor JSON: [{ "id": "alergias", "label": "Alergias", "tipo": "texto" }, ...]
insert into public.configuracoes (categoria, chave, valor)
values (
  'anamnese',
  'campos_personalizados',
  '[{"id":"alergias","label":"Alergias","tipo":"texto"},{"id":"medicamentos_uso","label":"Medicamentos em uso","tipo":"texto"}]'
)
on conflict (categoria, chave) do nothing;
