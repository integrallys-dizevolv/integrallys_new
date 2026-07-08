'use client'

import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { ModalHeader } from '@/components/shared/modal-header'
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
import type { NovoCartaoInput } from '../hooks/use-cartoes-empresariais'

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outro']

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: NovoCartaoInput) => Promise<void>
  isSubmitting?: boolean
}

interface FormState {
  nome: string
  bandeira: string
  ultimosDigitos: string
  limiteTotal: string
  diaVencimento: string
}

const INITIAL: FormState = {
  nome: '',
  bandeira: '',
  ultimosDigitos: '',
  limiteTotal: '',
  diaVencimento: '',
}

export function NovoCartaoModal({ open, onClose, onSubmit, isSubmitting }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL)

  useEffect(() => {
    if (!open) setForm(INITIAL)
  }, [open])

  const handleSave = async () => {
    if (!form.nome.trim()) return
    const limiteTotal = Number(form.limiteTotal.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
    const diaVencimento = form.diaVencimento ? Math.max(1, Math.min(31, Number(form.diaVencimento))) : null
    await onSubmit({
      nome: form.nome.trim(),
      bandeira: form.bandeira || null,
      ultimosDigitos: form.ultimosDigitos.replace(/\D/g, '').slice(-4) || null,
      limiteTotal,
      diaVencimento,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent size="lg" className="gap-0 rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
        <div className="flex flex-col bg-app-card dark:bg-app-card-dark">
          <ModalHeader
            className="px-8 pb-6 pt-8"
            icon={CreditCard}
            title="Novo cartão empresarial"
            description="Cadastre os dados básicos do cartão corporativo da clínica."
          />

          <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3 md:col-span-2">
                <Label>Nome do cartão</Label>
                <Input
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  placeholder="Ex.: Nubank Empresarial"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <Label>Bandeira</Label>
                <Select
                  value={form.bandeira}
                  onValueChange={(value) => setForm((current) => ({ ...current, bandeira: value }))}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANDEIRAS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Últimos dígitos</Label>
                <Input
                  value={form.ultimosDigitos}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ultimosDigitos: event.target.value.replace(/\D/g, '').slice(0, 4),
                    }))
                  }
                  placeholder="4321"
                  inputMode="numeric"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <Label>Limite total (R$)</Label>
                <Input
                  value={form.limiteTotal}
                  onChange={(event) => setForm((current) => ({ ...current, limiteTotal: event.target.value }))}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <Label>Dia de vencimento da fatura</Label>
                <Input
                  value={form.diaVencimento}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      diaVencimento: event.target.value.replace(/\D/g, '').slice(0, 2),
                    }))
                  }
                  placeholder="Ex.: 10"
                  inputMode="numeric"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-app-border bg-app-bg-secondary/35 px-8 py-6 dark:border-app-border-dark dark:bg-app-hover/30">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-xl px-6">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSubmitting || !form.nome.trim()}
              className="h-11 rounded-xl bg-app-primary px-6 text-white"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar cartão'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
