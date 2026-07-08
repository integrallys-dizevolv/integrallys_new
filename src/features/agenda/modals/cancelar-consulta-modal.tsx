'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ConsultaInfo {
  id?: string
  paciente: string
  especialista: string
  horario: string
  tipo: string
}

interface CancelarConsultaModalProps {
  isOpen: boolean
  onClose: () => void
  consulta?: ConsultaInfo | null
  onConfirm?: (payload: { id: string; reason: string }) => Promise<void> | void
}

export function CancelarConsultaModal({ isOpen, onClose, consulta, onConfirm }: CancelarConsultaModalProps) {
  const [reason, setReason] = useState('')

  const item = consulta ?? {
    id: '',
    paciente: 'Paciente',
    especialista: 'Especialista',
    horario: '08:00',
    tipo: 'Consulta',
  }

  const trimmedReason = reason.trim()
  const isMinReasonValid = trimmedReason.length >= 10

  const handleClose = () => {
    setReason('')
    onClose()
  }

  const handleConfirm = async () => {
    if (!item.id || !isMinReasonValid) return
    await onConfirm?.({ id: item.id, reason: trimmedReason })
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-app-card dark:bg-app-card-dark">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-normal">
            <AlertTriangle className="h-5 w-5 text-[var(--app-danger-text)]" />
            Justificativa de Cancelamento
          </DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento para registro no histórico e relatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6 pt-0">
          <div className="app-status-warning rounded-integrallys p-4 text-xs">
            <p>O agendamento permanecerá no histórico do cliente como &quot;Cancelado&quot;, mas o horário ficará disponível para novos agendamentos na agenda.</p>
          </div>

          <div className="space-y-2 rounded-integrallys bg-app-bg-secondary p-4 dark:bg-app-bg-dark/50">
            <h4 className="text-xs font-medium uppercase tracking-wider text-app-text-muted dark:text-white/40">Atendimento selecionado</h4>
            <div className="space-y-1 text-xs">
              <p className="text-app-text-primary dark:text-white">
                <span className="text-app-text-secondary dark:text-app-text-muted">Paciente:</span> {item.paciente}
              </p>
              <p className="text-app-text-primary dark:text-white">
                <span className="text-app-text-secondary dark:text-app-text-muted">Horário:</span> {item.horario} • {item.tipo}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Motivo do cancelamento (Obrigatório) *</Label>
            <Input
              placeholder="Ex: Cliente não pôde comparecer por motivos de saúde"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-11 border-app-border dark:border-app-border-dark"
            />
            <p className="text-xs text-app-text-muted">Informe no mínimo 10 caracteres.</p>
          </div>
        </div>

        <DialogFooter className="gap-3 p-6 pt-0 sm:gap-0">
          <Button variant="outline" onClick={handleClose} className="h-11 w-full rounded-integrallys px-6 sm:w-auto">
            Voltar
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!isMinReasonValid}
            className="h-11 w-full rounded-integrallys bg-[var(--app-danger-text)] px-8 font-normal text-white shadow-sm transition-all active:scale-[0.98] hover:bg-[var(--app-danger-text)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Confirmar e Liberar Horário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
