import type { PostgrestError } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase } from '@/lib/app-api'
import { getAuthUser } from '@/lib/auth'
import { buildAuthPayloadFromUserId } from '@/lib/auth-payload'
import type { AuthUser } from '@/types/auth'

export interface RequestAuth {
  userId: string
  role: AuthUser['role']
  user: AuthUser
}

/**
 * Sempre valida o JWT — nunca confia em headers que o cliente pode forjar.
 * O middleware injeta x-user-id/x-user-role por conveniência, mas esses
 * headers não são fonte de verdade para autenticação nas API routes.
 */
export async function getRequestAuth(request: NextRequest): Promise<RequestAuth | null> {
  const jwtUser = await getAuthUser(request)
  if (!jwtUser) {
    return null
  }

  const payload = await buildAuthPayloadFromUserId(jwtUser.id)
  const user = payload?.user
  if (!user) {
    return null
  }

  return {
    userId: user.id,
    role: user.role,
    user,
  }
}

export function authErrorResponse() {
  return NextResponse.json(
    { error: 'Não autenticado', code: 'AUTH_REQUIRED' },
    { status: 401 },
  )
}

export function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Acesso negado', code: 'FORBIDDEN' },
    { status: 403 },
  )
}

/**
 * Garante que a sessão é de um paciente — retorna 403 caso contrário.
 * Usado para endpoints `/api/portal/*` que só fazem sentido para o portal
 * do paciente. Evita que perfis administrativos consigam ler/manipular
 * dados via essas rotas, mesmo que `getPacienteIdByUserId` retorne null.
 */
export function requirePatientRole(session: RequestAuth) {
  if (session.role !== 'paciente') {
    return forbiddenResponse()
  }
  return null
}

export type ScopedUnitResult =
  | { unidadeId: string | null; error: null }
  | { unidadeId: null; error: PostgrestError }

const SCOPED_ROLES = ['gestor', 'recepcao', 'especialista'] as const

/**
 * Helper centralizado para escopar queries por unidade do usuário.
 *
 * - master/admin/paciente: sempre `{ unidadeId: null }` — sem escopo.
 * - gestor/recepcao/especialista: caminho rápido lê `session.user.unidadeId`
 *   embarcado no JWT (CR-AUTH-01). Para tokens antigos (`unidadeId === undefined`)
 *   ou sessões sem unidadeId persistido, faz fallback à query em `usuarios`.
 *
 * Substitui os antigos helpers `getScopedUnitId` locais por convenção do
 * projeto — ver comentário em `src/app/api/estoque/route.ts` para o
 * histórico da decisão (Agente 20, 2026-05-21).
 */
export async function getScopedUnitId(
  session: Awaited<ReturnType<typeof getRequestAuth>>,
): Promise<ScopedUnitResult> {
  if (!session || !SCOPED_ROLES.includes(session.role as (typeof SCOPED_ROLES)[number])) {
    return { unidadeId: null, error: null }
  }

  // Caminho rápido: JWT carrega unidadeId (CR-AUTH-01)
  if (session.user?.unidadeId) {
    return { unidadeId: String(session.user.unidadeId), error: null }
  }

  // Fallback para tokens antigos ou casos onde unidadeId é undefined/null no JWT
  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('usuarios')
    .select('unidade_id')
    .eq('id', session.userId)
    .maybeSingle()

  if (error) return { unidadeId: null, error }
  return {
    unidadeId: data?.unidade_id ? String(data.unidade_id) : null,
    error: null,
  }
}
