import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

interface OfxTransacaoInput {
  dataTransacao: string
  valor: number
  descricao: string | null
  tipo?: 'CREDIT' | 'DEBIT' | null
  fitid?: string | null
}

// Lista os movimentos (conciliacao_ofx) de uma conta — extrato detalhado.
export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'read')
  if (denied) return denied

  const contaId = new URL(request.url).searchParams.get('contaId')
  if (!contaId) return serverErrorResponse('Conta bancária obrigatória', 'CONTA_REQUIRED', 400)

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('conciliacao_ofx')
    .select('id,data_transacao,valor,descricao,tipo,conciliado,lancamento_id,created_at')
    .eq('conta_id', contaId)
    .order('data_transacao', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar movimentos da conta')
  return NextResponse.json({ data: data ?? [], meta: session })
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as {
    contaId?: string
    transacoes?: OfxTransacaoInput[]
  } | null
  if (!body || !Array.isArray(body.transacoes)) {
    return serverErrorResponse('Payload inválido', 'INVALID_PAYLOAD', 400)
  }
  if (!body.contaId) {
    return serverErrorResponse('Conta bancária obrigatória', 'CONTA_REQUIRED', 400)
  }

  const transacoes = body.transacoes.filter((t) => t && Number.isFinite(t.valor))
  if (transacoes.length === 0) {
    return serverErrorResponse('Nenhuma transação para importar', 'EMPTY_TRANSACTIONS', 400)
  }

  const supabase = getAppSupabase()

  // Dedup: para fitids que já existam nesta conta, ignoramos
  const fitids = transacoes
    .map((t) => t.fitid)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  let existingFitids = new Set<string>()
  if (fitids.length > 0) {
    const { data: existentes } = await supabase
      .from('conciliacao_ofx')
      .select('fitid')
      .eq('conta_id', body.contaId)
      .in('fitid', fitids)
    existingFitids = new Set((existentes ?? []).map((row) => String(row.fitid)))
  }

  const novas = transacoes.filter((t) => !t.fitid || !existingFitids.has(t.fitid))
  const duplicadas = transacoes.length - novas.length

  if (novas.length === 0) {
    return NextResponse.json(
      {
        data: [],
        meta: {
          ...session,
          ignoradas: duplicadas,
          motivo: 'Todas as transações já foram importadas',
        },
      },
      { status: 200 },
    )
  }

  const inserts = novas.map((t) => ({
    conta_id: body.contaId,
    data_transacao: t.dataTransacao || null,
    valor: Number(t.valor),
    descricao: t.descricao ?? null,
    tipo: t.tipo === 'CREDIT' || t.tipo === 'DEBIT' ? t.tipo : null,
    fitid: t.fitid || null,
    conciliado: false,
  }))

  const { data, error } = await supabase
    .from('conciliacao_ofx')
    .insert(inserts)
    .select('id,conta_id,data_transacao,valor,descricao,tipo,fitid,conciliado,created_at')

  if (error) return supabaseErrorResponse(error, 'Falha ao importar transações OFX')

  return NextResponse.json(
    {
      data: data ?? [],
      meta: { ...session, ignoradas: duplicadas },
    },
    { status: 201 },
  )
}
