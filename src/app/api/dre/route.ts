import { NextResponse, type NextRequest } from 'next/server'
import type { PostgrestError } from '@supabase/supabase-js'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

interface DreItemDetail {
  label: string
  value: number
}

interface DreItem {
  id: number
  label: string
  value: number
  type: 'positive' | 'negative' | 'neutral' | 'summary' | 'total' | 'result'
  sub?: string
  sub2?: string
  expandable?: boolean
  details?: DreItemDetail[]
}

interface DreResumo {
  receitaBruta: number
  /**
   * Receita líquida (Receita bruta − Deduções). Mantém o nome `lucroBruto`
   * por retrocompatibilidade com componentes que ainda consomem a chave;
   * a UI exibe como "Receita líquida" desde a CR-REV-I.
   */
  lucroBruto: number
  ebitda: number
  lucroLiquido: number
}

const DESPESA_FIXA_REGEX =
  /(fixa|aluguel|sal[aá]rio|folha|contador|cont[aá]bil|condom[ií]nio|internet|telefone)/i
const DESPESA_ADMINISTRATIVA_REGEX = /administrativo|gest[aã]o|taxa|servi[cç]o/i
const DESPESA_COMERCIAL_REGEX = /marketing|comercial|vendas/i
const DESPESA_DEPRECIACAO_REGEX = /deprecia|amortiz/i
const DESPESA_CANCELAMENTO_REGEX = /cancelamento|deduc/i

interface LancamentoRow {
  categoria: string | null
  valor: number | string | null
  categoria_dre?: string | null
  descricao?: string | null
  tipo?: string | null
}

type DreBucket =
  | 'receita_consultas'
  | 'receita_produtos'
  | 'receita_outros'
  | 'despesa_fixa'
  | 'despesa_administrativa'
  | 'despesa_comercial'
  | 'despesa_pessoal'
  | 'despesa_depreciacao'
  | 'cancelamento'
  | 'outros'

/**
 * QC-02: classificação de um lançamento em bucket do DRE.
 *  - Critério primário: `categoria_dre` (coluna estruturada — migration 062).
 *  - Fallback (retrocompatibilidade): a MESMA heurística regex de antes,
 *    aplicada sobre `categoria`, porém agora retornando um único bucket
 *    (sem a dupla contagem que existia quando uma linha casava com 2+ regex).
 */
function categorizarLancamento(row: {
  categoria_dre?: string | null
  categoria?: string | null
  descricao?: string | null
  tipo?: string | null
}): DreBucket {
  if (row.categoria_dre) return row.categoria_dre as DreBucket
  const categoria = String(row.categoria ?? '')
  const tipo = String(row.tipo ?? '').toLowerCase()
  if (DESPESA_CANCELAMENTO_REGEX.test(categoria)) return 'cancelamento'
  if (DESPESA_DEPRECIACAO_REGEX.test(categoria)) return 'despesa_depreciacao'
  if (DESPESA_ADMINISTRATIVA_REGEX.test(categoria)) return 'despesa_administrativa'
  if (DESPESA_COMERCIAL_REGEX.test(categoria)) return 'despesa_comercial'
  if (DESPESA_FIXA_REGEX.test(categoria)) return 'despesa_fixa'
  if (tipo === 'receita') return 'receita_outros'
  return 'outros'
}

interface DrePeriodoResultado {
  label: string
  resumo: DreResumo
  items: DreItem[]
}

interface DreComparativoResponse {
  periodoA: DrePeriodoResultado
  periodoB: DrePeriodoResultado
  /** Variação percentual A vs B (positivo = A maior que B). */
  variacao: { receitaBruta: number; lucroLiquido: number }
}

interface DreFiltersPayload {
  periodo: 'mensal' | 'trimestral' | 'anual' | 'diario'
  mesAno: string
  unidade: string
  visao: string
  busca: string
  tipo: 'todos' | 'receita' | 'despesa'
  categoria: string
  /** Período B do comparativo: 'YYYY-MM' (ou 'YYYY-MM-DD' no diário). */
  comparar?: string
  /** Range custom (sobrepõe mesAno/periodo) — diário ou comparativo custom. */
  de?: string
  ate?: string
  comparar_de?: string
  comparar_ate?: string
}

