'use client'

import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AlterarFotoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AlterarFotoModal({ isOpen, onClose }: AlterarFotoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm" className="w-[95vw] rounded-[24px] border-none bg-app-card p-0 shadow-2xl dark:bg-app-card-dark">
        <DialogHeader className="px-6 pb-2 pt-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-app-text-primary dark:text-white">Alterar foto</DialogTitle>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <DialogDescription className="text-sm text-app-text-secondary dark:text-white/60">
            Atualize sua foto de perfil. Formatos aceitos: JPG, PNG ou GIF.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[18px] border border-dashed border-app-border bg-app-bg-secondary text-center dark:border-app-border-dark dark:bg-app-hover">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-app-primary/10 text-app-primary">
              <ImagePlus className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-app-text-primary dark:text-white">Selecione uma nova imagem</p>
            <p className="mt-1 text-xs text-app-text-secondary dark:text-white/60">Máximo de 2MB</p>
          </div>
        </div>

        <DialogFooter className="gap-3 px-6 pb-6">
          <Button variant="outline" className="h-11 rounded-integrallys px-6" onClick={onClose}>Cancelar</Button>
          <Button className="h-11 rounded-integrallys bg-app-primary px-6 text-white hover:bg-app-primary-hover" onClick={onClose}>Salvar foto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
