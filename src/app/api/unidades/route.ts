import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapUnidadeItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

type UnidadeBody = Record<string, unknown>

async function listUnidades(request: NextRequest, session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('unidades')
    .select('id,nome,cidade,status,cnpj,endereco,gestor_nome')
    .order('nome', { ascending: true })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar unidades')
  }

  return NextResponse.json({ data: (data ?? []).map((row) => mapUnidadeItem(row)), meta: session })
}

function validateUnidade(body: UnidadeBody) {
  const nome = String(body.nome ?? '').trim()
  const cidade = String(body.cidade ?? '').trim()

  if (!nome || !cidade) {
    return { error: serverErrorResponse('Nome e cidade são obrigatórios', 'UNIT_REQUIRED_FIELDS', 400) }
  }

  return {
    payload: {
      nome,
      cidade,
      cnpj: body.cnpj ? String(body.cnpj).trim() : null,
      endereco: body.endereco ? String(body.endereco).trim() : null,
      gestor_nome: body.gestor ? String(body.gestor).trim() : null,
      status: body.status ? String(body.status).trim() : 'Ativa',
    },
  }
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'unidades', 'read')
  if (denied) return denied
  return listUnidades(request, session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'unidades', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as UnidadeBody | null
  if (!body) return serverErrorResponse('Payload inválido', 'INVALID_PAYLOAD', 400)

  const validated = validateUnidade(body)
  if ('error' in validated) return validated.error

  const supabase = getAppSupabase()
  const { error } = await supabase.from('unidades').insert(validated.payload)
  if (error) return supabaseErrorResponse(error, 'Falha ao criar unidade')

  return listUnidades(request, session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'unidades', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as UnidadeBody | null
  if (!body) return serverErrorResponse('Payload inválido', 'INVALID_PAYLOAD', 400)

  const id = String(body.id ?? '').trim()
  if (!id) return serverErrorResponse('Unidade não informada', 'UNIT_ID_REQUIRED', 400)

  const validated = validateUnidade(body)
  if ('error' in validated) return validated.error

  const supabase = getAppSupabase()
  const { error } = await supabase.from('unidades').update(validated.payload).eq('id', id)
  if (error) return supabaseErrorResponse(error, 'Falha ao atualizar unidade')

  return listUnidades(request, session)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'unidades', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as UnidadeBody | null
  const id = String(body?.id ?? '').trim()
  if (!id) return serverErrorResponse('Unidade não informada', 'UNIT_ID_REQUIRED', 400)

  const supabase = getAppSupabase()
  const { error } = await supabase.from('unidades').delete().eq('id', id)
  if (error) return supabaseErrorResponse(error, 'Falha ao excluir unidade')

  return listUnidades(request, session)
}