function normalizeFilters(request: NextRequest, body?: Partial<DreFiltersPayload> | null): DreFiltersPayload {
  const searchParams = request.nextUrl.searchParams
  const rawPeriodo = (body?.periodo ?? searchParams.get('periodo') ?? 'mensal') as DreFiltersPayload['periodo']
  const periodo = (['mensal', 'trimestral', 'anual', 'diario'].includes(rawPeriodo)
    ? rawPeriodo
    : 'mensal') as DreFiltersPayload['periodo']
  const now = new Date()
  const defaultMesAno = periodo === 'diario' ? now.toISOString().slice(0, 10) : now.toISOString().slice(0, 7)
  const mesAno = String(body?.mesAno ?? searchParams.get('mesAno') ?? defaultMesAno)
  const unidade = String(body?.unidade ?? searchParams.get('unidade') ?? 'todas')
  const visao = String(body?.visao ?? searchParams.get('visao') ?? 'gerencial')
  const busca = String(body?.busca ?? searchParams.get('busca') ?? '').trim()
  const tipo = String(body?.tipo ?? searchParams.get('tipo') ?? 'todos')
  const categoria = String(body?.categoria ?? searchParams.get('categoria') ?? 'todas')
  const optional = (key: 'comparar' | 'de' | 'ate' | 'comparar_de' | 'comparar_ate') => {
    const raw = body?.[key] ?? searchParams.get(key) ?? ''
    const text = String(raw).trim()
    return text === '' ? undefined : text
  }

  return {
    periodo,
    mesAno,
    unidade,
    visao,
    busca,
    tipo: tipo === 'receita' || tipo === 'despesa' ? tipo : 'todos',
    categoria,
    comparar: optional('comparar'),
    de: optional('de'),
    ate: optional('ate'),
    comparar_de: optional('comparar_de'),
    comparar_ate: optional('comparar_ate'),
  }
}

function getReferenceDate(periodo: DreFiltersPayload['periodo'], mesAno: string) {
  const [yearText, monthText, dayText] = mesAno.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear()
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1
  const safeDay = Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1

  if (periodo === 'anual') {
    return new Date(Date.UTC(safeYear, 0, 1))
  }

  if (periodo === 'trimestral') {
    const quarterStartMonth = Math.floor((safeMonth - 1) / 3) * 3
    return new Date(Date.UTC(safeYear, quarterStartMonth, 1))
  }

  if (periodo === 'diario') {
    return new Date(Date.UTC(safeYear, safeMonth - 1, safeDay))
  }

  return new Date(Date.UTC(safeYear, safeMonth - 1, 1))
}

function getRangeForPeriod(referenceDate: Date, periodo: DreFiltersPayload['periodo']) {
  const start = new Date(referenceDate)
  const end = new Date(referenceDate)

  if (periodo === 'anual') {
    end.setUTCFullYear(end.getUTCFullYear() + 1)
  } else if (periodo === 'trimestral') {
    end.setUTCMonth(end.getUTCMonth() + 3)
  } else if (periodo === 'diario') {
    end.setUTCDate(end.getUTCDate() + 1)
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1)
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    reference: start.toISOString().slice(0, 10),
  }
}

/**
 * Resolve a janela de datas do DRE. Prioriza um range custom (de/ate); caso
 * contrário deriva de periodo + mesAno. Usado pelo período A e pelo B do
 * modo comparativo.
 */
function resolveRange(filters: DreFiltersPayload) {
  if (filters.de && filters.ate) {
    const start = new Date(`${filters.de}T00:00:00.000Z`)
    const end = new Date(`${filters.ate}T00:00:00.000Z`)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
      return { start: start.toISOString(), end: end.toISOString(), reference: filters.de }
    }
  }
  return getRangeForPeriod(getReferenceDate(filters.periodo, filters.mesAno), filters.periodo)
}

