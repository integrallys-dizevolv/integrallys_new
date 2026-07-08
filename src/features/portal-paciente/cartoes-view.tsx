'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, CreditCard, Plus } from 'lucide-react'
import { useCartoes } from './hooks/use-cartoes'
import { PageHeader } from '@/components/shared/page-header'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function CartoesView() {
  const { data, error, isLoading, createCartao } = useCartoes()
  const [saving, setSaving] = useState(false)

  return (
    <div className="app-page">
      <PageHeader
        title="Meus Cartões"
        description="Gerencie seus cartões de crédito cadastrados"
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="cursor-pointer">Início</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/portal/pagamentos" className="cursor-pointer">Pagamentos</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="h-11 gap-2 rounded-integrallys px-4 whitespace-nowrap"
            >
              <Link href="/portal/pagamentos" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                try {
                  await createCartao({ bandeira: 'Visa', final: '1234', titular: 'Paciente' })
                } finally {
                  setSaving(false)
                }
              }}
              className="h-11 gap-2 rounded-integrallys bg-app-primary px-4 text-white hover:bg-app-primary-hover whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Adicionar Cartão
            </Button>
          </>
        }
      />

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}
      {isLoading && <p className="text-app-text-secondary">Carregando cartoes...</p>}
      {!isLoading && data.length === 0 && (
        <Card className="rounded-[20px] border border-dashed border-app-border dark:border-app-border-dark">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-bg-secondary text-app-primary dark:bg-app-hover">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-app-text-primary dark:text-white">Nenhum cartão cadastrado</p>
              <p className="text-sm text-app-text-secondary dark:text-white/60">
                Adicione um cartão para agilizar seus pagamentos no portal.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 app-page-frame">
        {data.map((item) => (
          <Card key={item.id} className="overflow-hidden rounded-[20px] border-app-border dark:border-app-border-dark">
            <CardContent className="space-y-4 p-0">
              <div className="bg-gradient-to-br from-app-primary to-[#1f4dcf] p-6 text-white">
                <div className="mb-8 flex justify-between gap-4">
                  <div className="h-10 w-12 rounded bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-90 shadow-sm" />
                  <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                    {item.bandeira}
                  </div>
                </div>
                <p className="font-mono text-xl tracking-widest">•••• •••• •••• {item.final}</p>
              </div>
              <div className="space-y-1 px-6 pb-6">
                <p className="text-sm text-app-text-secondary dark:text-white/60">Titular</p>
                <p className="text-base font-medium text-app-text-primary dark:text-white">{item.titular}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
