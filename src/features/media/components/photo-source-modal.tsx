'use client'

import { Camera, Upload, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PhotoSourceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectCamera: () => void
  onSelectUpload: () => void
}

export function PhotoSourceModal({ open, onOpenChange, onSelectCamera, onSelectUpload }: PhotoSourceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="p-0 overflow-hidden bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark rounded-[24px]">
        <div className="p-6 relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 p-2 text-app-text-muted hover:text-app-text-primary dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-semibold text-app-text-primary dark:text-white">Escolher origem da foto</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3">
            <Button type="button" variant="outline" className="h-14 justify-start gap-3" onClick={onSelectCamera}>
              <Camera className="h-5 w-5" />
              Usar câmera
            </Button>
            <Button type="button" variant="outline" className="h-14 justify-start gap-3" onClick={onSelectUpload}>
              <Upload className="h-5 w-5" />
              Fazer upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
