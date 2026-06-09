import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getPacienteIdByUserId, supabaseErrorResponse } from '@/lib/app-api'
import { mapPagamentoPortalItem } from '@/lib/domain-mappers'
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
    return supabaseErrorResponse(pacienteError, 'Falha ao carregar pagamentos')
  }

  if (!pacienteId) {
    return NextResponse.json({ data: [], meta: session })
  }

  const { data, error } = await supabase
    .from('pagamentos_paciente')
    .select('id,descricao,valor,status,vencimento_em,pago_em')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar pagamentos')
  }

  return NextResponse.json({ data: (data ?? []).map((row) => mapPagamentoPortalItem(row)), meta: session })
}
