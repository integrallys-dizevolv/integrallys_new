import { cookies } from 'next/headers'
import { JWT_COOKIE_NAME, verifyJwt } from '@/lib/auth'

export async function getServerSession() {
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value
  if (!token) return null
  return verifyJwt(token)
}
