import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { JWT_COOKIE_NAME, signJwt } from '@/lib/auth'
import { buildAuthPayloadFromUserRecord, getServiceSupabase, parseRole, touchLastLogin } from '@/lib/auth-payload'

interface LoginRequest {
  email?: string
  password?: string
}

interface UsuarioRow {
  id: string
  nome: string
  email: string
  senha_hash: string
  perfil: string
  status: string
  avatar_url?: string | null
  // CR-AUTH-01 · TS-04: incluído p/ que o login carregue unidade_id no JWT.
  unidade_id?: string | null
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LoginRequest
  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Credenciais inválidas', code: 'INVALID_CREDENTIALS' }, { status: 401 })
  }

  let supabase
  try {
    supabase = getServiceSupabase()
  } catch {
    return NextResponse.json({ error: 'Configuração de autenticação ausente', code: 'AUTH_CONFIG_MISSING' }, { status: 500 })
  }

  const { data: userData, error } = await supabase
    .from('usuarios')
    // CR-AUTH-01 · TS-04: inclui `unidade_id` (p/ embarcar no JWT via
    // buildAuthPayloadFromUserRecord) e `avatar_url` (que o type já previa
    // mas o select original omitia — sempre vinha undefined pelo login).
    .select('id,nome,email,senha_hash,perfil,status,avatar_url,unidade_id')
    .eq('email', email)
    .maybeSingle()

  const data = (userData ?? null) as UsuarioRow | null

  if (error) {
    console.error('AUTH_LOGIN_QUERY_ERROR', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    return NextResponse.json(
      { error: 'Falha ao consultar autenticação', code: 'AUTH_BACKEND_ERROR' },
      { status: 500 },
    )
  }

  if (!data) {
    return NextResponse.json({ error: 'Credenciais inválidas', code: 'INVALID_CREDENTIALS' }, { status: 401 })
  }

  const isValidPassword = await bcrypt.compare(password, data.senha_hash)
  if (!isValidPassword) {
    return NextResponse.json({ error: 'Credenciais inválidas', code: 'INVALID_CREDENTIALS' }, { status: 401 })
  }

  if (data.status !== 'Ativo') {
    return NextResponse.json({ error: 'Usuário inativo', code: 'USER_INACTIVE' }, { status: 403 })
  }

  const role = parseRole(data.perfil)
  if (!role) {
    return NextResponse.json({ error: 'Perfil inválido', code: 'INVALID_ROLE' }, { status: 403 })
  }

  const payload = await buildAuthPayloadFromUserRecord(data)

  if (!payload) {
    console.error('AUTH_LOGIN_PAYLOAD_ERROR', {
      userId: data.id,
      perfil: data.perfil,
      status: data.status,
    })

    return NextResponse.json({ error: 'Falha ao montar sessão', code: 'AUTH_PAYLOAD_ERROR' }, { status: 500 })
  }

  let token: string
  try {
    token = await signJwt(payload.user)
  } catch {
    return NextResponse.json({ error: 'Configuração JWT ausente', code: 'JWT_CONFIG_MISSING' }, { status: 500 })
  }

  const response = NextResponse.json(payload)
  response.cookies.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  void touchLastLogin(data.id).catch(() => undefined)

  return response
}
