import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getEntityNameMap, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapTarefaItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

async function listTarefas(session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('tarefas')
    .select('id,titulo,responsavel_id,status')
    .order('created_at', { ascending: false })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar tarefas')
  }

  const { map, error: responsaveisError } = await getEntityNameMap(
    supabase,
    'usuarios',
    (data ?? []).map((row) => String(row.responsavel_id ?? '')),
  )

  if (responsaveisError) {
    return supabaseErrorResponse(responsaveisError, 'Falha ao carregar tarefas')
  }

  return NextResponse.json({
    data: (data ?? []).map((row) => mapTarefaItem({ ...row, responsavel_nome: map[String(row.responsavel_id ?? '')] ?? '' })),
    meta: session,
  })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'tarefas', 'read')
  if (denied) return denied
  return listTarefas(session)
}

async function resolveResponsavelId(
  supabase: ReturnType<typeof getAppSupabase>,
  responsavelId: unknown,
  responsavelNome: unknown,
) {
  if (typeof responsavelId === 'string' && responsavelId.trim()) {
    return responsavelId
  }

  if (typeof responsavelNome === 'string' && responsavelNome.trim()) {
    const { data } = await supabase
      .from('usuarios')
      .select('id')
      .eq('nome', responsavelNome.trim())
      .maybeSingle()

    return data?.id ?? null
  }

  return null
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'tarefas', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.titulo) {
    return serverErrorResponse('Tarefa inválida', 'INVALID_TASK_INPUT', 400)
  }

  const supabase = getAppSupabase()
  const responsavelId = await resolveResponsavelId(supabase, body.responsavelId, body.responsavelNome)
  const vencimentoEm =
    typeof body.vencimentoEm === 'string' && body.vencimentoEm.trim()
      ? new Date(body.vencimentoEm).toISOString()
      : null

  const { error } = await supabase.from('tarefas').insert({
    titulo: String(body.titulo),
    descricao: typeof body.descricao === 'string' && body.descricao.trim() ? body.descricao : null,
    responsavel_id: responsavelId,
    status: typeof body.status === 'string' && body.status.trim() ? body.status : 'Pendente',
    vencimento_em: vencimentoEm,
    created_by_id: session.userId,
  })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao criar tarefa')
  }

  return listTarefas(session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'tarefas', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id || !body?.titulo) {
    return serverErrorResponse('Tarefa inválida', 'INVALID_TASK_INPUT', 400)
  }

  const supabase = getAppSupabase()
  const responsavelId = await resolveResponsavelId(supabase, body.responsavelId, body.responsavelNome)
  const vencimentoEm =
    typeof body.vencimentoEm === 'string' && body.vencimentoEm.trim()
      ? new Date(body.vencimentoEm).toISOString()
      : null

  const { error } = await supabase
    .from('tarefas')
    .update({
      titulo: String(body.titulo),
      descricao: typeof body.descricao === 'string' && body.descricao.trim() ? body.descricao : null,
      responsavel_id: responsavelId,
      status: typeof body.status === 'string' && body.status.trim() ? body.status : 'Pendente',
      vencimento_em: vencimentoEm,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(body.id))

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao atualizar tarefa')
  }

  return listTarefas(session)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'tarefas', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id) {
    return serverErrorResponse('Tarefa inválida', 'INVALID_TASK_INPUT', 400)
  }

  const supabase = getAppSupabase()
  const { error } = await supabase.from('tarefas').delete().eq('id', String(body.id))

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao excluir tarefa')
  }

  return listTarefas(session)
}
