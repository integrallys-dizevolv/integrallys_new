'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ShellLayout } from '@/components/global/shell-layout'
import { LoadingScreen } from '@/components/global/loading-screen'
import { useAuth } from '@/hooks/use-auth'

// `useSearchParams()` precisa estar dentro de `<Suspense>` em Next 13+ para
// que pages descendentes possam ser pre-renderizadas (mesmo dynamic). Sem
// isso, o build falha em qualquer page de `(app)/*`. O `AppLayout` default
// abaixo só envolve este componente em Suspense.
function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // CR-HW-01 (item 1.4): "tela grande" = renderiza children sem o ShellLayout
  // (sidebar + header). Acionado pelo query param ?hardware=1 — botão "Tela
  // Grande" no visualizar-consulta-modal e auto-trigger ao iniciar atendimento.
  // Nota: o nome `hardware` colide semanticamente com a aba "Hardware" das
  // Configurações (câmera/impressora) — mantido por fidelidade ao spec.
  const isHardwareMode = searchParams?.get('hardware') === '1'
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

  if (isHardwareMode) {
    return <>{children}</>
  }

  return <ShellLayout>{children}</ShellLayout>
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  )
}
