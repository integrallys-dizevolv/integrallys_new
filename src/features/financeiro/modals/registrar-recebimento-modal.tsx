'use client'

import { useEffect, useState } from 'react'
import { DollarSign } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface RegistrarRecebimentoModalProps {
  isOpen: boolean
  onClose: () => void
  pacienteNome?: string
  transacaoId?: string
  onSave: (payload: {
    transacaoId?: string
    metodo: string
    valor: string
    observacao?: string
  }) => Promise<void>
}

export function RegistrarRecebimentoModal({
  isOpen,
  onClose,
  pacienteNome,
  transacaoId,
  onSave,
}: RegistrarRecebimentoModalProps) {
  const [metodo, setMetodo] = useState('Pix')
  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setMetodo('Pix')
    setValor('')
    setObservacao('')
    setIsSaving(false)
  }, [isOpen, transacaoId])

  const handleSave = async () => {
    if (!metodo || !valor.trim()) {
      toast.error('Informe método e valor do recebimento.')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        transacaoId,
        metodo,
        valor,
        observacao: observacao.trim() || undefined,
      })
      toast.success('Recebimento registrado.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível registrar o recebimento.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
        <div className="bg-app-card p-8 dark:bg-app-card-dark">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-normal text-app-text-primary dark:text-white">
              <DollarSign className="h-5 w-5 text-[var(--app-primary)]" />
              Registrar recebimento
            </DialogTitle>
            <DialogDescription className="text-sm text-app-text-muted">
              {pacienteNome
                ? `Confirme o recebimento vinculado a ${pacienteNome}.`
                : 'Preencha os dados para registrar o recebimento.'}
            </DialogDescription>
          </DialogHeader>

          {pacienteNome && (
            <div className="mt-6 rounded-[18px] border border-app-border bg-app-bg-secondary/40 p-4 dark:border-app-border-dark dark:bg-app-bg-dark/40">
              <p className="text-xs uppercase tracking-[0.16em] text-app-text-muted">Paciente vinculado</p>
              <p className="mt-2 text-base font-normal text-app-text-primary dark:text-white">{pacienteNome}</p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Método de pagamento</Label>
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger className="h-12 rounded-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                placeholder="0,00"
                className="h-12 rounded-[12px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                placeholder="Informações adicionais sobre o recebimento..."
                className="min-h-[120px] rounded-[12px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-8">
            <Button variant="outline" onClick={onClose} className="h-11 rounded-[12px] px-6">Cancelar</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving} className="h-11 rounded-[12px] px-6 text-white">
              {isSaving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
