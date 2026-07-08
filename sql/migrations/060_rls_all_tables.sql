-- ============================================================================
-- Migration 060 · Row Level Security (RLS) global · "deny-by-default"
-- ============================================================================
--
-- CONTEXTO
-- O projeto usa autenticação própria (JWT customizado via `jose`, cookie
-- `integrallys_token`) — NÃO usa Supabase Auth, portanto `auth.uid()` não
-- existe no contexto das requisições.
--
-- Toda a API Next.js acessa o banco com a chave `service_role`
-- (SUPABASE_SERVICE_ROLE_KEY via getAppSupabase()). O `service_role` BYPASSA
-- RLS por definição do PostgreSQL — logo a API continua funcionando
-- normalmente após esta migration.
--
-- O objetivo aqui é fechar o acesso direto de quem usa as chaves `anon` /
-- `authenticated` (Supabase Studio, REST público, SDK no browser): com RLS
-- habilitado e SEM nenhuma policy criada, esses papéis não conseguem
-- selecionar/inserir/atualizar/deletar nada.
--
-- ESTRATÉGIA
--   Habilitar RLS + NÃO criar policy  ==  negar tudo para anon/authenticated.
--   (NUNCA usar `USING (true)`: equivale a NÃO ter RLS.)
--
-- IDEMPOTÊNCIA
--   - Habilitar RLS via ALTER TABLE é no-op se a tabela já estiver com RLS
--     ligado (PostgreSQL não gera erro ao reexecutar) — não existe sintaxe
--     IF NOT EXISTS para esse comando.
--   - O DROP de policy usa a cláusula IF EXISTS, e REVOKE não gera erro ao
--     revogar privilégio inexistente — ambos idempotentes por natureza.
--   Esta migration pode rodar quantas vezes for necessário sem erro.
--
-- ORDEM
--   1) 30 tabelas do schema principal — habilitar RLS
--   2) 9 tabelas que já tinham RLS com policy permissiva — remover a policy
--   3) REVOKE nas 4 funções SECURITY DEFINER (uso restrito ao service_role)
-- ============================================================================


-- ============================================================================
-- 1) SCHEMA PRINCIPAL — habilitar RLS nas 30 tabelas sem proteção
-- ============================================================================
-- Nenhuma policy é criada de propósito: sem policy + RLS ligado = acesso
-- negado para anon/authenticated. O service_role da API continua passando.

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_repasse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dre_demonstrativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescricao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2) TABELAS COM RLS JÁ HABILITADO — remover policies permissivas
-- ============================================================================
-- Estas tabelas já tinham RLS ligado, porém com policy `FOR ALL USING (true)
-- WITH CHECK (true)` — o que ANULA a proteção (libera tudo para qualquer
-- papel). Removemos a policy permissiva e NÃO criamos nenhuma no lugar,
-- caindo no mesmo padrão "deny-by-default" da seção 1.
-- RLS já está habilitado nestas tabelas, então NÃO há ALTER TABLE aqui.

-- agenda_bloqueios  (criada na migration 038)
DROP POLICY IF EXISTS "bloqueios_clinica_all" ON public.agenda_bloqueios;

-- contas_bancarias  (criada na migration 041)
DROP POLICY IF EXISTS "contas_bancarias_all" ON public.contas_bancarias;

-- conciliacao_ofx  (criada na migration 042)
DROP POLICY IF EXISTS "conciliacao_ofx_all" ON public.conciliacao_ofx;

-- paciente_exames  (criada na migration 043)
DROP POLICY IF EXISTS "paciente_exames_all" ON public.paciente_exames;

-- cartoes_empresariais  (criada na migration 052)
DROP POLICY IF EXISTS "cartoes_empresariais_all" ON public.cartoes_empresariais;

-- cartao_movimentos  (criada na migration 052)
DROP POLICY IF EXISTS "cartao_movimentos_all" ON public.cartao_movimentos;

-- whatsapp_disparos  (criada na migration 056)
DROP POLICY IF EXISTS "whatsapp_disparos_all" ON public.whatsapp_disparos;

-- chatbot_sessoes  (criada na migration 057)
DROP POLICY IF EXISTS "chatbot_sessoes_all" ON public.chatbot_sessoes;

-- pagamentos_online  (criada na migration 058)
DROP POLICY IF EXISTS "pagamentos_online_all" ON public.pagamentos_online;


-- ============================================================================
-- 3) FUNÇÕES SECURITY DEFINER — restringir ao service_role
-- ============================================================================
-- Estas funções rodam com privilégios do owner (SECURITY DEFINER) e são
-- chamadas APENAS pela API via service_role. Revogamos a permissão de
-- execução de anon/authenticated para que não sejam invocáveis direto pelo
-- Studio/REST público. Definições originais na migration 001 (assinaturas
-- confirmadas: parâmetro único `uuid`, exceto can_user `uuid, text, text`).
-- REVOKE é idempotente — revogar privilégio inexistente não gera erro.

REVOKE ALL ON FUNCTION public.touch_ultimo_login(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_permissions(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.can_user(uuid, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_auth_me_payload(uuid) FROM anon, authenticated;


-- ============================================================================
-- DIAGNÓSTICO (rodar manualmente no Supabase Studio para verificar)
-- ============================================================================
-- Confirma que TODAS as tabelas do schema public têm RLS habilitado:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- Esperado: rowsecurity = true para todas as linhas
--
-- Confirma que nenhuma tabela ficou com policy permissiva sobrando:
--
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- Esperado: nenhuma linha (zero policies = deny-by-default em toda a base)
--
-- Confirma que as funções SECURITY DEFINER não têm EXECUTE para anon/auth:
--
-- SELECT p.proname,
--        has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
--        has_function_privilege('authenticated',  p.oid, 'EXECUTE') AS auth_exec
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('touch_ultimo_login','get_user_permissions',
--                      'can_user','get_auth_me_payload');
-- Esperado: anon_exec = false e auth_exec = false em todas as linhas
-- ============================================================================
