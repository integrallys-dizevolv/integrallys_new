import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getEntityNameMap, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapProntuarioItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'prontuarios', 'read')
  if (denied) return denied

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('prontuarios')
    .select('id,paciente_id,data_registro,tipo,status')
    .order('data_registro', { ascending: false })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar prontuários')
  }

  const { map, error: pacienteError } = await getEntityNameMap(
    supabase,
    'pacientes',
    (data ?? []).map((row) => String(row.paciente_id ?? '')),
  )

  if (pacienteError) {
    return supabaseErrorResponse(pacienteError, 'Falha ao carregar prontuários')
  }

  return NextResponse.json({
    data: (data ?? []).map((row) => mapProntuarioItem({ ...row, paciente_nome: map[String(row.paciente_id ?? '')] ?? '' })),
    meta: session,
  })
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'prontuarios', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const pacienteId = body?.pacienteId ?? body?.paciente
  if (!pacienteId || !body?.data || !body?.tipo || !body?.status) {
    return serverErrorResponse('Prontuário inválido', 'INVALID_MEDICAL_RECORD', 400)
  }

  const supabase = getAppSupabase()
  const { error } = await supabase.from('prontuarios').insert({
    paciente_id: pacienteId,
    profissional_id: session.userId,
    data_registro: body.data,
    tipo: body.tipo,
    status: body.status,
  })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao salvar prontuário')
  }

  return GET(request)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'prontuarios', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id || !body?.pacienteId || !body?.data || !body?.tipo || !body?.status) {
    return serverErrorResponse('Prontuário inválido', 'INVALID_MEDICAL_RECORD', 400)
  }

  const supabase = getAppSupabase()
  const { error } = await supabase
    .from('prontuarios')
    .update({
      paciente_id: body.pacienteId,
      data_registro: body.data,
      tipo: body.tipo,
      status: body.status,
    })
    .eq('id', String(body.id))

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao atualizar prontuário')
  }

  return GET(request)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'prontuarios', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const id = String(body?.id ?? '')
  if (!id) {
    return serverErrorResponse('Prontuário não informado', 'MEDICAL_RECORD_ID_REQUIRED', 400)
  }

  const supabase = getAppSupabase()
  const { error } = await supabase.from('prontuarios').delete().eq('id', id)

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao excluir prontuário')
  }

  return GET(request)
}
