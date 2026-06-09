-- ============================================================================
-- Migration 073 · Recurso próprio para o módulo Comunicação
-- ============================================================================
-- Antes, a Comunicação (WhatsApp: disparos, campanhas, chatbot) era gated pelo
-- recurso `configuracoes` — tanto no sidebar (itemToResource) quanto nas rotas
-- /api/whatsapp/* (requirePermission). Isso acoplava o acesso à Comunicação ao
-- acesso de TODAS as configurações: como só o admin tinha `configuracoes:update`,
-- gestor/recepção/especialista ficavam restritos a leitura (botões davam 403).
--
-- Esta migration cria o recurso `comunicacao` e concede read+update aos perfis
-- que operam a Comunicação, desacoplando de `configuracoes`. O código passa a
-- usar requirePermission(..., 'comunicacao', ...) e itemToResource → 'comunicacao'.
--
-- IDEMPOTENTE: NOT EXISTS no recurso e nos grants (a unique de perfil_permissoes
-- inclui unidade_id desde a migration 008, então não dá pra usar ON CONFLICT
-- com (perfil, recurso_id, acao)).
-- ============================================================================

-- 1) Recurso
insert into public.recursos (codigo, descricao)
select 'comunicacao', 'Módulo de Comunicação (WhatsApp: disparos, campanhas, chatbot)'
where not exists (select 1 from public.recursos where codigo = 'comunicacao');

-- 2) Grants read+update por perfil (paciente NÃO recebe — é o portal)
insert into public.perfil_permissoes (perfil, recurso_id, acao)
select p.perfil::public.user_role, r.id, a.acao
from public.recursos r
cross join (values ('admin'), ('gestor'), ('master'), ('recepcao'), ('especialista')) as p(perfil)
cross join (values ('read'), ('update')) as a(acao)
where r.codigo = 'comunicacao'
  and not exists (
    select 1 from public.perfil_permissoes pp
    where pp.perfil = p.perfil::public.user_role
      and pp.recurso_id = r.id
      and pp.acao = a.acao
      and pp.unidade_id is null
  );

-- VERIFICAÇÃO:
-- select pp.perfil, pp.acao from public.perfil_permissoes pp
-- join public.recursos r on r.id = pp.recurso_id
-- where r.codigo = 'comunicacao' order by pp.perfil, pp.acao;
