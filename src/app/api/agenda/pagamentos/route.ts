import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'agenda', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const agendamentoId =
    typeof body?.agendamentoId === 'string' && body.agendamentoId.trim().length > 0
      ? body.agendamentoId.trim()
      : null
  const valor = Number(body?.valor)
  const metodo =
    typeof body?.metodo === 'string' && body.metodo.trim().length > 0 ? body.metodo.trim() : null
  const observacoes =
    typeof body?.observacoes === 'string' && body.observacoes.trim().length > 0
      ? body.observacoes.trim()
      : null

  if (!agendamentoId) {
    return serverErrorResponse('agendamentoId obrigatório', 'INVALID_AGENDAMENTO', 400)
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    return serverErrorResponse('Valor inválido', 'INVALID_VALOR', 400)
  }
  if (!metodo) {
    return serverErrorResponse('Método de pagamento obrigatório', 'INVALID_METODO', 400)
  }

  const supabase = getAppSupabase()
  const { data: agendamento, error: agError } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('id', agendamentoId)
    .maybeSingle()

  if (agError) {
    return supabaseErrorResponse(agError, 'Falha ao validar agendamento')
  }
  if (!agendamento?.id) {
    return serverErrorResponse('Agendamento não encontrado', 'AGENDAMENTO_NOT_FOUND', 404)
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('agendamentos_pagamentos').insert({
    agendamento_id: agendamentoId,
    valor,
    metodo,
    status: 'Pago',
    pago_em: now,
    observacoes,
  })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao registrar pagamento')
  }

  return NextResponse.json({ ok: true })
}
