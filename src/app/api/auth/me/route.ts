import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAuthPayloadFromUserId } from '@/lib/auth-payload'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)

  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const payload = await buildAuthPayloadFromUserId(authUser.id)
  if (!payload) {
    return NextResponse.json({ error: 'Sessão inválida', code: 'SESSION_INVALID' }, { status: 401 })
  }

  return NextResponse.json(payload)
}
