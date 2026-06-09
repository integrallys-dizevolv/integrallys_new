import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> },
) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const { pacienteId } = await params
  if (!pacienteId) {
    return serverErrorResponse('pacienteId obrigatório', 'INVALID_PACIENTE', 400)
  }

  const supabase = getAppSupabase()

  // Paciente só pode ver os próprios documentos. Staff pode ver qualquer um
  // (a permissão de `documentacao:read` já cobre isso via can_user).
  if (session.role === 'paciente') {
    const { data: pac } = await supabase
      .from('pacientes')
      .select('id')
      .eq('usuario_id', session.userId)
      .maybeSingle()
    if (!pac || String(pac.id) !== pacienteId) {
      return serverErrorResponse('Acesso negado', 'FORBIDDEN', 403)
    }
  } else {
    const denied = await requirePermission(session.userId, 'documentacao', 'read')
    if (denied) return denied
  }

  const { data, error } = await supabase
    .from('documentos_gerados')
    .select('id,template_id,gerado_em,pdf_url')
    .eq('paciente_id', pacienteId)
    .eq('disponivel_no_portal', true)
    .order('gerado_em', { ascending: false })

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar documentos')
  return NextResponse.json({ data: data ?? [], meta: session })
}
