import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agendamentoId: string }> },
) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'read')
  if (denied) return denied

  const { agendamentoId } = await params
  if (!agendamentoId) {
    return serverErrorResponse('agendamentoId obrigatório', 'INVALID_AGENDAMENTO', 400)
  }

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('documentos_gerados')
    .select(
      'id,template_id,paciente_id,profissional_id,conteudo_preenchido,gerado_por,gerado_em,disponivel_no_portal,pdf_url',
    )
    .eq('agendamento_id', agendamentoId)
    .order('gerado_em', { ascending: false })

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar documentos do atendimento')
  return NextResponse.json({ data: data ?? [], meta: session })
}
