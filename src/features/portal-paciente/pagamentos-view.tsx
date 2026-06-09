'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartoes } from './hooks/use-cartoes'
import { usePagamentosPortal } from './hooks/use-pagamentos-portal'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, CheckCircle, CreditCard, DollarSign, FileText } from 'lucide-react'
import { BoletoModal } from './modals/boleto-modal'
import { CheckoutModal } from './modals/checkout-modal'

export function PagamentosView() {
  const { data, error, isLoading } = usePagamentosPortal()
  const { data: cartoes } = useCartoes()
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<'todos' | 'pendentes' | 'pagos' | 'vencidos'>('todos')
  const [boletoModalOpen, setBoletoModalOpen] = useState(false)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)

  const selectedPayment = useMemo(
    () => data.find((item) => item.id === selectedPaymentId) ?? null,
    [data, selectedPaymentId],
  )

  const totalPendente = useMemo(
    () => data.filter((f) => f.status === 'Pendente').reduce((acc, curr) => acc + curr.valor, 0),
    [data],
  )
  const totalPago = useMemo(
    () => data.filter((f) => f.status === 'Pago').reduce((acc, curr) => acc + curr.valor, 0),
    [data],
  )
  const totalGeral = useMemo(
    () => data.reduce((acc, curr) => acc + curr.valor, 0),
    [data],
  )
  const filteredFaturas = useMemo(() => {
    return data.filter((item) => {
      if (selectedTab === 'todos') return true
      if (selectedTab === 'pendentes') return item.status === 'Pendente'
      if (selectedTab === 'pagos') return item.status === 'Pago'
      if (selectedTab === 'vencidos') return item.status === 'Vencido'
      return true
    })
  }, [data, selectedTab])

  const savedCardsCount = cartoes.length

  return (
    <div className="app-page app-page-loose">
      <PageHeader
        title="Pagamentos"
        actions={
          <Button
            variant="outline"
            className="flex flex-row items-center justify-center gap-2 whitespace-nowrap h-11 px-4 shrink-0 rounded-integrallys"
            onClick={() => router.push('/cartoes')}
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span className="leading-none">Gerenciar Cartões ({savedCardsCount})</span>
          </Button>
        }
      />

      <div className="app-grid-stats">
        <Card className="rounded-integrallys-lg border-app-border dark:border-app-border-dark shadow-sm overflow-hidden relative">
          <CardContent className="p-6 flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full app-status-warning flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text-secondary dark:text-white/60 mb-0.5">Pendente</p>
              <h3 className="text-2xl font-bold text-app-text-primary dark:text-white">
                {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-integrallys-lg border-app-border dark:border-app-border-dark shadow-sm overflow-hidden relative">
          <CardContent className="p-6 flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full app-status-success flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text-secondary dark:text-white/60 mb-0.5">Pago</p>
              <h3 className="text-2xl font-bold text-[var(--app-success-text)]">
                {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-integrallys-lg border-app-border dark:border-app-border-dark shadow-sm overflow-hidden relative">
          <CardContent className="p-6 flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full app-status-info flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text-secondary dark:text-white/60 mb-0.5">Total</p>
              <h3 className="text-2xl font-bold text-[var(--app-info-text)]">
                {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}
      {isLoading && <p className="text-app-text-secondary">Carregando pagamentos...</p>}
      {!isLoading && data.length === 0 && <p className="text-app-text-secondary">Nenhum pagamento encontrado.</p>}

      <div className="flex gap-2 mb-2 overflow-x-auto pb-2 md:pb-0">
        {(['todos', 'pendentes', 'pagos', 'vencidos'] as const).map((tab) => {
          const count =
            tab === 'todos'
              ? data.length
              : data.filter((f) => {
                  if (tab === 'pendentes') return f.status === 'Pendente'
                  if (tab === 'pagos') return f.status === 'Pago'
                  if (tab === 'vencidos') return f.status === 'Vencido'
                  return false
                }).length

          const label = tab.charAt(0).toUpperCase() + tab.slice(1)
          const isActive = selectedTab === tab

          const getActiveStyles = () => {
            switch (tab) {
              case 'pendentes':
                return 'app-status-warning border-transparent'
              case 'pagos':
                return 'app-status-success border-transparent'
              case 'vencidos':
                return 'app-status-danger border-transparent'
              default:
                return 'app-status-neutral border-transparent'
            }
          }

          return (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`app-pill h-8 px-4 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? getActiveStyles()
                  : 'bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark text-app-text-secondary hover:bg-app-bg-secondary dark:hover:bg-app-hover'
              }`}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      <div className="grid gap-4">
        {filteredFaturas.map((item) => (
          <Card
            key={item.id}
            className="rounded-integrallys-lg bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer group"
          >
            <CardContent className="p-4 md:p-6 app-toolbar md:gap-6">
              <div className="flex items-start md:items-center gap-4 w-full">
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    item.status === 'Pendente' ? 'app-status-warning' : 'app-status-success'
                  }`}
                >
                  {item.status === 'Pendente' ? <Clock className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-app-text-primary dark:text-white text-base md:text-lg">
                      {item.descricao}
                    </h4>
                    <Badge
                      className={`text-xs font-medium border-0 ${
                        item.status === 'Pendente' ? 'app-status-warning' : 'app-status-success'
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-app-text-muted">
                    {item.doutor || 'Especialista'}
                    {' • '}
                    {item.vencimento || '-'}
                    {' • '}
                    <span className={`font-semibold ${item.status === 'Pendente' ? 'text-app-text-primary dark:text-white' : 'text-[var(--app-success-text)]'}`}>
                      {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-row items-center gap-3 w-full md:w-auto mt-2 md:mt-0 flex-nowrap">
                {item.status === 'Pendente' ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none h-10 rounded-integrallys gap-2 whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm flex items-center justify-center"
                      onClick={() => {
                        setSelectedPaymentId(item.id)
                        setBoletoModalOpen(true)
                      }}
                    >
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      Gerar Boleto
                    </Button>
                    <Button
                      className="flex-1 md:flex-none h-10 rounded-integrallys gap-2 whitespace-nowrap bg-app-primary hover:bg-app-primary-hover text-white px-2 sm:px-4 text-xs sm:text-sm flex items-center justify-center"
                      onClick={() => {
                        setSelectedPaymentId(item.id)
                        setCheckoutModalOpen(true)
                      }}
                    >
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      Pagar Online
                    </Button>
                  </>
                ) : (
                  <div className="w-full text-right md:w-auto">
                    <span className="text-xs text-app-text-muted block md:hidden">Status</span>
                    <span className="text-sm text-app-text-muted">Pago em {item.pagamento || '-'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BoletoModal
        isOpen={boletoModalOpen}
        onClose={() => setBoletoModalOpen(false)}
        paymentData={selectedPayment}
      />

      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        paymentData={selectedPayment}
      />
    </div>
  )
}
