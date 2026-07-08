'use client'

import { Download, Eye, FileText, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface ComprovanteLancamentoModalProps {
  isOpen: boolean
  onClose: () => void
  transacao: {
    id: string
    descricao: string
    valor: number
    data?: string
    tipo?: string
    categoria?: string
    status?: string
  } | null
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ComprovanteLancamentoModal({
  isOpen,
  onClose,
  transacao,
}: ComprovanteLancamentoModalProps) {
  if (!transacao) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton={true}
        className="max-w-[500px] w-[95%] bg-app-card dark:bg-app-card-dark p-0 overflow-hidden border-none rounded-[24px]"
      >
        <DialogTitle className="sr-only">Comprovante</DialogTitle>

        <div className="relative bg-app-card dark:bg-app-card-dark p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-bg-secondary hover:text-app-text-primary dark:border-app-border-dark dark:bg-app-card-dark dark:hover:bg-app-hover dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-app-bg-secondary dark:bg-app-card/5 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-app-text-secondary dark:text-white/60" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">Comprovante</h2>
              <p className="text-sm font-normal text-app-text-secondary dark:text-white/60">
                Visualização do lançamento financeiro
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="aspect-[16/9] rounded-2xl border border-dashed border-app-border bg-app-bg-secondary/45 p-4 text-center dark:border-app-border-dark dark:bg-app-card/5">
              <div className="flex h-full flex-col items-center justify-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-app-bg-secondary dark:bg-app-card/10">
                  <FileText className="h-6 w-6 text-app-text-muted" />
                </div>
                <p className="max-w-full truncate px-4 text-xs font-normal text-app-text-primary dark:text-white">
                  comprovante_lancamento_{transacao.id}.pdf
                </p>
                <p className="mt-1 text-xs font-normal uppercase tracking-widest text-app-text-secondary dark:text-white/60">
                  PDF • 1.2 MB
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-app-border bg-app-bg-secondary/35 p-4 dark:border-app-border-dark dark:bg-app-card/5">
              {[
                { label: 'Descrição', value: transacao.descricao },
                { label: 'Valor', value: formatCurrency(transacao.valor) },
                { label: 'Data', value: transacao.data || '-' },
                { label: 'Tipo', value: transacao.tipo || '-' },
                { label: 'Categoria', value: transacao.categoria || '-' },
                { label: 'Status', value: transacao.status || '-' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 text-xs">
                  <span className="font-normal text-app-text-muted">{item.label}:</span>
                  <span className="text-right text-sm font-normal text-app-text-primary dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => toast.info('Visualização em breve.')}
              className="h-11 flex-1 rounded-xl font-normal border-app-border dark:border-app-border-dark"
            >
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </Button>
            <Button
              onClick={() => toast.info('Download de comprovante em breve.')}
              className="h-11 flex-1 rounded-xl text-white font-normal"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar comprovante
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
