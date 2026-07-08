import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getEntityNameMap, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapAuditoriaItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'auditoria', 'read')
  if (denied) return denied

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('audit_log')
    .select('id,actor_user_id,acao,recurso,descricao,ip,created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar auditoria')
  }

  const { map, error: usuariosError } = await getEntityNameMap(
    supabase,
    'usuarios',
    (data ?? []).map((row) => String(row.actor_user_id ?? '')),
  )

  if (usuariosError) {
    return supabaseErrorResponse(usuariosError, 'Falha ao carregar auditoria')
  }

  return NextResponse.json({
    data: (data ?? []).map((row) => mapAuditoriaItem({ ...row, usuario_nome: map[String(row.actor_user_id ?? '')] ?? 'Sistema' })),
    meta: session,
  })
}
