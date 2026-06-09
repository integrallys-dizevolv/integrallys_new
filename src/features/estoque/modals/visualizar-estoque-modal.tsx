'use client'

import { X } from 'lucide-react'

import type { EstoqueItem } from '@/features/estoque/hooks/use-estoque'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface VisualizarEstoqueModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  item: EstoqueItem | null
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('baixo') || normalized.includes('crit')) {
    return 'bg-[var(--app-warning-text)] dark:bg-transparent dark:text-[var(--app-warning-text)] text-white'
  }
  return 'bg-[var(--app-success-text)] dark:bg-transparent dark:text-[var(--app-success-text)] text-white'
}

export function VisualizarEstoqueModal({ isOpen, onClose, item }: VisualizarEstoqueModalProps) {
  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[600px] p-8 rounded-[24px] bg-white dark:bg-app-bg-dark border-none shadow-2xl block custom-scrollbar"
      >
        <DialogTitle className="sr-only">Detalhes do item</DialogTitle>

        <div className="flex justify-between items-start mb-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-normal text-app-text-primary dark:text-white tracking-tight">
              Detalhes do item
            </h2>
            <p className="text-base text-app-text-muted dark:text-app-text-muted font-normal">
              Visualização das informações de estoque
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-app-border dark:border-app-border-dark bg-white dark:bg-transparent hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-app-text-muted" />
          </button>
        </div>

        <div className="space-y-8">
          <div className="space-y-1.5">
            <p className="text-sm font-normal text-app-text-muted tracking-wider">Nome do produto</p>
            <p className="text-xl font-normal text-app-text-primary dark:text-white">{item.produto}</p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1.5">
              <p className="text-sm font-normal text-app-text-muted tracking-wider">Categoria</p>
              <p className="text-lg font-normal text-app-text-primary dark:text-white">{item.categoria}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-normal text-app-text-muted tracking-wider">Status</p>
              <div>
                <Badge className={`px-4 py-1.5 rounded-full text-xs font-normal border-0 transition-colors shadow-sm ${getStatusTone(item.status)}`}>
                  {item.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-sm font-normal text-app-text-muted tracking-wider">Quantidade atual</p>
              <p className="text-2xl font-normal text-app-text-primary dark:text-white">{item.quantidade} un</p>
              <Badge className={`px-4 py-1.5 rounded-full text-xs font-normal border-0 transition-colors shadow-sm ${getStatusTone(item.status)}`}>
                {item.status.toLowerCase().includes('baixo') || item.status.toLowerCase().includes('crit') ? 'Estoque baixo' : 'Disponível'}
              </Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-normal text-app-text-muted tracking-wider">Atualização</p>
              <p className="text-2xl font-normal text-app-text-primary dark:text-white">API</p>
              <p className="text-sm text-app-text-muted dark:text-app-text-muted">Dados sincronizados com o estoque atual.</p>
            </div>
          </div>

          <div className="space-y-6 pt-2">
            <div className="space-y-1.5">
              <p className="text-sm font-normal text-app-text-muted tracking-wider">Referência operacional</p>
              <p className="text-lg font-normal text-app-text-primary dark:text-white">Movimentações desta tela usam o saldo atual do item.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-12">
          <Button
            onClick={() => onClose(false)}
            className="bg-app-primary hover:bg-app-primary-hover text-white px-10 h-12 rounded-[12px] font-normal shadow-lg shadow-[var(--app-primary)]/20 transition-all hover:scale-[1.02]"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
