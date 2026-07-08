'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ShellLayout } from '@/components/global/shell-layout'
import { LoadingScreen } from '@/components/global/loading-screen'
import { useAuth } from '@/hooks/use-auth'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { initialize, isLoading, isAuthenticated, user } = useAuth()

  useEffect(() => {
    void initialize(true)
  }, [initialize])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isLoading || !isAuthenticated) return

    if (user?.mustDefinePassword && pathname !== '/primeiro-acesso') {
      router.replace('/primeiro-acesso')
      return
    }

    if (!user?.mustDefinePassword && pathname === '/primeiro-acesso') {
      router.replace('/')
    }
  }, [isAuthenticated, isLoading, pathname, router, user?.mustDefinePassword])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return null
  }

  if (pathname === '/primeiro-acesso') {
    return <>{children}</>
  }

  return <ShellLayout>{children}</ShellLayout>
}
