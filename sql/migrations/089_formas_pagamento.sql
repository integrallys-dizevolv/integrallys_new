-- 089_formas_pagamento.sql
-- Item 9a — catálogo GLOBAL de formas de pagamento (sem unidade_id).
--
-- Formas como Dinheiro/PIX são as mesmas em qualquer unidade. Quando a forma for
-- um cartão específico, o vínculo `cartao_id` carrega a unidade indiretamente
-- (via cartoes_empresariais.unidade_id). Cartões geram sua própria linha aqui
-- automaticamente (item 9c) — não semeamos cartões neste arquivo.
--
-- Idempotente.

create table if not exists public.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'outro')),
  cartao_id uuid null references public.cartoes_empresariais(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint formas_pagamento_nome_unique unique (nome)
);

create index if not exists formas_pagamento_cartao_idx on public.formas_pagamento(cartao_id);

drop trigger if exists formas_pagamento_set_updated_at on public.formas_pagamento;
create trigger formas_pagamento_set_updated_at
before update on public.formas_pagamento
for each row execute function public.set_updated_at();

-- RLS enable sem policy = deny-by-default para anon/authenticated; o service_role
-- do app (getAppSupabase) ignora RLS por design, alinhado à 060/079.
alter table public.formas_pagamento enable row level security;

-- Seed idempotente das formas globais base (não-cartão).
insert into public.formas_pagamento (nome, tipo)
values
  ('Dinheiro', 'dinheiro'),
  ('PIX', 'pix'),
  ('Transferência', 'transferencia')
on conflict (nome) do nothing;
