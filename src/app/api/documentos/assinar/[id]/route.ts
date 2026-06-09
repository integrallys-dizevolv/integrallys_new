import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

/**
 * PATCH /api/documentos/assinar/[id]
 * Body: { assinaturaBase64: string }
 *
 * Persiste a assinatura desenhada (base64 PNG) e marca `assinado_em = now()`
 * em documentos_gerados. Apenas o profissional que gerou ou roles com
 * permissão de update podem assinar.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'update')
  if (denied) return denied

  const { id } = await params
  if (!id) return serverErrorResponse('id obrigatório', 'INVALID_ID', 400)

  const body = (await request.json().catch(() => null)) as { assinaturaBase64?: string } | null
  if (!body?.assinaturaBase64) {
    return serverErrorResponse('assinaturaBase64 obrigatório', 'MISSING_SIGNATURE', 400)
  }

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('documentos_gerados')
    .update({
      assinatura_base64: body.assinaturaBase64,
      assinado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id,assinado_em')
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao assinar documento')
  if (!data) return serverErrorResponse('Documento não encontrado', 'NOT_FOUND', 404)

  return NextResponse.json({ data, meta: session })
}
