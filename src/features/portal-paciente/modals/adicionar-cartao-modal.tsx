'use client'

import { useState } from 'react'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface AdicionarCartaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { bandeira: string; final: string; titular: string }) => Promise<void>
}

export function AdicionarCartaoModal({ open, onOpenChange, onSave }: AdicionarCartaoModalProps) {
  const [bandeira, setBandeira] = useState('')
  const [final4, setFinal4] = useState('')
  const [titular, setTitular] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setBandeira('')
    setFinal4('')
    setTitular('')
  }

  const handleSave = async () => {
    if (!bandeira || !final4 || !titular) return
    setSaving(true)
    try {
      await onSave({ bandeira, final: final4, titular })
      reset()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent size="sm" className="w-[95vw] p-6 sm:p-8 rounded-[20px] bg-app-card dark:bg-app-card-dark border-none shadow-2xl gap-6">
        <ModalHeader title="Adicionar Cartao" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-600 dark:text-slate-300">Bandeira</Label>
            <Select value={bandeira} onValueChange={setBandeira}>
              <SelectTrigger className="h-11 rounded-integrallys bg-slate-50 border-slate-200 dark:bg-app-surface-muted dark:border-slate-700">
                <SelectValue placeholder="Selecione a bandeira" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visa">Visa</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
                <SelectItem value="Elo">Elo</SelectItem>
                <SelectItem value="Amex">Amex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-600 dark:text-slate-300">Ultimos 4 digitos</Label>
            <Input
              placeholder="0000"
              maxLength={4}
              value={final4}
              onChange={(e) => setFinal4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="h-11 rounded-integrallys bg-slate-50 border-slate-200 dark:bg-app-surface-muted dark:border-slate-700 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-600 dark:text-slate-300">Nome do Titular</Label>
            <Input
              placeholder="Como está no cartão"
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              className="h-11 rounded-integrallys bg-slate-50 border-slate-200 dark:bg-app-surface-muted dark:border-slate-700"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 mt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            onClick={() => { reset(); onOpenChange(false) }}
            className="h-11 px-4 rounded-integrallys w-full sm:w-auto border-slate-200 dark:border-slate-700 whitespace-nowrap"
          >
            Cancelar
          </Button>
          <Button
            disabled={saving || !bandeira || !final4 || !titular}
            onClick={handleSave}
            className="h-11 px-4 rounded-integrallys w-full sm:w-auto bg-app-primary hover:bg-app-primary-hover text-white whitespace-nowrap"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar Cartao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
