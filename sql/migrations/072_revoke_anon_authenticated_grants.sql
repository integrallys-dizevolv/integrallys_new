-- ============================================================================
-- Migration 072 · Hardening: revogar grants amplos de anon/authenticated
-- ============================================================================
-- DEFESA EM PROFUNDIDADE. O audit mostrou que `anon` tem SELECT e
-- `authenticated` tem DML completo em quase todas as tabelas de `public`
-- (grants padrão do Supabase). Hoje o RLS deny-by-default (migration 060) já
-- bloqueia esses papéis, mas os grants continuam lá como superfície de ataque:
-- se o RLS de alguma tabela for desabilitado por engano, os dados ficam
-- expostos só pelos grants.
--
-- É SEGURO revogar porque:
--   - A API acessa o banco SOMENTE via service_role, que BYPASSA grants e RLS.
--   - A autenticação é própria (JWT via `jose`), não Supabase Auth — os papéis
--     anon/authenticated nunca são usados pela aplicação.
--
-- ESCOPO: apenas o schema `public`. Os schemas internos do Supabase
-- (auth, storage, realtime, vault) NÃO são tocados.
--
-- IDEMPOTÊNCIA: REVOKE é no-op ao reexecutar. NOTA: tabelas criadas DEPOIS via
-- Supabase Studio podem reganhar os grants padrão — rode esta migration de novo
-- após criar tabelas para manter o hardening. (Não usamos ALTER DEFAULT
-- PRIVILEGES de propósito, para não conflitar com a gestão do Supabase.)
-- ============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- VERIFICAÇÃO (esperado: zero linhas):
-- select table_name, grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema='public' and grantee in ('anon','authenticated')
-- order by table_name, grantee;
