import { getAppSupabase, serverErrorResponse } from '@/lib/app-api'

export async function can(
  userId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const supabase = getAppSupabase()
  const { data, error } = await supabase.rpc('can_user', {
    p_usuario_id: userId,
    p_resource: resource,
    p_action: action,
  })

  if (error) {
    console.error('[authz] can_user error', { userId, resource, action, error })
    return false
  }

  return data === true
}

export async function requirePermission(
  userId: string,
  resource: string,
  action: string,
): Promise<Response | null> {
  const allowed = await can(userId, resource, action)
  if (!allowed) {
    return serverErrorResponse('Acesso negado', 'FORBIDDEN', 403)
  }
  return null
}
