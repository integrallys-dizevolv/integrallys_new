'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarClock, CheckCheck, Clock3, CreditCard, ListOrdered, ReceiptText, RefreshCw } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { NotificationItem } from './hooks/use-notificacoes'

interface NotificationsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notifications: NotificationItem[]
  onMarkAsRead: (id: string) => Promise<void> | void
  onMarkAllAsRead: () => Promise<void> | void
  onRefresh: () => Promise<void> | void
  isLoading?: boolean
}

const KIND_STYLES: Record<
  NotificationItem['kind'],
  {
    icon: typeof CalendarClock
    label: string
    accent: string
    chip: string
    iconWrap: string
  }
> = {
  agenda: {
    icon: CalendarClock,
    label: 'Agenda',
    accent: 'from-blue-500/20 to-cyan-500/10',
    chip: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    iconWrap: 'bg-blue-600 text-white shadow-blue-600/20',
  },
  financeiro: {
    icon: ReceiptText,
    label: 'Financeiro',
    accent: 'from-emerald-500/20 to-green-500/10',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    iconWrap: 'bg-emerald-600 text-white shadow-emerald-600/20',
  },
  lista_espera: {
    icon: ListOrdered,
    label: 'Lista de espera',
    accent: 'from-amber-500/20 to-orange-500/10',
    chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    iconWrap: 'bg-amber-500 text-white shadow-amber-500/20',
  },
  pagamento: {
    icon: CreditCard,
    label: 'Pagamento',
    accent: 'from-violet-500/20 to-fuchsia-500/10',
    chip: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200',
    iconWrap: 'bg-violet-600 text-white shadow-violet-600/20',
  },
  prescricao: {
    icon: Clock3,
    label: 'Prescrição',
    accent: 'from-sky-500/20 to-indigo-500/10',
    chip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
    iconWrap: 'bg-sky-600 text-white shadow-sky-600/20',
  },
}

export function NotificationsSheet({
  open,
  onOpenChange,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  isLoading = false,
}: NotificationsSheetProps) {
  const router = useRouter()
  const [items, setItems] = useState(notifications)

  useEffect(() => {
    setItems(notifications)
  }, [notifications])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full flex flex-col">
        <SheetHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notificações</SheetTitle>
              <div className="mt-2 inline-flex items-center rounded-full border border-app-border bg-app-bg-secondary px-3 py-1 text-xs font-medium text-app-text-secondary dark:border-app-border-dark dark:bg-app-hover dark:text-app-text-muted">
                {items.filter((item) => !item.read).length} pendente(s)
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-app-primary/15 to-app-primary/5 text-app-primary shadow-sm dark:from-app-primary/20 dark:to-app-primary/5">
              <Bell className="h-5 w-5" />
            </div>
          </div>

        </SheetHeader>
          <div className="rounded-3xl border border-app-border bg-gradient-to-br from-app-bg-secondary to-white px-4 py-3 dark:border-app-border-dark dark:from-app-hover dark:to-app-card-dark">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-app-text-muted">Central de alertas</p>
            <p className="mt-1 text-sm text-app-text-secondary dark:text-app-text-muted">
              Abra o item certo mais rápido e acompanhe o que ainda precisa da sua atenção.
            </p>
          </div>

       
        <div className="flex-1 overflow-y-auto mt-5 px-4 space-y-4 pb-6">
          {items.length > 0 ? (
            items.map((notif) => (
              (() => {
                const style = KIND_STYLES[notif.kind]
                const Icon = style.icon
                return (
                  <div
                    key={notif.id}
                    className={`
                      relative overflow-hidden rounded-3xl border p-4 shadow-sm transition-all
                      ${notif.read
                        ? 'border-app-border bg-app-card dark:border-app-border-dark dark:bg-app-card-dark'
                        : 'border-app-primary/20 bg-white dark:border-app-primary/20 dark:bg-app-card-dark'
                      }
                    `}
                  >
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${style.accent}`} />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg ${style.iconWrap}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${style.chip}`}>
                              {style.label}
                            </span>
                            {!notif.read && <span className="h-2.5 w-2.5 rounded-full bg-app-primary" />}
                          </div>
                          <p className="mt-3 text-base font-semibold text-[var(--app-text-primary)] dark:text-white">{notif.title}</p>
                          <p className="mt-1 text-sm leading-6 text-[#6a7282] dark:text-app-text-muted">{notif.description}</p>
                          <p className="mt-3 text-xs font-medium text-app-text-secondary dark:text-app-text-muted">{notif.date}</p>
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-app-border/70 pt-3 dark:border-app-border-dark/70">
                      {!notif.read ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-xl px-3 text-xs font-semibold"
                          onClick={async () => {
                            await onMarkAsRead(notif.id)
                            setItems((current) =>
                              current.map((item) => (item.id === notif.id ? { ...item, read: true } : item)),
                            )
                          }}
                        >
                          Marcar como lida
                        </Button>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-app-bg-secondary px-3 py-1.5 text-xs font-semibold text-app-text-secondary dark:bg-app-hover dark:text-app-text-muted">
                          Já lida
                        </span>
                      )}
                      <Button
                        variant="link"
                        size="sm"
                        className="h-9 rounded-xl px-0 text-xs font-semibold"
                        onClick={async () => {
                          if (!notif.read) {
                            await onMarkAsRead(notif.id)
                            setItems((current) =>
                              current.map((item) => (item.id === notif.id ? { ...item, read: true } : item)),
                            )
                          }
                          onOpenChange(false)
                          router.push(notif.href)
                        }}
                      >
                        Abrir
                      </Button>
                    </div>
                  </div>
                )
              })()
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-app-border bg-app-bg-secondary/70 py-14 text-center dark:border-app-border-dark dark:bg-app-hover/60">
              <Bell className="h-12 w-12 mx-auto text-[#6a7282] dark:text-app-text-muted mb-3" />
              <p className="text-sm text-[#6a7282] dark:text-app-text-muted">Nenhuma notificação no momento</p>
            </div>
          )}
        </div>
         <div className="mt-5 grid grid-cols-2 gap-3 px-4">
          <Button
            variant="outline"
            size="sm"
            className="h-11 justify-center gap-2 rounded-2xl border-app-primary/25 bg-white shadow-sm hover:bg-app-primary/5 dark:border-app-primary/25 dark:bg-app-card-dark"
            onClick={() => void onRefresh()}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 justify-center gap-2 rounded-2xl border border-app-border bg-app-bg-secondary text-xs font-semibold hover:bg-app-hover dark:border-app-border-dark dark:bg-app-hover"
            disabled={items.every((item) => item.read)}
            onClick={async () => {
              await onMarkAllAsRead()
              setItems((current) => current.map((item) => ({ ...item, read: true })))
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
