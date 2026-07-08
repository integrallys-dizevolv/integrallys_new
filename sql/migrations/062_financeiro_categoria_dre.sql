-- 062_financeiro_categoria_dre.sql
-- Agente 04 · Problemas 4.3 / QC-02
-- Adiciona `categoria_dre` (enum estruturado) a financeiro_lancamentos para
-- substituir a categorização por regex frágil — que hoje roda sobre o campo
-- `categoria` no /api/dre. Com a coluna estruturada, a API passa a usar
-- `categoria_dre` como critério primário e mantém o regex apenas como fallback.
--
-- Idempotente:
--   - enum protegido por checagem em pg_type
--   - coluna via `add column if not exists`
--   - UPDATE só toca linhas com categoria_dre IS NULL (re-run é no-op)

-- Enum para categorias DRE estruturadas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'dre_categoria') then
    create type public.dre_categoria as enum (
      'receita_consultas', 'receita_produtos', 'receita_outros',
      'despesa_fixa', 'despesa_administrativa', 'despesa_comercial',
      'despesa_pessoal', 'despesa_depreciacao', 'cancelamento', 'outros'
    );
  end if;
end $$;

alter table public.financeiro_lancamentos
  add column if not exists categoria_dre public.dre_categoria null;

-- Migrar dados existentes usando a mesma heurística regex atual do /api/dre
-- (melhor esforço — os padrões abaixo espelham as constantes DESPESA_*_REGEX
-- da route, incluindo as variações acentuadas).
update public.financeiro_lancamentos set categoria_dre =
  case
    when descricao ~* '(fixa|aluguel|sal[aá]rio|folha|contador|cont[aá]bil|condom[ií]nio|internet|telefone)' then 'despesa_fixa'
    when descricao ~* '(marketing|comercial|vendas)' then 'despesa_comercial'
    when descricao ~* '(deprecia|amortiz)' then 'despesa_depreciacao'
    when descricao ~* '(cancelamento|deduc)' then 'cancelamento'
    when tipo = 'receita' and descricao ~* '(consulta|atendimento|sess[aã]o)' then 'receita_consultas'
    when tipo = 'receita' and descricao ~* '(produto|venda|suplemento)' then 'receita_produtos'
    when tipo = 'receita' then 'receita_outros'
    when tipo = 'despesa' then 'despesa_administrativa'
    else 'outros'
  end::public.dre_categoria
where categoria_dre is null;

-- DIAGNÓSTICO (rodar manualmente para conferir a distribuição do backfill):
-- SELECT categoria_dre, count(*) FROM public.financeiro_lancamentos
-- GROUP BY categoria_dre ORDER BY count(*) DESC;
-- Esperado: nenhuma linha com categoria_dre IS NULL após a migration.
