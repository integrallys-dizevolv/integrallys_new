import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'
import type { AuthUser } from '@/types/auth'
import { parseRole } from './auth-payload'

const JWT_COOKIE_NAME = 'integrallys_token'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET não configurado')
  }

  return new TextEncoder().encode(secret)
}

export async function signJwt(payload: AuthUser, expiresIn = '8h') {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret())
}

export async function verifyJwt(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())

    if (
      typeof payload.id !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null
    }

    const role = parseRole(String(payload.role ?? ''))
    if (!role) {
      return null
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role,
      // CR-AUTH-01 · TS-04: aceita string (ID válido) ou null (sem unidade).
      // Tokens antigos (pré-CR) não têm o campo → fica `null`, e o downstream
      // deve fazer fallback à query legada quando precisar do unidadeId.
      unidadeId: typeof payload.unidadeId === 'string' ? payload.unidadeId : null,
      avatarUrl: typeof payload.avatarUrl === 'string' ? payload.avatarUrl : undefined,
      mustDefinePassword: payload.mustDefinePassword === true,
    }
  } catch {
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value
  if (!token) {
    return null
  }

  return verifyJwt(token)
}

export { JWT_COOKIE_NAME }
