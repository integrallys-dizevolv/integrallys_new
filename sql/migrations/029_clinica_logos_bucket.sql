-- Migration 029 — Bucket Storage para logos de clínica
-- Contexto:
--   * TAREFA-CR-REV-G prevê upload de logo (PNG/SVG). O arquivo é
--     referenciado em `clinica_config.logo_url` e deve ser exibido nos
--     documentos gerados (atestados, laudos, recibos etc.).
--   * Bucket público — logos aparecem em documentos baixados/impressos
--     e em previews sem autenticação. Upload e write são controlados na
--     camada de API.

do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'storage')
     and exists (
       select 1 from pg_catalog.pg_tables
       where schemaname = 'storage' and tablename = 'buckets'
     ) then
    insert into storage.buckets (id, name, public)
    values ('clinica-logos', 'clinica-logos', true)
    on conflict (id) do nothing;
  end if;
end $$;
