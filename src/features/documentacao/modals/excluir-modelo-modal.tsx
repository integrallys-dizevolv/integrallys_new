'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'

interface ExcluirModeloModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentoNome?: string
  onConfirm: () => Promise<void>
}

export function ExcluirModeloModal({
  open,
  onOpenChange,
  documentoNome,
  onConfirm,
}: ExcluirModeloModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      await onConfirm()
      toast.success('Modelo excluído.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir o modelo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full p-0 overflow-hidden rounded-[32px] border-none bg-app-card dark:bg-app-card-dark shadow-2xl">
        <div className="p-10 text-center space-y-6">
          <div className="h-20 w-20 rounded-full app-status-danger flex items-center justify-center mx-auto">
            <AlertTriangle size={40} />
          </div>

          <div className="space-y-2">
            <DialogTitle className="text-2xl font-medium text-app-text-primary dark:text-white">
              Excluir Modelo?
            </DialogTitle>
            <p className="text-sm text-app-text-muted dark:text-app-text-muted font-normal">
              Você está prestes a excluir o modelo <span className="font-bold text-app-text-primary dark:text-white">&quot;{documentoNome}&quot;</span>. Esta ação não poderá ser desfeita.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-6 sm:px-10 sm:py-8 bg-app-bg-secondary/50 dark:bg-app-card/5 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full sm:w-auto px-8 rounded-xl border-app-border dark:border-app-border-dark text-app-text-muted dark:text-app-text-muted font-medium hover:bg-app-bg-secondary dark:hover:bg-app-hover"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={isLoading}
            className="h-12 w-full sm:w-auto px-8 rounded-xl bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white font-medium flex gap-2 items-center justify-center"
          >
            <Trash2 size={18} /> {isLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
