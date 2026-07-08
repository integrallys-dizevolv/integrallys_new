import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapFinanceiroItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

async function listFinanceiro(session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao carregar financeiro')
  }

  let query = supabase
    .from('financeiro_lancamentos')
    .select('id,descricao,categoria,valor,tipo,data_lancamento,metodo,status,observacoes,created_at,unidade_id')
    .order('data_lancamento', { ascending: false })

  if (scopedUnit.unidadeId) {
    query = query.eq('unidade_id', scopedUnit.unidadeId)
  }

  const { data, error } = await query

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar financeiro')
  }

  return NextResponse.json({ data: (data ?? []).map((row) => mapFinanceiroItem(row)), meta: session })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'read')
  if (denied) return denied

  return listFinanceiro(session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.descricao || !body?.categoria || typeof body.valor !== 'number' || !body?.tipo) {
    return serverErrorResponse('Lançamento inválido', 'INVALID_FINANCEIRO_INPUT', 400)
  }

  if (body.valor <= 0) {
    return serverErrorResponse('Valor inválido para lançamento', 'INVALID_FINANCEIRO_VALUE', 400)
  }

  const tipo = body.tipo === 'despesa' ? 'despesa' : 'receita'
  const dataLancamento =
    typeof body.data === 'string' && body.data.trim() !== ''
      ? new Date(body.data).toISOString()
      : new Date().toISOString()
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao salvar lançamento financeiro')
  }

  const supabase = getAppSupabase()
  const { error } = await supabase.from('financeiro_lancamentos').insert({
    unidade_id: scopedUnit.unidadeId ?? body.unidadeId ?? null,
    usuario_id: session.userId,
    descricao: body.descricao,
    categoria: body.categoria,
    valor: body.valor,
    tipo,
    data_lancamento: dataLancamento,
    competencia: dataLancamento.slice(0, 10),
    metodo: body.metodo ?? null,
    status: 'Pendente',
    observacoes: body.observacoes ?? null,
  })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao salvar lançamento financeiro')
  }

  return listFinanceiro(session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id || !body?.descricao || !body?.categoria || typeof body.valor !== 'number' || !body?.tipo) {
    return serverErrorResponse('Lançamento inválido', 'INVALID_FINANCEIRO_INPUT', 400)
  }

  if (body.valor <= 0) {
    return serverErrorResponse('Valor inválido para lançamento', 'INVALID_FINANCEIRO_VALUE', 400)
  }

  const tipo = body.tipo === 'despesa' ? 'despesa' : 'receita'
  const dataLancamento =
    typeof body.data === 'string' && body.data.trim() !== ''
      ? new Date(body.data).toISOString()
      : new Date().toISOString()
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao atualizar lançamento financeiro')
  }

  const supabase = getAppSupabase()
  let updateQuery = supabase
    .from('financeiro_lancamentos')
    .update({
      unidade_id: scopedUnit.unidadeId ?? body.unidadeId ?? null,
      descricao: body.descricao,
      categoria: body.categoria,
      valor: body.valor,
      tipo,
      data_lancamento: dataLancamento,
      competencia: dataLancamento.slice(0, 10),
      metodo: body.metodo ?? null,
      status: body.status ?? 'Pendente',
      observacoes: body.observacoes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(body.id))

  if (scopedUnit.unidadeId) {
    updateQuery = updateQuery.eq('unidade_id', scopedUnit.unidadeId)
  }

  const { error } = await updateQuery

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao atualizar lançamento financeiro')
  }

  return listFinanceiro(session)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id) {
    return serverErrorResponse('Lançamento inválido', 'INVALID_FINANCEIRO_INPUT', 400)
  }

  const supabase = getAppSupabase()
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao excluir lançamento financeiro')
  }

  let deleteQuery = supabase.from('financeiro_lancamentos').delete().eq('id', String(body.id))
  if (scopedUnit.unidadeId) {
    deleteQuery = deleteQuery.eq('unidade_id', scopedUnit.unidadeId)
  }

  const { error } = await deleteQuery

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao excluir lançamento financeiro')
  }

  return listFinanceiro(session)
}
