import bcrypt from 'bcryptjs'
import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { JWT_COOKIE_NAME, signJwt } from '@/lib/auth'
import { buildAuthPayloadFromUserId, getPasswordSetupRequiredKey } from '@/lib/auth-payload'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return serverErrorResponse('Payload inválido', 'INVALID_PASSWORD_PAYLOAD', 400)

  const currentPassword = String(body.currentPassword ?? '')
  const newPassword = String(body.newPassword ?? '')
  const confirmPassword = String(body.confirmPassword ?? '')

  if (newPassword.length < 4) {
    return serverErrorResponse('A nova senha deve ter pelo menos 4 caracteres', 'PASSWORD_TOO_SHORT', 400)
  }

  if (newPassword !== confirmPassword) {
    return serverErrorResponse('A confirmação da senha não confere', 'PASSWORD_CONFIRMATION_MISMATCH', 400)
  }

  const supabase = getAppSupabase()
  const [{ data: authUser, error: authUserError }, { data: firstAccessConfig, error: firstAccessError }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('senha_hash')
      .eq('id', session.userId)
      .maybeSingle(),
    supabase
      .from('configuracoes')
      .select('valor')
      .eq('categoria', 'auth_user')
      .eq('chave', getPasswordSetupRequiredKey(session.userId))
      .maybeSingle(),
  ])

  if (authUserError) return supabaseErrorResponse(authUserError, 'Falha ao alterar senha')
  if (firstAccessError) return supabaseErrorResponse(firstAccessError, 'Falha ao alterar senha')

  const mustDefinePassword = firstAccessConfig?.valor === 'true'

  if ((!mustDefinePassword && !currentPassword) || !newPassword || !confirmPassword) {
    return serverErrorResponse('Preencha todos os campos de senha', 'PASSWORD_FIELDS_REQUIRED', 400)
  }

  const currentPasswordMatches = mustDefinePassword
    ? true
    : authUser?.senha_hash
      ? await bcrypt.compare(currentPassword, String(authUser.senha_hash))
      : false

  if (!currentPasswordMatches) {
    return serverErrorResponse('Senha atual inválida', 'INVALID_CURRENT_PASSWORD', 400)
  }

  const senhaHash = await bcrypt.hash(newPassword, 10)
  const { error: passwordUpdateError } = await supabase
    .from('usuarios')
    .update({ senha_hash: senhaHash })
    .eq('id', session.userId)

  if (passwordUpdateError) return supabaseErrorResponse(passwordUpdateError, 'Falha ao alterar senha')

  if (mustDefinePassword) {
    const { error: configUpdateError } = await supabase
      .from('configuracoes')
      .upsert(
        [{
          categoria: 'auth_user',
          chave: getPasswordSetupRequiredKey(session.userId),
          valor: 'false',
        }],
        { onConflict: 'categoria,chave' },
      )

    if (configUpdateError) return supabaseErrorResponse(configUpdateError, 'Falha ao alterar senha')
  }

  const response = NextResponse.json({
    data: { success: true },
    meta: session,
  })

  // Re-sign JWT cookie quando o paciente acabou de definir senha pela primeira vez —
  // sem isso, o flag `mustDefinePassword` continua `true` no JWT e o middleware
  // mantém o redirect para /primeiro-acesso, criando loop infinito.
  if (mustDefinePassword) {
    try {
      const refreshedPayload = await buildAuthPayloadFromUserId(session.userId)
      if (refreshedPayload) {
        const token = await signJwt(refreshedPayload.user)
        response.cookies.set(JWT_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 60 * 60 * 8,
        })
      }
    } catch {
      // Falha ao re-emitir cookie não deve invalidar a troca de senha — usuário
      // continuará com cookie antigo até o próximo login (DB já foi atualizado).
    }
  }

  return response
}
