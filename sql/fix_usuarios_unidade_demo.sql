-- fix_usuarios_unidade_demo.sql
--
-- ✅ EXECUTADO em 2026-08-03. Resultado confirmado no banco: as 7 contas de
--    papel escopado que estavam sem unidade (3 gestor, 3 recepcao, 1
--    especialista) passaram a apontar para "Natur & Vida"; as 3 que já tinham
--    unidade não foram tocadas; master/admin/paciente seguem com null.
--    Mantido no repositório como registro do que foi rodado.
--
--    Re-rodar é inofensivo (idempotente): encontraria 0 linhas a atualizar.
--
-- Contexto:
--   Todo usuário de papel ESCOPADO (gestor/recepcao/especialista) das contas de
--   demonstração está com `unidade_id` nulo. `getScopedUnitId` devolve null
--   nesse caso, que é o mesmo null usado por master/admin para dizer "sem
--   escopo" — foi o que mascarou o bug do 400 em /api/clinica-config.
--
--   master/admin/paciente NÃO entram aqui: para eles `unidade_id` nulo é
--   correto (master/admin são sem escopo por design; paciente não é escopado
--   por unidade).
--
-- Escopo desta correção: dado, não schema. Por isso não é migration.
--
-- Características (padrão de sql/maintenance_geral.sql):
--   - Idempotente: só toca linhas onde unidade_id ainda é nulo
--   - Não destrutivo: nenhum DELETE/TRUNCATE
--   - Em transação: falhou, rollback total
--   - Aborta se houver mais de uma unidade (não adivinha qual atribuir)
--
-- Como rodar:
--   psql "$DATABASE_URL" -f sql/fix_usuarios_unidade_demo.sql
--   ou cole inteiro no Supabase SQL Editor.

begin;

-- ── Guarda: este script só é seguro enquanto existir exatamente uma unidade.
--    Com duas ou mais, atribuir automaticamente seria chute — aborta.
do $$
declare
  total_unidades int;
begin
  select count(*) into total_unidades from public.unidades;
  if total_unidades <> 1 then
    raise exception
      'Abortado: existem % unidades. Este script só atribui automaticamente quando há exatamente uma. Atribua manualmente.',
      total_unidades;
  end if;
end $$;

-- ── ANTES
select
  'antes' as momento,
  perfil,
  count(*) as sem_unidade
from public.usuarios
where unidade_id is null
  and perfil in ('gestor', 'recepcao', 'especialista')
group by perfil
order by perfil;

-- ── REPAIR
update public.usuarios u
set unidade_id = (select id from public.unidades limit 1)
where u.unidade_id is null
  and u.perfil in ('gestor', 'recepcao', 'especialista');

-- ── DEPOIS (esperado: nenhuma linha)
select
  'depois' as momento,
  perfil,
  count(*) as sem_unidade
from public.usuarios
where unidade_id is null
  and perfil in ('gestor', 'recepcao', 'especialista')
group by perfil
order by perfil;

commit;

-- Nota: isto corrige o dado existente, NÃO a origem. A tela de Usuários não
-- persiste unidade_id na criação nem na edição (achado separado, ver relatório)
-- — enquanto isso não for corrigido, todo usuário novo volta a nascer com nulo.
