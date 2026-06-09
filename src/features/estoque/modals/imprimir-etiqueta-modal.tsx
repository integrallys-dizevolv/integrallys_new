'use client'

import { Printer } from 'lucide-react'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import type { EstoqueItem } from '../hooks/use-estoque'

interface ImprimirEtiquetaModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  item: EstoqueItem | null
}

function formatValidade(validade?: string) {
  if (!validade) return '—'
  const raw = validade.length >= 10 ? validade.slice(0, 10) : validade
  const parts = raw.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return validade
}

export function ImprimirEtiquetaModal({ isOpen, onClose, item }: ImprimirEtiquetaModalProps) {
  if (!item) return null

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        size="md"
        className="rounded-[24px] bg-app-card dark:bg-app-card-dark p-0 border border-app-border dark:border-app-border-dark flex flex-col"
      >
        <ModalHeader
          icon={Printer}
          className="border-b border-app-border dark:border-app-border-dark px-6 py-5 shrink-0 print:hidden"
          title="Imprimir etiqueta"
          description="Pré-visualize e envie a etiqueta para impressão."
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 print:p-0">
          <div
            id="etiqueta-print-area"
            className="rounded-[16px] border border-dashed border-app-border dark:border-app-border-dark bg-white text-black p-6 space-y-3 print:border-0 print:rounded-none print:p-4"
          >
            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Etiqueta de lote</p>
              <h3 className="text-2xl font-semibold leading-tight">{item.produto}</h3>
              <p className="text-xs text-gray-600">{item.categoria}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Lote</p>
                <p className="font-medium">{item.lote || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Validade</p>
                <p className="font-medium">{formatValidade(item.validade)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Quantidade</p>
                <p className="font-medium">{item.quantidade} un.</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">ID</p>
                <p className="font-medium font-mono text-xs">{item.id}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="font-mono text-xl tracking-widest text-center select-none">
                ||| ||| | ||| || |||
              </div>
              <p className="text-[10px] text-center text-gray-500 mt-1 font-mono tracking-wider">
                {item.id}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-app-border dark:border-app-border-dark px-6 py-4 shrink-0 bg-app-card dark:bg-app-card-dark print:hidden">
          <Button variant="outline" onClick={() => onClose(false)}>
            Fechar
          </Button>
          <Button
            className="bg-app-primary hover:bg-app-primary-hover text-white"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-1" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
