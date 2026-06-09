import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse } from '@/lib/app-api'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  if (session.role !== 'paciente') {
    return serverErrorResponse('Apenas pacientes', 'FORBIDDEN', 403)
  }

  const supabase = getAppSupabase()
  const { data: paciente, error } = await supabase
    .from('pacientes')
    .select('id,nome,cpf,email,telefone')
    .eq('usuario_id', session.userId)
    .maybeSingle()

  if (error) return serverErrorResponse('Falha ao carregar paciente', 'QUERY_FAILED', 500)
  if (!paciente) return serverErrorResponse('Paciente não encontrado', 'NOT_FOUND', 404)

  return NextResponse.json({
    data: {
      pacienteId: String(paciente.id),
      nome: String(paciente.nome ?? ''),
      cpf: paciente.cpf ?? null,
      email: paciente.email ?? null,
      telefone: paciente.telefone ?? null,
    },
    meta: session,
  })
}
