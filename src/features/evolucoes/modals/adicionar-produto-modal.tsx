'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Package, X } from 'lucide-react'

interface AdicionarProdutoModalProps {
  isOpen: boolean
  onClose: () => void
  pacienteNome?: string
}

export function AdicionarProdutoModal({ isOpen, onClose, pacienteNome }: AdicionarProdutoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[550px] p-6 md:p-8 rounded-[24px] bg-app-card dark:bg-app-card-dark border-none shadow-2xl block custom-scrollbar"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-app-text-primary dark:text-white" />
              <h2 className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">
                Adicionar produto
              </h2>
            </div>
            <p className="text-base text-app-text-muted font-normal">
              {pacienteNome ? `Prescrição para ${pacienteNome}` : 'Adicione um produto à prescrição do paciente'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-app-border dark:border-app-border-dark bg-white dark:bg-transparent hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-app-text-muted" />
          </button>
        </div>

        <div className="space-y-5 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">
              Nome do produto *
            </Label>
            <Input
              placeholder="Digite o nome do produto..."
              className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">
              Tipo *
            </Label>
            <Select>
              <SelectTrigger className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="rounded-[12px]">
                <SelectItem value="medicamento">Medicamento</SelectItem>
                <SelectItem value="suplemento">Suplemento</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">
              Modo de uso
            </Label>
            <Input
              placeholder="Ex: 1 dose com água"
              className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                Frequência
              </Label>
              <Input
                placeholder="Ex: Diariamente"
                className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                Horário ideal
              </Label>
              <Input
                placeholder="Ex: Café da manhã"
                className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end border-t border-app-border dark:border-app-border-dark pt-5">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-6 rounded-integrallys font-normal"
          >
            Cancelar
          </Button>
          <Button
            onClick={onClose}
            className="w-full sm:w-auto px-6 h-11 bg-app-primary hover:bg-app-primary-hover text-white rounded-integrallys font-normal shadow-sm gap-2"
          >
            <Package className="h-4 w-4" />
            Adicionar produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
