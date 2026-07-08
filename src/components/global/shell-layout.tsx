'use client'

import { useMemo, useState } from 'react'
import { Sidebar } from '@/components/global/sidebar'
import { Header } from '@/components/global/header'
import { NotificationsSheet } from '@/components/global/notifications-sheet'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { useNotificacoes } from './hooks/use-notificacoes'

interface ShellLayoutProps {
  children: React.ReactNode
}

export function ShellLayout({ children }: ShellLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { user, sidebarItems, logout } = useAuth()
  const { data: notifications, unreadCount, isLoading, load, markAsRead, markAllAsRead } = useNotificacoes()
  const settingsHref = useMemo(
    () =>
      sidebarItems.find((item) => item.id === 'configuracoes' || item.id === 'settings')?.href ??
      '/configuracoes',
    [sidebarItems],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg-secondary dark:bg-app-bg-dark">
      {/* Overlay sempre renderizado para permitir fade in/out. `pointer-events-none`
          quando fechado garante que ele não bloqueie cliques abaixo. */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-app-bg-dark/50 transition-opacity duration-300 lg:hidden',
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden={!isSidebarOpen}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} items={sidebarItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          settingsHref={settingsHref}
          toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          unreadNotifications={unreadCount}
          onNotificationsClick={() => setIsNotificationsOpen(true)}
          onLogout={logout}
        />
        <main className="flex-1 overflow-y-auto px-3 py-5 scroll-smooth lg:px-4 lg:py-5">
          <div className="app-page-frame">{children}</div>
        </main>
      </div>
      <NotificationsSheet
        open={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onRefresh={load}
        isLoading={isLoading}
      />
    </div>
  )
}
