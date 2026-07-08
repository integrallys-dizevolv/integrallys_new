'use client'

import { useEffect, useState } from 'react'
import { Calendar, CreditCard } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CobrarOnlineModal } from '@/features/financeiro/modals/cobrar-online-modal'

interface CobrancaInfo {
  paciente: string
  profissional: string
  horario: string
  valorProcedimento?: number
  totalPago?: number
  dataPagamentoAnterior?: string
}

interface EmitirCobrancaModalProps {
  isOpen: boolean
  onClose: () => void
  agenda?: CobrancaInfo | null
  /** Opcional: vincula a cobrança online ao agendamento (não-bloqueante). */
  agendamentoId?: string
  onConfirm: (payload: { descricao: string; valor: number; metodo: string; observacoes: string }) => Promise<void> | void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const formatDateBR = (value: string) => {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function EmitirCobrancaModal({ isOpen, onClose, agenda, agendamentoId, onConfirm }: EmitirCobrancaModalProps) {
  const [metodo, setMetodo] = useState<string>('')
  const [valorRecebido, setValorRecebido] = useState<string>('')
  const [observacao, setObservacao] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [cobrarOnlineOpen, setCobrarOnlineOpen] = useState(false)

  const valorEfetivo = agenda?.valorProcedimento ?? 0
  const totalPago = agenda?.totalPago ?? 0
  const saldoRestante = valorEfetivo - totalPago
  const temPagamentoParcial = totalPago > 0 && saldoRestante > 0

  const descricao = agenda ? `Cobrança de consulta - ${agenda.paciente}` : 'Cobrança de consulta'

  useEffect(() => {
    if (!isOpen) {
      setMetodo('')
      setValorRecebido('')
      setObservacao('')
      setError('')
    }
  }, [isOpen])

  const handleConfirm = async () => {
    const parsed = Number(String(valorRecebido).replace(',', '.'))

    if (!metodo) {
      setError('Selecione o método de pagamento.')
      return
    }

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Informe um valor válido.')
      return
    }

    await onConfirm({
      descricao,
      valor: Number(parsed.toFixed(2)),
      metodo,
      observacoes: observacao.trim(),
    })
  }

  const valorOnline = saldoRestante > 0 ? saldoRestante : valorEfetivo

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-app-card dark:bg-app-card-dark">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-normal">
            <CreditCard className="h-5 w-5 text-[var(--app-primary)]" />
            Emitir nova cobrança
          </DialogTitle>
          <DialogDescription>Preencha os dados para registrar o recebimento</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6 pt-0">
          <div className="rounded-integrallys bg-app-bg-secondary p-3 dark:bg-app-bg-dark/50">
            <p className="mb-1 text-sm font-medium text-app-text-primary dark:text-white">
              Paciente: {agenda?.paciente ?? 'Paciente'}
            </p>
            <p className="text-xs text-[var(--app-text-secondary)] dark:text-app-text-muted">
              {agenda?.profissional ?? 'Profissional'} • {agenda?.horario ?? '--:--'}
            </p>
          </div>

          <div className="app-status-info space-y-3 rounded-integrallys border border-transparent p-4">
            <h4 className="text-sm font-normal text-[var(--app-info-text)]">Resumo da cobrança</h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <p className="text-[var(--app-text-secondary)] dark:text-app-text-muted">Valor total do serviço:</p>
                <p className="font-normal text-app-text-primary dark:text-white">{formatCurrency(valorEfetivo)}</p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <p className="text-[var(--app-text-secondary)] dark:text-app-text-muted">Total já pago:</p>
                <p className="font-normal text-[var(--app-success-text)] dark:text-[var(--app-success-text)]">
                  {formatCurrency(totalPago)}
                </p>
              </div>

              {temPagamentoParcial && agenda?.dataPagamentoAnterior && (
                <div className="flex items-center justify-between text-xs">
                  <p className="text-[var(--app-text-secondary)] dark:text-app-text-muted">Data do pagamento anterior:</p>
                  <p className="font-normal text-app-text-primary dark:text-white">
                    {formatDateBR(agenda.dataPagamentoAnterior)}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-[#bedbff] pt-2 text-xs dark:border-transparent">
                <p className="font-medium text-app-text-primary dark:text-white">Saldo a receber:</p>
                <p className="text-sm font-bold text-app-primary dark:text-[var(--app-info-text)]">
                  {formatCurrency(saldoRestante > 0 ? saldoRestante : valorEfetivo)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de pagamento *</Label>
            <Select
              value={metodo}
              onValueChange={(value) => {
                setMetodo(value)
                setError('')
              }}
            >
              <SelectTrigger>
                <SelectValue preferPlaceholder placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor a receber agora (R$) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-app-text-secondary dark:text-app-text-muted">
                R$
              </span>
              <Input
                placeholder="0,00"
                type="number"
                step="0.01"
                className="h-11 pl-10"
                value={valorRecebido}
                onChange={(e) => {
                  setValorRecebido(e.target.value)
                  setError('')
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder="Informações adicionais sobre o recebimento..."
              className="min-h-[80px] resize-none"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 text-xs text-app-text-muted">
            <Calendar className="h-3 w-3" />
            {formatDateBR(new Date().toISOString().split('T')[0])}
          </div>

          {error && <p className="text-xs text-[var(--app-danger-text)]">{error}</p>}
        </div>

        <DialogFooter className="gap-3 p-6 pt-0 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="h-11 w-full rounded-integrallys px-6 sm:w-auto">
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => setCobrarOnlineOpen(true)}
            className="h-11 w-full rounded-integrallys px-6 sm:w-auto"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Cobrar online
          </Button>
          <Button
            onClick={handleConfirm}
            className="h-11 w-full rounded-integrallys bg-app-primary px-8 font-normal text-white shadow-sm transition-all active:scale-[0.98] hover:bg-app-primary-hover sm:w-auto"
          >
            Confirmar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <CobrarOnlineModal
      isOpen={cobrarOnlineOpen}
      onClose={(open) => setCobrarOnlineOpen(open)}
      agendamentoId={agendamentoId}
      valor={valorOnline}
      descricao={descricao}
    />
    </>
  )
}
