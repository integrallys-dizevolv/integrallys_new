'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import type { CartaoItem } from '../hooks/use-cartoes'

interface ExcluirCartaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartao: CartaoItem | null
  onConfirm: () => Promise<void>
}

export function ExcluirCartaoModal({ open, onOpenChange, cartao, onConfirm }: ExcluirCartaoModalProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="w-[95vw] p-6 sm:p-8 rounded-[20px] bg-app-card dark:bg-app-card-dark border-none shadow-2xl gap-6">
        <ModalHeader
          title="Excluir Cartao"
          description={
            <>
              Tem certeza que deseja remover o cartao com final{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {cartao?.final}
              </span>
              ? Esta acao nao pode ser desfeita.
            </>
          }
        />

        {cartao && (
          <div className="rounded-integrallys-lg bg-gradient-to-br from-app-primary to-[#1f4dcf] p-5 text-white">
            <div className="mb-6 flex justify-between items-center">
              <div className="h-8 w-10 rounded bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-90 shadow-sm" />
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                {cartao.bandeira}
              </span>
            </div>
            <p className="font-mono text-lg tracking-widest mb-3">
              **** **** **** {cartao.final}
            </p>
            <p className="text-sm text-white/80">{cartao.titular}</p>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse gap-2 mt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 rounded-integrallys w-full sm:w-auto border-slate-200 dark:border-slate-700 whitespace-nowrap"
          >
            Cancelar
          </Button>
          <Button
            disabled={loading}
            onClick={handleConfirm}
            className="h-11 px-6 rounded-integrallys w-full sm:w-auto bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white whitespace-nowrap"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir Cartao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
