import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getEntityNameMap, getPacienteIdByUserId, supabaseErrorResponse } from '@/lib/app-api'
import { mapHistoricoItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth, requirePatientRole } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = requirePatientRole(session)
  if (denied) return denied

  const supabase = getAppSupabase()
  const { pacienteId, error: pacienteError } = await getPacienteIdByUserId(supabase, session.userId)
  if (pacienteError) {
    return supabaseErrorResponse(pacienteError, 'Falha ao carregar histórico')
  }

  if (!pacienteId) {
    return NextResponse.json({ data: [], meta: session })
  }

  const { data, error } = await supabase
    .from('agendamentos')
    .select('id,data_agendamento,status,profissional_id,unidade_id')
    .eq('paciente_id', pacienteId)
    .order('data_agendamento', { ascending: false })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar histórico')
  }

  const { map: profissionais, error: profissionaisError } = await getEntityNameMap(
    supabase,
    'usuarios',
    (data ?? []).map((row) => String(row.profissional_id ?? '')),
  )

  if (profissionaisError) {
    return supabaseErrorResponse(profissionaisError, 'Falha ao carregar histórico')
  }

  const { map: unidades, error: unidadesError } = await getEntityNameMap(
    supabase,
    'unidades',
    (data ?? []).map((row) => String(row.unidade_id ?? '')),
  )

  if (unidadesError) {
    return supabaseErrorResponse(unidadesError, 'Falha ao carregar histórico')
  }

  return NextResponse.json({
    data: (data ?? []).map((row) =>
      mapHistoricoItem({
        ...row,
        profissional_nome: profissionais[String(row.profissional_id ?? '')] ?? '',
        unidade_nome: unidades[String(row.unidade_id ?? '')] ?? '',
      }),
    ),
    meta: session,
  })
}
