import { type NextRequest, NextResponse } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapFormaPagamentoItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

// Item 9a — catálogo de formas de pagamento. Recurso reaproveitado: 'financeiro'.
export const FORMA_TIPOS_VALIDOS = [
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'transferencia',
  'outro',
]

async function listFormas(session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('formas_pagamento')
    .select('id,nome,tipo,cartao_id,ativo')
    .order('nome', { ascending: true })

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar formas de pagamento')

  return NextResponse.json({
    data: (data ?? []).map((row) => mapFormaPagamentoItem(row)),
    meta: session,
  })
}

function validateForma(body: Record<string, unknown>) {
  const nome = String(body.nome ?? '').trim()
  const tipoRaw = String(body.tipo ?? '')
    .trim()
    .toLowerCase()
  const tipo = FORMA_TIPOS_VALIDOS.includes(tipoRaw) ? tipoRaw : ''

  if (!nome) return { error: serverErrorResponse('Nome é obrigatório', 'FORMA_NOME_REQUIRED', 400) }
  if (!tipo) return { error: serverErrorResponse('Tipo inválido', 'FORMA_TIPO_INVALID', 400) }

  return { payload: { nome, tipo, ativo: body.ativo !== false } }
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'read')
  if (denied) return denied
  return listFormas(session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return serverErrorResponse('Payload inválido', 'INVALID_PAYLOAD', 400)

  const validated = validateForma(body)
  if ('error' in validated) return validated.error

  const supabase = getAppSupabase()
  const { error } = await supabase.from('formas_pagamento').insert(validated.payload)
  if (error) return supabaseErrorResponse(error, 'Falha ao criar forma de pagamento')

  return listFormas(session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return serverErrorResponse('Payload inválido', 'INVALID_PAYLOAD', 400)

  const id = String(body.id ?? '').trim()
  if (!id) return serverErrorResponse('Forma não informada', 'FORMA_ID_REQUIRED', 400)

  const validated = validateForma(body)
  if ('error' in validated) return validated.error

  const supabase = getAppSupabase()
  const { error } = await supabase
    .from('formas_pagamento')
    .update({ ...validated.payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return supabaseErrorResponse(error, 'Falha ao atualizar forma de pagamento')

  return listFormas(session)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const id = String(body?.id ?? '').trim()
  if (!id) return serverErrorResponse('Forma não informada', 'FORMA_ID_REQUIRED', 400)

  // Soft-delete (ativo=false): lançamentos históricos podem referenciar a forma.
  const supabase = getAppSupabase()
  const { error } = await supabase
    .from('formas_pagamento')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return supabaseErrorResponse(error, 'Falha ao remover forma de pagamento')

  return listFormas(session)
}
