import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'read')
  if (denied) return denied

  const { slug } = await params
  if (!slug) return serverErrorResponse('slug obrigatório', 'INVALID_SLUG', 400)

  const scopedUnit = await getScopedUnitId(session)
  const unidadeId = scopedUnit.error ? null : scopedUnit.unidadeId
  if (!unidadeId) {
    return serverErrorResponse('Usuário sem unidade vinculada', 'NO_UNIT', 400)
  }

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('documento_templates')
    .select(
      'id,slug,nome,tipo,conteudo,ativo,editavel_pelo_especialista,disponivel_portal_paciente,updated_at',
    )
    .eq('unidade_id', unidadeId)
    .eq('slug', slug)
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar template')
  if (!data) return serverErrorResponse('Template não encontrado', 'NOT_FOUND', 404)

  return NextResponse.json({ data, meta: session })
}
