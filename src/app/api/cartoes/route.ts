import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

type CartaoRow = {
  id: string
  unidade_id: string | null
  nome: string
  bandeira: string | null
  ultimos_digitos: string | null
  limite_total: number | null
  dia_vencimento: number | null
  ativo: boolean | null
  created_at: string | null
  updated_at: string | null
}

type MovimentoRow = {
  id: string
  cartao_id: string
  descricao: string
  valor: number | null
  parcelas: number | null
  parcela_atual: number | null
  data_compra: string | null
  data_vencimento: string | null
  beneficiario: string | null
  categoria: string | null
  operador_id: string | null
  created_at: string | null
}

type LancamentoRow = {
  id: string
  valor: number | null
  metodo: string | null
  data_lancamento: string | null
  tipo: string | null
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthStartIso(): string {
  return `${todayIso().slice(0, 7)}-01`
}

function mapCartao(row: CartaoRow, movimentos: MovimentoRow[]) {
  const limiteTotal = Number(row.limite_total ?? 0)
  const hoje = todayIso()

  const utilizado = movimentos
    .filter((mov) => !mov.data_vencimento || mov.data_vencimento >= hoje)
    .reduce((sum, mov) => sum + Number(mov.valor ?? 0), 0)

  const faturasAbertas = movimentos
    .filter((mov) => mov.data_vencimento && mov.data_vencimento >= hoje)
    .reduce((sum, mov) => sum + Number(mov.valor ?? 0), 0)

  const proximoVencimento = movimentos
    .map((mov) => mov.data_vencimento)
    .filter((value): value is string => Boolean(value) && (value as string) >= hoje)
    .sort()[0] ?? null

  return {
    id: row.id,
    unidadeId: row.unidade_id,
    nome: row.nome,
    bandeira: row.bandeira,
    ultimosDigitos: row.ultimos_digitos,
    limiteTotal,
    diaVencimento: row.dia_vencimento,
    ativo: row.ativo ?? true,
    limiteUtilizado: Number(utilizado.toFixed(2)),
    limiteDisponivel: Number((limiteTotal - utilizado).toFixed(2)),
    faturasAbertas: Number(faturasAbertas.toFixed(2)),
    proximoVencimento,
    movimentos: movimentos.map((mov) => ({
      id: mov.id,
      cartaoId: mov.cartao_id,
      descricao: mov.descricao,
      valor: Number(mov.valor ?? 0),
      parcelas: mov.parcelas ?? 1,
      parcelaAtual: mov.parcela_atual ?? 1,
      dataCompra: mov.data_compra,
      dataVencimento: mov.data_vencimento,
      beneficiario: mov.beneficiario,
      categoria: mov.categoria,
      operadorId: mov.operador_id,
      createdAt: mov.created_at,
    })),
  }
}

function detectBandeira(metodo: string | null): { bandeira: string; tipo: 'credito' | 'debito' } {
  const value = (metodo ?? '').toLowerCase()
  const tipo: 'credito' | 'debito' = value.includes('débito') || value.includes('debito') ? 'debito' : 'credito'
  const match = value.match(/(visa|mastercard|elo|amex|hipercard)/)
  const bandeira = match ? match[1].toUpperCase() : 'OUTROS'
  return { bandeira, tipo }
}

async function listCartoes() {
  const supabase = getAppSupabase()

  const { data: cartoesRaw, error: cartoesError } = await supabase
    .from('cartoes_empresariais')
    .select('id,unidade_id,nome,bandeira,ultimos_digitos,limite_total,dia_vencimento,ativo,created_at,updated_at')
    .eq('ativo', true)
    .order('nome', { ascending: true })

  if (cartoesError) {
    return supabaseErrorResponse(cartoesError, 'Falha ao carregar cartões')
  }

  const cartoes = (cartoesRaw ?? []) as CartaoRow[]
  const cartaoIds = cartoes.map((row) => row.id)

  let movimentos: MovimentoRow[] = []
  if (cartaoIds.length > 0) {
    const { data: movRaw, error: movError } = await supabase
      .from('cartao_movimentos')
      .select('id,cartao_id,descricao,valor,parcelas,parcela_atual,data_compra,data_vencimento,beneficiario,categoria,operador_id,created_at')
      .in('cartao_id', cartaoIds)
      .order('data_compra', { ascending: false })

    if (movError) {
      return supabaseErrorResponse(movError, 'Falha ao carregar movimentos do cartão')
    }
    movimentos = (movRaw ?? []) as MovimentoRow[]
  }

  const movimentosByCartao = movimentos.reduce<Record<string, MovimentoRow[]>>((acc, mov) => {
    if (!acc[mov.cartao_id]) acc[mov.cartao_id] = []
    acc[mov.cartao_id].push(mov)
    return acc
  }, {})

  const cartoesPayload = cartoes.map((row) => mapCartao(row, movimentosByCartao[row.id] ?? []))

  const { data: lancamentosRaw, error: lancError } = await supabase
    .from('financeiro_lancamentos')
    .select('id,valor,metodo,data_lancamento,tipo')
    .eq('tipo', 'receita')
    .gte('data_lancamento', monthStartIso())
    .ilike('metodo', '%cart%')

  if (lancError) {
    return supabaseErrorResponse(lancError, 'Falha ao consolidar recebíveis')
  }

  const lancamentos = (lancamentosRaw ?? []) as LancamentoRow[]
  const breakdownMap = new Map<string, { bandeira: string; tipo: 'credito' | 'debito'; bruto: number; count: number }>()

  for (const lanc of lancamentos) {
    const { bandeira, tipo } = detectBandeira(lanc.metodo)
    const key = `${bandeira}|${tipo}`
    const existing = breakdownMap.get(key) ?? { bandeira, tipo, bruto: 0, count: 0 }
    existing.bruto += Number(lanc.valor ?? 0)
    existing.count += 1
    breakdownMap.set(key, existing)
  }

  const TAXA_DEBITO_DEFAULT = 1.99
  const TAXA_CREDITO_DEFAULT = 3.49

  const recebiveisConsolidado = Array.from(breakdownMap.values())
    .map((row) => {
      const taxa = row.tipo === 'debito' ? TAXA_DEBITO_DEFAULT : TAXA_CREDITO_DEFAULT
      const taxaValor = Number(((row.bruto * taxa) / 100).toFixed(2))
      const liquido = Number((row.bruto - taxaValor).toFixed(2))
      return {
        bandeira: row.bandeira,
        tipo: row.tipo,
        bruto: Number(row.bruto.toFixed(2)),
        taxa,
        taxaValor,
        liquido,
        quantidade: row.count,
      }
    })
    .sort((a, b) => {
      const tipoCmp = a.tipo.localeCompare(b.tipo)
      return tipoCmp !== 0 ? tipoCmp : a.bandeira.localeCompare(b.bandeira)
    })

  const totais = recebiveisConsolidado.reduce(
    (acc, row) => {
      if (row.tipo === 'credito') {
        acc.brutoCredito += row.bruto
        acc.liquidoCredito += row.liquido
      } else {
        acc.brutoDebito += row.bruto
        acc.liquidoDebito += row.liquido
      }
      return acc
    },
    { brutoCredito: 0, liquidoCredito: 0, brutoDebito: 0, liquidoDebito: 0 },
  )

  return NextResponse.json({
    cartoes: cartoesPayload,
    recebiveisConsolidado,
    totaisRecebiveis: {
      brutoCredito: Number(totais.brutoCredito.toFixed(2)),
      liquidoCredito: Number(totais.liquidoCredito.toFixed(2)),
      brutoDebito: Number(totais.brutoDebito.toFixed(2)),
      liquidoDebito: Number(totais.liquidoDebito.toFixed(2)),
    },
  })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'read')
  if (denied) return denied
  return listCartoes()
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.action) {
    return serverErrorResponse('Ação inválida', 'INVALID_CARTAO_ACTION', 400)
  }

  const supabase = getAppSupabase()

  if (body.action === 'criar_cartao') {
    if (!body.nome || typeof body.nome !== 'string') {
      return serverErrorResponse('Nome do cartão é obrigatório', 'INVALID_CARTAO_INPUT', 400)
    }
    const limiteTotal = typeof body.limiteTotal === 'number' ? body.limiteTotal : 0
    const diaVencimento =
      typeof body.diaVencimento === 'number' && body.diaVencimento >= 1 && body.diaVencimento <= 31
        ? Math.floor(body.diaVencimento)
        : null

    const { error } = await supabase.from('cartoes_empresariais').insert({
      unidade_id: typeof body.unidadeId === 'string' && body.unidadeId.length > 0 ? body.unidadeId : null,
      nome: body.nome.trim(),
      bandeira: typeof body.bandeira === 'string' && body.bandeira.length > 0 ? body.bandeira : null,
      ultimos_digitos:
        typeof body.ultimosDigitos === 'string' && body.ultimosDigitos.length > 0
          ? body.ultimosDigitos.replace(/\D/g, '').slice(-4)
          : null,
      limite_total: limiteTotal,
      dia_vencimento: diaVencimento,
    })

    if (error) {
      return supabaseErrorResponse(error, 'Falha ao criar cartão')
    }
    return listCartoes()
  }

  if (body.action === 'registrar_movimento') {
    if (!body.cartaoId || typeof body.cartaoId !== 'string') {
      return serverErrorResponse('Cartão inválido', 'INVALID_CARTAO_REF', 400)
    }
    if (!body.descricao || typeof body.descricao !== 'string') {
      return serverErrorResponse('Descrição do movimento é obrigatória', 'INVALID_CARTAO_MOV_INPUT', 400)
    }
    if (typeof body.valor !== 'number' || body.valor <= 0) {
      return serverErrorResponse('Valor inválido para movimento', 'INVALID_CARTAO_MOV_VALUE', 400)
    }
    const parcelas = typeof body.parcelas === 'number' ? Math.max(1, Math.min(24, Math.floor(body.parcelas))) : 1
    const dataCompra =
      typeof body.dataCompra === 'string' && body.dataCompra.length > 0 ? body.dataCompra : todayIso()

    const { data: cartaoRow, error: cartaoFetchError } = await supabase
      .from('cartoes_empresariais')
      .select('dia_vencimento')
      .eq('id', body.cartaoId)
      .maybeSingle()

    if (cartaoFetchError) {
      return supabaseErrorResponse(cartaoFetchError, 'Falha ao localizar cartão')
    }

    const diaVenc = cartaoRow?.dia_vencimento ?? null
    let dataVencimento: string | null = null
    if (diaVenc) {
      const ref = new Date(dataCompra)
      const venc = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, diaVenc))
      dataVencimento = venc.toISOString().slice(0, 10)
    }

    const { error } = await supabase.from('cartao_movimentos').insert({
      cartao_id: body.cartaoId,
      descricao: body.descricao.trim(),
      valor: body.valor,
      parcelas,
      parcela_atual: 1,
      data_compra: dataCompra,
      data_vencimento: dataVencimento,
      beneficiario: typeof body.beneficiario === 'string' && body.beneficiario.length > 0 ? body.beneficiario : null,
      categoria: typeof body.categoria === 'string' && body.categoria.length > 0 ? body.categoria : null,
      operador_id: session.userId,
    })

    if (error) {
      return supabaseErrorResponse(error, 'Falha ao registrar movimento')
    }
    return listCartoes()
  }

  return serverErrorResponse('Ação inválida', 'INVALID_CARTAO_ACTION', 400)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id || typeof body.id !== 'string') {
    return serverErrorResponse('Cartão inválido', 'INVALID_CARTAO_ID', 400)
  }

  const supabase = getAppSupabase()
  const { error } = await supabase
    .from('cartoes_empresariais')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', body.id)

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao desativar cartão')
  }

  return listCartoes()
}
