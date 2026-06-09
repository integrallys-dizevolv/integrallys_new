-- Migration 077 — Bucket Storage para fotos de perfil de usuário (avatares)
-- Contexto:
--   * TAREFA-CR-CONFIG-UI (Parte C) liga o upload real de foto de perfil em
--     src/app/api/usuarios/avatar/route.ts. O arquivo é referenciado em
--     `usuarios.avatar_url` e exibido no header e na tela de Configurações.
--   * Bucket público — o avatar aparece via getPublicUrl sem autenticação.
--     Upload e write são controlados na camada de API (POST exige sessão JWT,
--     caminho preso a session.userId).
--   * Espelha a migration 029 (bucket `clinica-logos`). Idempotente.

do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'storage')
     and exists (
       select 1 from pg_catalog.pg_tables
       where schemaname = 'storage' and tablename = 'buckets'
     ) then
    insert into storage.buckets (id, name, public)
    values ('avatares', 'avatares', true)
    on conflict (id) do nothing;
  end if;
end $$;
