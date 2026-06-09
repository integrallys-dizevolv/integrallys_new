alter table public.lista_espera
  add column if not exists especialista text null,
  add column if not exists procedimento text null,
  add column if not exists preferencia_horario text null;
