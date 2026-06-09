import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getPacienteIdByUserId, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { mapCartaoItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth, requirePatientRole } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = requirePatientRole(session)
  if (denied) return denied

  const supabase = getAppSupabase()
  const { pacienteId, error: pacienteError } = await getPacienteIdByUserId(supabase, session.userId)
  if (pacienteError) {
    return supabaseErrorResponse(pacienteError, 'Falha ao carregar cartões')
  }

  if (!pacienteId) {
    return NextResponse.json({ data: [], meta: session })
  }

  const { data, error } = await supabase
    .from('cartoes_paciente')
    .select('id,bandeira,final,titular')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar cartões')
  }

  return NextResponse.json({ data: (data ?? []).map((row) => mapCartaoItem(row)), meta: session })
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = requirePatientRole(session)
  if (denied) return denied
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return serverErrorResponse('Payload inválido', 'INVALID_PAYLOAD', 400)
  }

  const supabase = getAppSupabase()
  const { pacienteId, error: pacienteError } = await getPacienteIdByUserId(supabase, session.userId)
  if (pacienteError) return supabaseErrorResponse(pacienteError, 'Falha ao salvar cartão')
  if (!pacienteId) return serverErrorResponse('Paciente não encontrado', 'PATIENT_NOT_FOUND', 404)

  const { error } = await supabase.from('cartoes_paciente').insert({
    paciente_id: pacienteId,
    bandeira: body.bandeira,
    final: body.final,
    titular: body.titular,
  })

  if (error) return supabaseErrorResponse(error, 'Falha ao salvar cartão')

  return GET(request)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = requirePatientRole(session)
  if (denied) return denied
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id) {
    return serverErrorResponse('Cartão inválido', 'INVALID_CARD', 400)
  }

  const supabase = getAppSupabase()
  const { pacienteId, error: pacienteError } = await getPacienteIdByUserId(supabase, session.userId)
  if (pacienteError) return supabaseErrorResponse(pacienteError, 'Falha ao atualizar cartão')
  if (!pacienteId) return serverErrorResponse('Paciente não encontrado', 'PATIENT_NOT_FOUND', 404)

  const { error } = await supabase
    .from('cartoes_paciente')
    .update({
      bandeira: body.bandeira,
      final: body.final,
      titular: body.titular,
    })
    .eq('id', body.id)
    .eq('paciente_id', pacienteId)

  if (error) return supabaseErrorResponse(error, 'Falha ao atualizar cartão')

  return GET(request)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = requirePatientRole(session)
  if (denied) return denied
  const cardId = request.nextUrl.searchParams.get('id')
  if (!cardId) {
    return serverErrorResponse('Cartão inválido', 'INVALID_CARD', 400)
  }

  const supabase = getAppSupabase()
  const { pacienteId, error: pacienteError } = await getPacienteIdByUserId(supabase, session.userId)
  if (pacienteError) return supabaseErrorResponse(pacienteError, 'Falha ao excluir cartão')
  if (!pacienteId) return serverErrorResponse('Paciente não encontrado', 'PATIENT_NOT_FOUND', 404)

  const { error } = await supabase.from('cartoes_paciente').delete().eq('id', cardId).eq('paciente_id', pacienteId)
  if (error) return supabaseErrorResponse(error, 'Falha ao excluir cartão')

  return NextResponse.json({ data: [], meta: session })
}