const buildGroupedDetails = (rows: Array<{ categoria: string | null; valor: number | string | null }>) =>
  Array.from(
    rows.reduce((acc, row) => {
      const key = String(row.categoria ?? 'Sem categoria')
      acc.set(key, (acc.get(key) ?? 0) + Number(row.valor ?? 0))
      return acc
    }, new Map<string, number>()),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

interface DescontoRow {
  categoria: string | null
  valor: number | string | null
}

interface CustoVariavelRow {
  descricao: string | null
  valor: number
}

function buildDreItems(
  receitas: LancamentoRow[],
  despesas: LancamentoRow[],
  deducoesPrescricoes: DescontoRow[],
  custosVariaveisProdutos: CustoVariavelRow[],
) {
  const receitaBruta = receitas.reduce((acc, row) => acc + Number(row.valor ?? 0), 0)

  // QC-02: cada despesa é classificada UMA única vez via categorizarLancamento
  // (categoria_dre como critério primário; regex como fallback). Substitui os
  // filtros regex independentes que podiam contar a mesma linha em 2+ grupos.
  const bucketDeDespesa = new Map<LancamentoRow, DreBucket>()
  despesas.forEach((row) => bucketDeDespesa.set(row, categorizarLancamento(row)))
  const despesasPorBucket = (...buckets: DreBucket[]) =>
    despesas.filter((row) => buckets.includes(bucketDeDespesa.get(row) as DreBucket))
  const somaValor = (rows: Array<{ valor: number | string | null }>) =>
    rows.reduce((acc, row) => acc + Number(row.valor ?? 0), 0)

  // Buckets com tratamento dedicado no DRE. O que não cair em nenhum deles
  // (bucket 'outros' e quaisquer despesas não classificadas) vira variável.
  const BUCKETS_CLASSIFICADOS: DreBucket[] = [
    'cancelamento',
    'despesa_depreciacao',
    'despesa_administrativa',
    'despesa_comercial',
    'despesa_fixa',
    'despesa_pessoal',
  ]

  // Deduções: descontos de prescrições + lançamentos classificados como cancelamento
  const cancelamentosRows = despesasPorBucket('cancelamento')
  const deducoesRows: DescontoRow[] = [...deducoesPrescricoes, ...cancelamentosRows]
  const deducoes = deducoesRows.reduce((acc, row) => acc + Number(row.valor ?? 0), 0)

  const receitaLiquida = receitaBruta - deducoes

  // Custos variáveis: prescricao_itens × produtos_estoque.preco_custo
  const custosVariaveis = custosVariaveisProdutos.reduce((acc, row) => acc + row.valor, 0)
  const margemContribuicao = receitaLiquida - custosVariaveis

  // Despesas administrativas e comerciais (buckets dedicados)
  const despesasAdministrativasRows = despesasPorBucket('despesa_administrativa')
  const despesasAdministrativas = somaValor(despesasAdministrativasRows)

  const despesasComerciaisRows = despesasPorBucket('despesa_comercial')
  const despesasComerciais = somaValor(despesasComerciaisRows)

  // Fixas inclui pessoal (folha/salários são custo fixo); variáveis = o resto
  // operacional não classificado em nenhum bucket dedicado.
  const despesasFixasRows = despesasPorBucket('despesa_fixa', 'despesa_pessoal')
  const despesasFixas = somaValor(despesasFixasRows)

  const despesasVariaveisRows = despesas.filter(
    (row) => !BUCKETS_CLASSIFICADOS.includes(bucketDeDespesa.get(row) as DreBucket),
  )
  const despesasVariaveis = somaValor(despesasVariaveisRows)

  const depreciacaoRows = despesasPorBucket('despesa_depreciacao')
  const depreciacao = somaValor(depreciacaoRows)

  const ebitda =
    margemContribuicao -
    despesasFixas -
    despesasVariaveis -
    despesasAdministrativas -
    despesasComerciais
  const lucroLiquido = ebitda - depreciacao

  const margemPct = (value: number) =>
    receitaBruta > 0 ? `Margem de ${((value / receitaBruta) * 100).toFixed(1)}%` : 'Sem margem calculável'

  const custosVariaveisDetails = custosVariaveisProdutos.length
    ? Array.from(
        custosVariaveisProdutos.reduce((acc, row) => {
          const key = String(row.descricao ?? 'Sem produto')
          acc.set(key, (acc.get(key) ?? 0) + row.valor)
          return acc
        }, new Map<string, number>()),
      )
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
    : []

  const itens: DreItem[] = [
    {
      id: 1,
      label: 'Receita bruta',
      value: receitaBruta,
      type: 'positive',
      sub: `${receitas.length} lançamento(s) de receita no período`,
      expandable: true,
      details: buildGroupedDetails(receitas),
    },
    {
      id: 2,
      label: 'Deduções',
      value: -deducoes,
      type: 'negative',
      sub:
        deducoesPrescricoes.length + cancelamentosRows.length > 0
          ? `${deducoesPrescricoes.length} desconto(s) de prescrição + ${cancelamentosRows.length} cancelamento(s)/devolução(ões)`
          : 'Descontos concedidos e cancelamentos do período',
      expandable: deducoesRows.length > 0,
      details: buildGroupedDetails(deducoesRows),
    },
    {
      id: 3,
      label: 'Receita líquida',
      value: receitaLiquida,
      type: 'summary',
      sub: margemPct(receitaLiquida),
    },
    {
      id: 4,
      label: 'Custos variáveis',
      value: -custosVariaveis,
      type: 'negative',
      sub:
        custosVariaveisProdutos.length > 0
          ? `${custosVariaveisProdutos.length} item(ns) de prescrição × custo do produto`
          : 'Sem custos variáveis registrados (verifique preço de custo do estoque)',
      expandable: custosVariaveisDetails.length > 0,
      details: custosVariaveisDetails,
    },
    {
      id: 5,
      label: 'Margem de contribuição',
      value: margemContribuicao,
      type: 'summary',
      sub: margemPct(margemContribuicao),
    },
    {
      id: 6,
      label: 'Despesas fixas',
      value: -despesasFixas,
      type: 'negative',
      sub: 'Aluguel, salários, contador e similares',
      expandable: despesasFixasRows.length > 0,
      details: buildGroupedDetails(despesasFixasRows),
    },
    {
      id: 7,
      label: 'Despesas variáveis',
      value: -despesasVariaveis,
      type: 'negative',
      sub: 'Operacionais não fixas (suprimentos, manutenção, etc.)',
      expandable: despesasVariaveisRows.length > 0,
      details: buildGroupedDetails(despesasVariaveisRows),
    },
    {
      id: 8,
      label: 'Despesas administrativas',
      value: -despesasAdministrativas,
      type: 'neutral',
      sub: 'Despesas administrativas lançadas',
      expandable: despesasAdministrativasRows.length > 0,
      details: buildGroupedDetails(despesasAdministrativasRows),
    },
    {
      id: 9,
      label: 'Despesas comerciais',
      value: -despesasComerciais,
      type: 'neutral',
      sub: 'Custos comerciais e de aquisição',
      expandable: despesasComerciaisRows.length > 0,
      details: buildGroupedDetails(despesasComerciaisRows),
    },
    {
      id: 10,
      label: 'EBITDA',
      value: ebitda,
      type: 'total',
      sub: margemPct(ebitda),
    },
    {
      id: 11,
      label: 'Depreciação / amortização',
      value: -depreciacao,
      type: 'negative',
      sub:
        depreciacaoRows.length > 0
          ? `${depreciacaoRows.length} lançamento(s) de depreciação/amortização`
          : 'Sem depreciação/amortização lançada',
      expandable: depreciacaoRows.length > 0,
      details: buildGroupedDetails(depreciacaoRows),
    },
    {
      id: 12,
      label: 'Lucro líquido',
      value: lucroLiquido,
      type: 'result',
      sub: 'Resultado consolidado do período selecionado',
      sub2:
        receitaBruta > 0
          ? `Margem líquida de ${((lucroLiquido / receitaBruta) * 100).toFixed(1)}%`
          : 'Sem margem líquida calculável',
    },
  ]

  const resumo: DreResumo = {
    receitaBruta,
    lucroBruto: receitaLiquida,
    ebitda,
    lucroLiquido,
  }

  return { itens, resumo }
}

async function getUnitOptions(scopedUnitId: string | null) {
  const supabase = getAppSupabase()

  let query = supabase.from('unidades').select('id,nome').order('nome')
  if (scopedUnitId) {
    query = query.eq('id', scopedUnitId)
  }

  const { data, error } = await query
  if (error) return { data: [], error }

  return {
    data: scopedUnitId
      ? (data ?? []).map((item) => ({ value: String(item.id), label: String(item.nome) }))
      : [
          { value: 'todas', label: 'Todas as unidades' },
          ...(data ?? []).map((item) => ({ value: String(item.id), label: String(item.nome) })),
        ],
    error: null,
  }
}

function getCategoryOptions(rows: Array<{ categoria: string | null }>) {
  const categories = Array.from(
    new Set(rows.map((row) => String(row.categoria ?? '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))

  return [
    { value: 'todas', label: 'Todas as categorias' },
    ...categories.map((category) => ({ value: category, label: category })),
  ]
}

const ENUM_PERIODOS: ReadonlyArray<DreFiltersPayload['periodo']> = ['mensal', 'trimestral', 'anual']

function variacaoPct(a: number, b: number) {
  if (b === 0) return a === 0 ? 0 : 100
  return Number((((a - b) / Math.abs(b)) * 100).toFixed(2))
}

/**
 * Roda a DRE para UM período (query + categorização + buildDreItems) sem
 * persistir nada. Usado pelo período A e pelo período B do comparativo.
 */
async function computeDrePeriod(
  filters: DreFiltersPayload,
  unitId: string | null,
  range: { start: string; end: string; reference: string },
): Promise<{
  itens: DreItem[]
  resumo: DreResumo | null
  baseRows: LancamentoRow[]
  error: PostgrestError | null
}> {
  const supabase = getAppSupabase()

  let query = supabase
    .from('financeiro_lancamentos')
    .select('descricao,categoria,valor,tipo,categoria_dre')
    .gte('data_lancamento', range.start)
    .lt('data_lancamento', range.end)

  if (unitId) {
    query = query.eq('unidade_id', unitId)
  }

  const { data, error } = await query
  if (error) return { itens: [], resumo: null, baseRows: [], error }

  const baseRows = (data ?? []) as LancamentoRow[]
  const rows = baseRows.filter((row) => {
    const descricao = String(row.descricao ?? '')
    const categoria = String(row.categoria ?? '')
    const tipo = String(row.tipo ?? '').toLowerCase()
    const matchesBusca =
      filters.busca === '' ||
      categoria.toLowerCase().includes(filters.busca.toLowerCase()) ||
      descricao.toLowerCase().includes(filters.busca.toLowerCase())
    const matchesTipo = filters.tipo === 'todos' || tipo === filters.tipo
    const matchesCategoria = filters.categoria === 'todas' || categoria === filters.categoria
    return matchesBusca && matchesTipo && matchesCategoria
  })
  const receitas = rows.filter((row) => String(row.tipo ?? '').toLowerCase() === 'receita')
  const despesas = rows.filter((row) => String(row.tipo ?? '').toLowerCase() === 'despesa')

  // Deduções: descontos concedidos em prescricoes (data_prescricao no período).
  // prescricoes não tem unidade_id direto — filtramos por data e respeitamos o
  // filtro de tipo do DRE (descontos só entram quando tipo='todos' ou 'despesa').
  const startDate = range.start.slice(0, 10)
  const endDate = range.end.slice(0, 10)
  let deducoesPrescricoes: DescontoRow[] = []
  if (filters.tipo !== 'receita') {
    const { data: descData, error: descError } = await supabase
      .from('prescricoes')
      .select('numero,desconto_valor,data_prescricao')
      .gte('data_prescricao', startDate)
      .lt('data_prescricao', endDate)
      .gt('desconto_valor', 0)
    if (descError) return { itens: [], resumo: null, baseRows, error: descError }
    deducoesPrescricoes = (descData ?? [])
      .map((row) => ({
        categoria: `Desconto · ${String(row.numero ?? '')}`.trim(),
        valor: Number(row.desconto_valor ?? 0),
      }))
      .filter((row) => Number(row.valor) > 0)
  }

  // Custos variáveis: prescricao_itens × produtos_estoque.preco_custo.
  // produtos_estoque.preco_custo existe (migration 016); prescricao_itens não tem
  // a coluna preco_custo direto, então buscamos via produto_id.
  let custosVariaveisProdutos: CustoVariavelRow[] = []
  if (filters.tipo !== 'receita') {
    const { data: itemsData, error: itemsError } = await supabase
      .from('prescricao_itens')
      .select(
        'descricao,quantidade,produto:produtos_estoque(preco_custo),prescricao:prescricoes!inner(data_prescricao)',
      )
      .gte('prescricao.data_prescricao', startDate)
      .lt('prescricao.data_prescricao', endDate)
    if (itemsError) return { itens: [], resumo: null, baseRows, error: itemsError }
    custosVariaveisProdutos = (itemsData ?? [])
      .map((row) => {
        const produto = row.produto as { preco_custo?: number | string | null } | null
        const precoCusto = Number(produto?.preco_custo ?? 0)
        const quantidade = Number(row.quantidade ?? 0)
        return {
          descricao: String(row.descricao ?? 'Sem produto'),
          valor: precoCusto > 0 && quantidade > 0 ? precoCusto * quantidade : 0,
        }
      })
      .filter((row) => row.valor > 0)
  }

  const { itens, resumo } = buildDreItems(receitas, despesas, deducoesPrescricoes, custosVariaveisProdutos)
  return { itens, resumo, baseRows, error: null }
}

async function buildSnapshot(
  session: NonNullable<Awaited<ReturnType<typeof getRequestAuth>>>,
  filters: DreFiltersPayload,
  scopedUnitId: string | null,
): Promise<{
  snapshot: {
    id: string
    periodType: DreFiltersPayload['periodo']
    reference: string
    title: string
    resumo: DreResumo
    items: DreItem[]
    filters: Record<string, unknown>
    generatedAt: string
    updatedAt: string
  } | null
  comparativo: DreComparativoResponse | null
  categoryOptions: Array<{ value: string; label: string }>
  error: PostgrestError | null
}> {
  const supabase = getAppSupabase()
  const unitId = scopedUnitId ?? (filters.unidade !== 'todas' ? filters.unidade : null)
  const range = resolveRange(filters)

  const periodA = await computeDrePeriod(filters, unitId, range)
  if (periodA.error || !periodA.resumo) {
    return { snapshot: null, comparativo: null, categoryOptions: [], error: periodA.error }
  }
  const { itens, baseRows } = periodA
  const resumo = periodA.resumo

  const unidadeLabel = unitId
    ? (await supabase.from('unidades').select('nome').eq('id', unitId).maybeSingle()).data?.nome ?? 'Unidade'
    : 'Todas as unidades'

  const titulo = `DRE ${filters.periodo} ${range.reference}`
  const filtros = {
    ...filters,
    unidadeLabel,
    periodoLabel: filters.periodo,
    totalLancamentos: baseRows.length,
  }

  // Modo comparativo (4.2): roda a DRE para o período B sem persistir snapshot.
  let comparativo: DreComparativoResponse | null = null
  if (filters.comparar || (filters.comparar_de && filters.comparar_ate)) {
    const filtersB: DreFiltersPayload = {
      ...filters,
      mesAno: filters.comparar ?? filters.mesAno,
      de: filters.comparar_de,
      ate: filters.comparar_ate,
      comparar: undefined,
      comparar_de: undefined,
      comparar_ate: undefined,
    }
    const rangeB = resolveRange(filtersB)
    const periodB = await computeDrePeriod(filtersB, unitId, rangeB)
    if (periodB.error || !periodB.resumo) {
      return { snapshot: null, comparativo: null, categoryOptions: [], error: periodB.error }
    }
    const resumoB = periodB.resumo
    comparativo = {
      periodoA: { label: range.reference, resumo, items: itens },
      periodoB: { label: rangeB.reference, resumo: resumoB, items: periodB.itens },
      variacao: {
        receitaBruta: variacaoPct(resumo.receitaBruta, resumoB.receitaBruta),
        lucroLiquido: variacaoPct(resumo.lucroLiquido, resumoB.lucroLiquido),
      },
    }
  }

  // 'diario' (e range custom de/ate) NÃO é persistível: dre_demonstrativos
  // .periodo_tipo é o enum dre_periodo_tipo ('mensal','trimestral','anual') e
  // a spec proíbe alterar essa tabela. Devolvemos um snapshot vivo (não salvo).
  const persistivel = ENUM_PERIODOS.includes(filters.periodo) && !(filters.de && filters.ate)
  if (!persistivel) {
    const generatedAt = new Date().toISOString()
    return {
      snapshot: {
        id: '',
        periodType: filters.periodo,
        reference: range.reference,
        title: titulo,
        resumo,
        items: itens,
        filters: filtros as Record<string, unknown>,
        generatedAt,
        updatedAt: generatedAt,
      },
      comparativo,
      categoryOptions: getCategoryOptions(baseRows),
      error: null,
    }
  }

  const payload = {
    unidade_id: unitId,
    gerado_por_id: session.userId,
    periodo_tipo: filters.periodo,
    referencia: range.reference,
    visao: filters.visao,
    titulo,
    resumo,
    itens,
    filtros,
    gerado_em: new Date().toISOString(),
  }

  const existingQuery = supabase
    .from('dre_demonstrativos')
    .select('id')
    .eq('periodo_tipo', filters.periodo)
    .eq('referencia', range.reference)
    .eq('visao', filters.visao)

  const { data: existing, error: existingError } = await (unitId
    ? existingQuery.eq('unidade_id', unitId).maybeSingle()
    : existingQuery.is('unidade_id', null).maybeSingle())

  if (existingError) {
    return { snapshot: null, comparativo: null, categoryOptions: [], error: existingError }
  }

  const writeResult = existing?.id
    ? await supabase.from('dre_demonstrativos').update(payload).eq('id', String(existing.id))
    : await supabase.from('dre_demonstrativos').insert(payload)

  if (writeResult.error) {
    return { snapshot: null, comparativo: null, categoryOptions: [], error: writeResult.error }
  }

  const latestQuery = supabase
    .from('dre_demonstrativos')
    .select('id,unidade_id,periodo_tipo,referencia,visao,titulo,resumo,itens,filtros,gerado_em,updated_at')
    .eq('periodo_tipo', filters.periodo)
    .eq('referencia', range.reference)
    .eq('visao', filters.visao)

  const { data: snapshotData, error: snapshotError } = await (unitId
    ? latestQuery.eq('unidade_id', unitId).maybeSingle()
    : latestQuery.is('unidade_id', null).maybeSingle())

  if (snapshotError) {
    return { snapshot: null, comparativo: null, categoryOptions: [], error: snapshotError }
  }

  return {
    snapshot: {
      id: String(snapshotData?.id ?? ''),
      periodType: filters.periodo,
      reference: range.reference,
      title: String(snapshotData?.titulo ?? titulo),
      resumo: (snapshotData?.resumo ?? resumo) as DreResumo,
      items: ((snapshotData?.itens ?? itens) as DreItem[]),
      filters: (snapshotData?.filtros ?? payload.filtros) as Record<string, unknown>,
      generatedAt: String(snapshotData?.gerado_em ?? payload.gerado_em),
      updatedAt: String(snapshotData?.updated_at ?? payload.gerado_em),
    },
    comparativo,
    categoryOptions: getCategoryOptions(baseRows),
    error: null,
  }
}

async function handleRequest(
  request: NextRequest,
  session: NonNullable<Awaited<ReturnType<typeof getRequestAuth>>>,
  body?: Partial<DreFiltersPayload> | null,
) {
  if (session.role === 'paciente') {
    return serverErrorResponse('Acesso negado', 'FORBIDDEN', 403)
  }

  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao carregar a DRE')
  }

  const filters = normalizeFilters(request, body)
  const unitOptionsResult = await getUnitOptions(scopedUnit.unidadeId)
  if (unitOptionsResult.error) {
    return supabaseErrorResponse(unitOptionsResult.error, 'Falha ao carregar unidades da DRE')
  }

  const snapshotResult = await buildSnapshot(session, filters, scopedUnit.unidadeId)
  if (snapshotResult.error) {
    return supabaseErrorResponse(snapshotResult.error, 'Falha ao gerar a DRE')
  }

  return NextResponse.json({
    data: snapshotResult.snapshot,
    comparativo: snapshotResult.comparativo ?? null,
    meta: {
      ...session,
      unitOptions: unitOptionsResult.data,
      categoryOptions: snapshotResult.categoryOptions,
      scopedUnitId: scopedUnit.unidadeId,
    },
  })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'relatorios', 'read')
  if (denied) return denied

  return handleRequest(request, session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'relatorios', 'read')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Partial<DreFiltersPayload> | null
  return handleRequest(request, session, body)
}
