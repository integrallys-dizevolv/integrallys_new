'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface ExcluirProntuarioModalProps {
  isOpen: boolean
  onClose: () => void
  pacienteNome?: string
  onConfirm: () => Promise<void>
}

export function ExcluirProntuarioModal({
  isOpen,
  onClose,
  pacienteNome = 'Paciente selecionado',
  onConfirm,
}: ExcluirProntuarioModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      toast.success('Prontuário excluído.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir o prontuário.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton={true}
        className="sm:max-w-[550px] p-0 rounded-[20px] overflow-hidden border-none shadow-2xl"
      >
        <DialogTitle className="sr-only">Excluir prontuário</DialogTitle>
        <div className="bg-app-card dark:bg-app-card-dark p-10">
          <div className="flex items-center gap-5 mb-6">
            <div className="h-14 w-14 rounded-full bg-[#fef2f2] dark:bg-transparent flex items-center justify-center shrink-0">
              <AlertTriangle className="h-7 w-7 text-[#dc2626] dark:text-[var(--app-danger-text)]" />
            </div>
            <h2 className="text-2xl font-normal text-app-text-primary dark:text-white tracking-tight">
              Excluir prontuário
            </h2>
          </div>

          <p className="text-[#64748b] dark:text-app-text-muted text-lg leading-relaxed mb-10 font-normal">
            Tem certeza que deseja excluir o prontuário de <span className="font-normal text-app-text-primary dark:text-white">{pacienteNome}</span>? Esta ação não pode ser desfeita.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 px-8 rounded-[12px] border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white font-normal text-base hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-all bg-white dark:bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              className="h-12 px-10 rounded-[12px] bg-[#e11d48] hover:bg-[#be123c] text-white font-normal text-base shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02]"
              onClick={() => void handleConfirm()}
              disabled={isLoading}
            >
              {isLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
