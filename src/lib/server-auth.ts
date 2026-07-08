import { cookies } from 'next/headers'
import { JWT_COOKIE_NAME, verifyJwt } from '@/lib/auth'
import { buildAuthPayloadFromUserId } from '@/lib/auth-payload'

export async function getServerAuthPayload() {
  const cookieStore = await cookies()
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value
  if (!token) {
    return null
  }

  const user = await verifyJwt(token)
  if (!user) {
    return null
  }

  return buildAuthPayloadFromUserId(user.id)
}
