-- ============================================================================
-- Migration 067 · Fechar EXECUTE público nas funções SECURITY DEFINER
-- ============================================================================
-- CONTEXTO / BUG QUE ISTO CORRIGE
-- A migration 060 fez `REVOKE ALL ON FUNCTION ... FROM anon, authenticated`
-- para as 4 funções SECURITY DEFINER, mas NÃO revogou de PUBLIC. Toda função
-- no PostgreSQL nasce com EXECUTE concedido a PUBLIC — e anon/authenticated
-- herdam EXECUTE via PUBLIC. Logo o REVOKE da 060 NÃO teve efeito: o audit
-- mostrou has_function_privilege('anon', ...) = true para todas.
--
-- IMPACTO DA BRECHA
-- Como são SECURITY DEFINER (rodam como owner, IGNORAM RLS), um chamador
-- anônimo via REST `/rest/v1/rpc/get_auth_me_payload` poderia obter payload de
-- permissões / dados de auth de QUALQUER usuario_id.
--
-- CORREÇÃO
--   1) REVOKE ... FROM PUBLIC (além de anon, authenticated por clareza).
--   2) GRANT EXECUTE ... TO service_role — OBRIGATÓRIO: o app chama estas
--      funções via service_role (src/lib/authz.ts, src/lib/auth-payload.ts);
--      sem este GRANT o REVOKE FROM PUBLIC quebraria o login. O owner
--      (postgres) mantém EXECUTE sempre.
--
-- IDEMPOTÊNCIA: REVOKE e GRANT são no-op ao reexecutar.
-- ============================================================================

REVOKE ALL ON FUNCTION public.can_user(uuid, text, text)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_auth_me_payload(uuid)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_permissions(uuid)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_ultimo_login(uuid)          FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.can_user(uuid, text, text)     TO service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_me_payload(uuid)      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid)     TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_ultimo_login(uuid)       TO service_role;

-- VERIFICAÇÃO (esperado: anon_exec=false, auth_exec=false, service_exec=true):
-- select p.proname,
--   has_function_privilege('anon',         p.oid,'EXECUTE') anon_exec,
--   has_function_privilege('authenticated', p.oid,'EXECUTE') auth_exec,
--   has_function_privilege('service_role',  p.oid,'EXECUTE') service_exec
-- from pg_proc p where p.pronamespace='public'::regnamespace
--   and p.proname in ('can_user','get_auth_me_payload','get_user_permissions','touch_ultimo_login');
