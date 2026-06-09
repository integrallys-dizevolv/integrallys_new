import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export interface RelatorioMovimentacaoItem {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  produto: string
  quantidade: number
  precoCusto: number | null
  operador: string | null
  vinculoTipo: string | null
  vinculoNome: string | null
  observacao: string | null
}

export interface CurvaAbcItem {
  produtoId: string
  produtoNome: string
  categoria: string
  quantidadeSaida: number
  valorConsumido: number
  percentualAcumulado: number
  classe: 'A' | 'B' | 'C'
  taxaGiro: number
  estoqueAtual: number
  valorEstoque: number
}

async function listCurvaAbc(request: NextRequest) {
  const url = new URL(request.url)
  const diasParam = Number(url.searchParams.get('dias') ?? '90')
  const dias = Number.isFinite(diasParam) && diasParam > 0 && diasParam <= 730 ? Math.floor(diasParam) : 90

  const supabase = getAppSupabase()
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - dias)
  const inicioIso = inicio.toISOString()
  const hojeIso = hoje.toISOString()

  const { data: produtosRows, error: produtosError } = await supabase
    .from('produtos_estoque')
    .select('id,nome,categoria,quantidade,preco_custo')

  if (produtosError) return supabaseErrorResponse(produtosError, 'Falha ao carregar produtos')

  const produtosMap = new Map<
    string,
    { id: string; nome: string; categoria: string; quantidade: number; precoCusto: number }
  >()
  for (const row of produtosRows ?? []) {
    produtosMap.set(String(row.id), {
      id: String(row.id),
      nome: String(row.nome ?? ''),
      categoria: String(row.categoria ?? ''),
      quantidade: Number(row.quantidade ?? 0),
      precoCusto: Number(row.preco_custo ?? 0),
    })
  }

  const { data: saidasRows, error: saidasError } = await supabase
    .from('movimentacoes_estoque')
    .select('produto_id,quantidade,tipo,tipo_movimentacao,created_at')
    .in('tipo_movimentacao', ['saida', 'consumo_interno'])
    .gte('created_at', inicioIso)
    .lte('created_at', hojeIso)
    .limit(20000)

  if (saidasError) return supabaseErrorResponse(saidasError, 'Falha ao carregar movimentações para Curva ABC')

  const consumosPorProduto = new Map<string, number>()
  const ultimaSaidaPorProduto = new Map<string, string>()
  for (const row of saidasRows ?? []) {
    const produtoId = String(row.produto_id ?? '')
    if (!produtoId) continue
    const qty = Number(row.quantidade ?? 0)
    consumosPorProduto.set(produtoId, (consumosPorProduto.get(produtoId) ?? 0) + qty)
    const createdAt = row.created_at ? String(row.created_at) : ''
    const prev = ultimaSaidaPorProduto.get(produtoId)
    if (!prev || createdAt > prev) ultimaSaidaPorProduto.set(produtoId, createdAt)
  }

  const computed = Array.from(produtosMap.values()).map((produto) => {
    const quantidadeSaida = consumosPorProduto.get(produto.id) ?? 0
    const valorConsumido = quantidadeSaida * produto.precoCusto
    const estoqueAtual = produto.quantidade
    const valorEstoque = estoqueAtual * produto.precoCusto
    const estoqueMedio = (estoqueAtual + quantidadeSaida + estoqueAtual) / 2
    const taxaGiro = estoqueMedio > 0 ? quantidadeSaida / estoqueMedio : 0
    return {
      produto,
      quantidadeSaida,
      valorConsumido,
      estoqueAtual,
      valorEstoque,
      taxaGiro,
    }
  })

  const comConsumo = computed
    .filter((row) => row.valorConsumido > 0)
    .sort((a, b) => b.valorConsumido - a.valorConsumido)

  const totalConsumo = comConsumo.reduce((acc, row) => acc + row.valorConsumido, 0)
  let acumulado = 0
  const curvaAbc: CurvaAbcItem[] = comConsumo.map((row) => {
    acumulado += row.valorConsumido
    const percentualAcumulado = totalConsumo > 0 ? (acumulado / totalConsumo) * 100 : 0
    const classe: 'A' | 'B' | 'C' = percentualAcumulado <= 80 ? 'A' : percentualAcumulado <= 95 ? 'B' : 'C'
    return {
      produtoId: row.produto.id,
      produtoNome: row.produto.nome,
      categoria: row.produto.categoria,
      quantidadeSaida: row.quantidadeSaida,
      valorConsumido: Number(row.valorConsumido.toFixed(2)),
      percentualAcumulado: Number(percentualAcumulado.toFixed(2)),
      classe,
      taxaGiro: Number(row.taxaGiro.toFixed(2)),
      estoqueAtual: row.estoqueAtual,
      valorEstoque: Number(row.valorEstoque.toFixed(2)),
    }
  })

  const semMovimentacao = computed
    .filter((row) => row.quantidadeSaida === 0)
    .map((row) => {
      const ultima = ultimaSaidaPorProduto.get(row.produto.id)
      const diasSemMovimento = ultima
        ? Math.max(dias, Math.floor((hoje.getTime() - new Date(ultima).getTime()) / (1000 * 60 * 60 * 24)))
        : dias
      return {
        produtoId: row.produto.id,
        produtoNome: row.produto.nome,
        diasSemMovimento,
      }
    })
    .sort((a, b) => b.diasSemMovimento - a.diasSemMovimento)
    .slice(0, 50)

  const valorTotalEstoque = computed.reduce((acc, row) => acc + row.valorEstoque, 0)

  return NextResponse.json({
    curvaAbc,
    semMovimentacao,
    valorTotalEstoque: Number(valorTotalEstoque.toFixed(2)),
    diasAnalisados: dias,
  })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'relatorios', 'read')
  if (denied) return denied

  const url = new URL(request.url)
  if (url.searchParams.get('view') === 'curva-abc') {
    return listCurvaAbc(request)
  }

  const tipoFilter = url.searchParams.get('tipo')
  const tipoMovimentacaoFilter = url.searchParams.get('tipoMovimentacao')
  const dataInicio = url.searchParams.get('inicio')
  const dataFim = url.searchParams.get('fim')
  const produtoBusca = url.searchParams.get('q') || ''

  const supabase = getAppSupabase()

  let query = supabase
    .from('movimentacoes_estoque')
    .select(
      'id,tipo,tipo_movimentacao,quantidade,created_at,observacoes,vinculo_tipo,vinculo_nome,produto:produtos_estoque(nome,preco_custo),operador:usuarios!usuario_id(nome)',
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (tipoFilter === 'entrada' || tipoFilter === 'saida') {
    query = query.eq('tipo', tipoFilter)
  }
  if (
    tipoMovimentacaoFilter === 'entrada' ||
    tipoMovimentacaoFilter === 'saida' ||
    tipoMovimentacaoFilter === 'consumo_interno'
  ) {
    query = query.eq('tipo_movimentacao', tipoMovimentacaoFilter)
  }
  if (dataInicio) query = query.gte('created_at', dataInicio)
  if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`)

  const { data, error } = await query
  if (error) return supabaseErrorResponse(error, 'Falha ao carregar movimentações de estoque')

  type Row = {
    id: string
    tipo: string
    quantidade: number | string | null
    created_at: string | null
    observacoes: string | null
    vinculo_tipo: string | null
    vinculo_nome: string | null
    produto: { nome: string | null; preco_custo: number | string | null } | null
    operador: { nome: string | null } | null
  }

  const itens: RelatorioMovimentacaoItem[] = (data ?? [])
    .map((row): RelatorioMovimentacaoItem => {
      const r = row as unknown as Row
      return {
        id: String(r.id),
        data: String(r.created_at ?? ''),
        tipo: r.tipo === 'entrada' ? 'entrada' : 'saida',
        produto: String(r.produto?.nome ?? '—'),
        quantidade: Number(r.quantidade ?? 0),
        precoCusto: r.produto?.preco_custo != null ? Number(r.produto.preco_custo) : null,
        operador: r.operador?.nome ?? null,
        vinculoTipo: r.vinculo_tipo,
        vinculoNome: r.vinculo_nome,
        observacao: r.observacoes,
      }
    })
    .filter((row) => {
      if (!produtoBusca) return true
      const term = produtoBusca.toLowerCase()
      return (
        row.produto.toLowerCase().includes(term) ||
        (row.vinculoNome ?? '').toLowerCase().includes(term)
      )
    })

  const totalEntradas = itens
    .filter((row) => row.tipo === 'entrada')
    .reduce((acc, row) => acc + row.quantidade, 0)
  const totalSaidas = itens
    .filter((row) => row.tipo === 'saida')
    .reduce((acc, row) => acc + row.quantidade, 0)

  return NextResponse.json({
    data: itens,
    meta: { ...session, totalEntradas, totalSaidas },
  })
}
