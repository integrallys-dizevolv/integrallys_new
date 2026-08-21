import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { isFinanciallyRestrictedRole } from '@/lib/financial-sanitize'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

/**
 * Relatório comparativo lado a lado entre unidades (cláusula 3 · Módulo 7).
 */
export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'relatorios', 'read')
  if (denied) return denied

  const url = request.nextUrl
  const dias = Math.min(365, Math.max(1, Number(url.searchParams.get('dias') ?? '30') || 30))
  const since = new Date()
  since.setDate(since.getDate() - dias)
  const sinceIso = since.toISOString().slice(0, 10)
  const todayIso = new Date().toISOString().slice(0, 10)

  const supabase = getAppSupabase()
  const scoped = await getScopedUnitId(session)
  if (scoped.error) return supabaseErrorResponse(scoped.error, 'Falha ao carregar comparativo')

  // Perfis de unidade única veem só a própria; master/admin veem todas.
  let unidadesQuery = supabase.from('unidades').select('id,nome').eq('ativo', true).order('nome')
  if (scoped.unidadeId && !['master', 'admin'].includes(session.role)) {
    unidadesQuery = unidadesQuery.eq('id', scoped.unidadeId)
  }

  const { data: unidades, error: unidadesError } = await unidadesQuery
  if (unidadesError) return supabaseErrorResponse(unidadesError, 'Falha ao carregar unidades')

  const hidePrices = isFinanciallyRestrictedRole(session.role)
  const rows: Array<{
    unidadeId: string
    unidadeNome: string
    agendamentos: number
    receita: number
    despesa: number
    ticketMedio: number
  }> = []

  for (const unidade of unidades ?? []) {
    const unidadeId = String(unidade.id)
    const [agResult, finResult] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .eq('unidade_id', unidadeId)
        .gte('data_agendamento', sinceIso)
        .lte('data_agendamento', todayIso),
      supabase
        .from('financeiro_lancamentos')
        .select('tipo,valor')
        .eq('unidade_id', unidadeId)
        .gte('data_lancamento', `${sinceIso}T00:00:00.000Z`)
        .lte('data_lancamento', `${todayIso}T23:59:59.999Z`),
    ])

    if (agResult.error) return supabaseErrorResponse(agResult.error, 'Falha ao agregar agendamentos')
    if (finResult.error) return supabaseErrorResponse(finResult.error, 'Falha ao agregar financeiro')

    let receita = 0
    let despesa = 0
    for (const row of finResult.data ?? []) {
      const valor = Number(row.valor ?? 0)
      if (String(row.tipo).toLowerCase() === 'receita') receita += valor
      else despesa += valor
    }
    const agendamentos = agResult.count ?? 0
    rows.push({
      unidadeId,
      unidadeNome: String(unidade.nome ?? 'Unidade'),
      agendamentos,
      receita: hidePrices ? 0 : receita,
      despesa: hidePrices ? 0 : despesa,
      ticketMedio: hidePrices || agendamentos === 0 ? 0 : receita / agendamentos,
    })
  }

  rows.sort((a, b) => b.receita - a.receita || b.agendamentos - a.agendamentos)

  return NextResponse.json({
    data: rows,
    meta: { dias, valoresVisiveis: !hidePrices, de: sinceIso, ate: todayIso, ...session },
  })
}
