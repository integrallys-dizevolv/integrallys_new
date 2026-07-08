'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ExcluirAnamneseModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  pacienteNome?: string
}

export function ExcluirAnamneseModal({
  isOpen,
  onClose,
  onConfirm,
  pacienteNome,
}: ExcluirAnamneseModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      await onConfirm()
      toast.success('Anamnese excluída.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir a anamnese.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton={true}
        className="sm:max-w-[500px] p-0 rounded-[24px] overflow-hidden border-none shadow-2xl"
      >
        <div className="bg-app-card dark:bg-app-card-dark p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-full app-status-danger dark:bg-transparent flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)]" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white">
                Excluir anamnese
              </DialogTitle>
            </DialogHeader>
          </div>

          <p className="text-app-text-muted dark:text-app-text-muted text-base mb-8 leading-relaxed">
            Tem certeza que deseja excluir a anamnese de{' '}
            <span className="font-normal text-app-text-primary dark:text-white">
              {pacienteNome}
            </span>
            ? Esta ação não poderá ser desfeita.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 px-6 rounded-xl border-app-border dark:border-app-border-dark text-app-text-secondary dark:text-white/60 font-normal hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-all"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleConfirm()}
              disabled={isLoading}
              className="h-11 px-8 rounded-xl bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white font-normal shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02]"
            >
              {isLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
