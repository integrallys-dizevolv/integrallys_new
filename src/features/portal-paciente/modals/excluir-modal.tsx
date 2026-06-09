'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ExcluirModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  documentId?: string
}

export function ExcluirModal({ isOpen, onClose, onConfirm, documentId }: ExcluirModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm" className="w-[95vw] p-0 rounded-[24px] border-none bg-app-card dark:bg-app-card-dark shadow-2xl flex flex-col transition-all duration-300">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-[var(--app-danger-text)]" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 mt-2">
            Tem certeza que deseja excluir o documento {documentId && <span className="font-bold text-gray-900 dark:text-gray-100">{documentId}</span>}? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-2 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="whitespace-nowrap rounded-[5px]">
            Cancelar
          </Button>
          <Button className="whitespace-nowrap bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white rounded-[5px]" onClick={onConfirm}>
            Sim, excluir documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
