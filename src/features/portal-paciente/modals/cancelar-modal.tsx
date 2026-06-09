'use client'

import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'

interface CancelarModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function CancelarModal({ isOpen, onClose, onConfirm }: CancelarModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm" className="w-[95vw] p-0 rounded-[24px] border-none bg-app-card dark:bg-app-card-dark shadow-2xl flex flex-col transition-all duration-300">
        <ModalHeader
          className="px-6 pt-6 pb-2"
          title="Cancelar Consulta"
          description="Tem certeza que deseja cancelar esta consulta? Esta ação não pode ser desfeita."
        />
        <DialogFooter className="gap-2 sm:gap-0 mt-2 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="whitespace-nowrap rounded-[5px]">
            Não, manter consulta
          </Button>
          <Button className="whitespace-nowrap bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white rounded-[5px]" onClick={onConfirm}>
            Sim, cancelar consulta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
