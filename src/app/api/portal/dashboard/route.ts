import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getEntityNameMap, getPacienteIdByUserId, supabaseErrorResponse } from '@/lib/app-api'
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
    return supabaseErrorResponse(pacienteError, 'Falha ao carregar portal do paciente')
  }

  if (!pacienteId) {
    return NextResponse.json({ cards: [], nextAppointment: null, lastAppointment: null, recentHistory: [], meta: session })
  }

  const today = new Date().toISOString().slice(0, 10)
  const [proximosResult, proximosRowsResult, historicoRowsResult, pagamentosResult, cartoesResult] = await Promise.all([
    supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('paciente_id', pacienteId).gte('data_agendamento', today),
    supabase
      .from('agendamentos')
      .select('id,data_agendamento,profissional_id,status')
      .eq('paciente_id', pacienteId)
      .gte('data_agendamento', today)
      .order('data_agendamento', { ascending: true })
      .limit(1),
    supabase
      .from('agendamentos')
      .select('id,data_agendamento,profissional_id,status')
      .eq('paciente_id', pacienteId)
      .order('data_agendamento', { ascending: false })
      .limit(3),
    supabase.from('pagamentos_paciente').select('*', { count: 'exact', head: true }).eq('paciente_id', pacienteId).eq('status', 'Pendente'),
    supabase.from('cartoes_paciente').select('*', { count: 'exact', head: true }).eq('paciente_id', pacienteId),
  ])

  const errors = [proximosResult.error, proximosRowsResult.error, historicoRowsResult.error, pagamentosResult.error, cartoesResult.error].filter(Boolean)
  if (errors.length > 0) {
    return supabaseErrorResponse(errors[0]!, 'Falha ao carregar portal do paciente')
  }

  const historyRows = historicoRowsResult.data ?? []
  const professionalIds = [
    ...(proximosRowsResult.data ?? []).map((row) => String(row.profissional_id ?? '')),
    ...historyRows.map((row) => String(row.profissional_id ?? '')),
  ]
  const { map: profissionais, error: profissionaisError } = await getEntityNameMap(supabase, 'usuarios', professionalIds)
  if (profissionaisError) {
    return supabaseErrorResponse(profissionaisError, 'Falha ao carregar portal do paciente')
  }

  const nextRow = proximosRowsResult.data?.[0]
  const lastRow = historyRows[0]

  return NextResponse.json({
    cards: [
      { id: 'agendamentos', label: 'Próximos agendamentos', value: String(proximosResult.count ?? 0) },
      { id: 'pagamentos', label: 'Pagamentos pendentes', value: String(pagamentosResult.count ?? 0) },
      { id: 'cartoes', label: 'Cartões salvos', value: String(cartoesResult.count ?? 0) },
    ],
    nextAppointment: nextRow
      ? {
          medico: profissionais[String(nextRow.profissional_id ?? '')] || 'Especialista',
          especialidade: 'Consulta',
          data: new Date(String(nextRow.data_agendamento)).toLocaleDateString('pt-BR'),
        }
      : null,
    lastAppointment: lastRow
      ? {
          medico: profissionais[String(lastRow.profissional_id ?? '')] || 'Especialista',
          especialidade: 'Consulta',
          data: new Date(String(lastRow.data_agendamento)).toLocaleDateString('pt-BR'),
          status: String(lastRow.status ?? 'Concluída'),
        }
      : null,
    recentHistory: historyRows.map((row) => ({
      id: String(row.id),
      data: new Date(String(row.data_agendamento)).toLocaleDateString('pt-BR'),
      especialidade: 'Consulta',
      medico: profissionais[String(row.profissional_id ?? '')] || 'Especialista',
      status: String(row.status ?? 'Concluída'),
    })),
    meta: session,
  })
}
