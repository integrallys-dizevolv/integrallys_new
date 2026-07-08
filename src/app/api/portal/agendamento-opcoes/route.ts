import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getPacienteIdByUserId, supabaseErrorResponse } from '@/lib/app-api'
import { authErrorResponse, getRequestAuth, requirePatientRole } from '@/lib/request-auth'

const BASE_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = requirePatientRole(session)
  if (denied) return denied

  const supabase = getAppSupabase()
  const { pacienteId, error: pacienteError } = await getPacienteIdByUserId(supabase, session.userId)
  if (pacienteError) return supabaseErrorResponse(pacienteError, 'Falha ao carregar opções de agendamento')

  const { data: paciente, error: pacienteDataError } = pacienteId
    ? await supabase.from('pacientes').select('id,unidade_id').eq('id', pacienteId).maybeSingle()
    : { data: null, error: null }

  if (pacienteDataError) return supabaseErrorResponse(pacienteDataError, 'Falha ao carregar opções de agendamento')

  const selectedDate = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  const [specialistsRes, proceduresRes, agendaRes] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id,nome,perfil,status,unidade_id')
      .eq('perfil', 'especialista')
      .eq('status', 'Ativo')
      .order('nome'),
    supabase
      .from('produtos_estoque')
      .select('id,nome,unidade_id')
      .order('nome')
      .limit(20),
    supabase
      .from('agendamentos')
      .select('horario_inicio')
      .eq('data_agendamento', selectedDate)
      .order('horario_inicio'),
  ])

  if (specialistsRes.error) return supabaseErrorResponse(specialistsRes.error, 'Falha ao carregar opções de agendamento')
  if (proceduresRes.error) return supabaseErrorResponse(proceduresRes.error, 'Falha ao carregar opções de agendamento')
  if (agendaRes.error) return supabaseErrorResponse(agendaRes.error, 'Falha ao carregar opções de agendamento')

  const unidadeId = paciente?.unidade_id ? String(paciente.unidade_id) : null
  const specialists = (specialistsRes.data ?? [])
    .filter((item) => !unidadeId || !item.unidade_id || String(item.unidade_id) === unidadeId)
    .map((item) => ({
      id: String(item.id),
      name: String(item.nome ?? ''),
      specialty: 'Especialista',
    }))

  const allProcedures = (proceduresRes.data ?? []).map((item) => ({
    id: String(item.id),
    unidadeId: item.unidade_id ? String(item.unidade_id) : null,
    name: String(item.nome ?? ''),
    price: 0,
  }))

  const unitProcedures = allProcedures.filter((item) => !unidadeId || !item.unidadeId || item.unidadeId === unidadeId)
  const procedures = unitProcedures.length > 0 ? unitProcedures : allProcedures

  const usedSlots = new Set((agendaRes.data ?? []).map((row) => String(row.horario_inicio ?? '').slice(0, 5)).filter(Boolean))
  const timeSlots = BASE_SLOTS.filter((slot) => !usedSlots.has(slot))

  return NextResponse.json({
    data: {
      specialists,
      procedures: procedures.map((item) => ({ id: item.id, name: item.name, price: item.price })),
      timeSlots,
    },
    meta: session,
  })
}
