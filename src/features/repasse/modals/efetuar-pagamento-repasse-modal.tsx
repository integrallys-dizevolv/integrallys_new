'use client'

import { useEffect, useState } from 'react'
import { Check, WalletCards } from 'lucide-react'
import { toast } from 'sonner'

import type { RepasseItem } from '../hooks/use-repasse'
import { useRepasse } from '../hooks/use-repasse'
import { DateInput } from '@/components/shared/date-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EfetuarPagamentoRepasseModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  repasse: RepasseItem | null
  onSuccess?: () => void
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function EfetuarPagamentoRepasseModal({
  isOpen,
  onClose,
  repasse,
  onSuccess,
}: EfetuarPagamentoRepasseModalProps) {
  const { updateRepasse } = useRepasse()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [metodo, setMetodo] = useState('Pix')
  const [dataPagamento, setDataPagamento] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setStep('form')
    setMetodo('Pix')
    setDataPagamento('')
    setIsSaving(false)
  }, [isOpen, repasse?.id])

  if (!repasse) return null

  const handleConfirm = async () => {
    if (!dataPagamento) {
      toast.error('Informe a data de pagamento.')
      return
    }

    setIsSaving(true)
    try {
      await updateRepasse({
        id: repasse.id,
        status: 'Pago',
        pagoEm: new Date(`${dataPagamento}T00:00:00`).toISOString(),
      })
      toast.success('Pagamento de repasse registrado.')
      setStep('success')
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível efetuar o pagamento.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-app-card dark:bg-app-card-dark p-0 rounded-[24px] overflow-hidden border-none shadow-2xl">
        {step === 'form' ? (
          <div className="p-8">
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-3 text-xl font-normal text-app-text-primary dark:text-white">
                <div className="h-10 w-10 rounded-2xl bg-app-bg-secondary dark:bg-app-card/5 flex items-center justify-center">
                  <WalletCards className="h-5 w-5 text-app-text-secondary dark:text-white/60" />
                </div>
                Efetuar pagamento de repasse
              </DialogTitle>
              <DialogDescription>
                Confirme a liquidação do repasse para {repasse.profissional}.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div className="rounded-[16px] border border-app-border bg-app-bg-secondary/45 p-4 dark:border-app-border-dark dark:bg-app-card/5">
                <p className="text-xs uppercase tracking-[0.16em] text-app-text-muted">Valor do repasse</p>
                <p className="mt-2 text-2xl font-normal text-app-text-primary dark:text-white">{formatCurrency(repasse.valor)}</p>
              </div>

              <div className="space-y-2">
                <Label>Método de pagamento</Label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="TED">TED</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de pagamento</Label>
                <DateInput value={dataPagamento} onChange={setDataPagamento} />
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
              <Button onClick={() => void handleConfirm()} disabled={isSaving}>
                {isSaving ? 'Processando...' : 'Confirmar pagamento'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full app-status-success">
              <Check className="h-10 w-10 text-[var(--app-success-text)]" />
            </div>
            <h3 className="mt-6 text-2xl font-normal text-app-text-primary dark:text-white">Pagamento confirmado</h3>
            <p className="mt-2 text-sm text-app-text-muted">
              O repasse de {repasse.profissional} foi marcado como pago com sucesso.
            </p>
            <div className="mt-8">
              <Button onClick={() => onClose(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
