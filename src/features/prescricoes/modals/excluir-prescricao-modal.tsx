'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'
import type { PrescricaoItem } from '@/hooks/use-prescricoes'
import { toast } from 'sonner'

interface ExcluirPrescricaoModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  prescricao: PrescricaoItem | null
  onConfirm: (prescricao: PrescricaoItem) => Promise<void> | void
}

export function ExcluirPrescricaoModal({ isOpen, onClose, prescricao, onConfirm }: ExcluirPrescricaoModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  if (!prescricao) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(prescricao)
      toast.success('Prescrição excluída.')
      onClose(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir a prescrição.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton={true}
        className="sm:max-w-[480px] p-0 rounded-[20px] overflow-hidden border-none shadow-2xl"
      >
        <DialogTitle className="sr-only">Excluir prescrição</DialogTitle>
        <div className="bg-app-card dark:bg-app-card-dark p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full app-status-danger dark:bg-transparent flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-[#DC2626]" />
            </div>
            <h2 className="text-2xl font-normal text-app-text-primary dark:text-white tracking-tight">
              Excluir prescrição
            </h2>
          </div>

          <p className="text-[#6B7280] dark:text-app-text-muted text-base mb-8 leading-relaxed pl-[64px]">
            Tem certeza que deseja excluir a prescrição de <span className="text-app-text-primary dark:text-white">{prescricao.paciente}</span>?
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onClose(false)}
              className="h-10 px-6 rounded-lg border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white font-normal hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-all text-base"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleConfirm()}
              disabled={isLoading}
              className="h-10 px-8 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white font-normal shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] text-base"
            >
              {isLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
