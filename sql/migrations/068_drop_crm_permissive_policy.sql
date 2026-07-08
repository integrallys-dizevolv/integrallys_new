-- ============================================================================
-- Migration 068 · Remover policy permissiva crm_paciente_estagios_all
-- ============================================================================
-- A migration 064_campanhas_whatsapp.sql criou a policy
--   crm_paciente_estagios_all  FOR ALL TO public USING (true) WITH CHECK (true)
-- que ANULA o RLS (libera tudo para qualquer papel). A 065 documentou que a
-- remoção seria feita pela 066, mas a 066 só adicionou colunas — a policy
-- nunca foi dropada (confirmado no audit: ela ainda existe).
--
-- Hoje não é explorável (a tabela não tem GRANT para anon/authenticated), mas
-- contraria o padrão deny-by-default da migration 060. Removendo, a tabela
-- volta a "RLS habilitado + zero policy = nega anon/authenticated". O
-- service_role (usado pela API) bypassa RLS e segue funcionando normalmente.
--
-- IDEMPOTÊNCIA: DROP POLICY IF EXISTS é no-op se já não existir.
-- ============================================================================

DROP POLICY IF EXISTS "crm_paciente_estagios_all" ON public.crm_paciente_estagios;

-- VERIFICAÇÃO (esperado: zero linhas):
-- select policyname from pg_policies
-- where schemaname='public' and tablename='crm_paciente_estagios';
