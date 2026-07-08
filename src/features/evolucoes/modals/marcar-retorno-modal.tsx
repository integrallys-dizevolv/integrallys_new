'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, X } from 'lucide-react'
import { toast } from 'sonner'

import { DateInput } from '@/components/shared/date-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface MarcarRetornoModalProps {
  isOpen: boolean
  onClose: () => void
  pacienteNome?: string
  onSave: (payload: {
    pacienteNome: string
    data: string
    hora: string
    especialista: string
    observacoes?: string
  }) => Promise<void>
}

export function MarcarRetornoModal({
  isOpen,
  onClose,
  pacienteNome,
  onSave,
}: MarcarRetornoModalProps) {
  const [prazo, setPrazo] = useState('30')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [especialista, setEspecialista] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setPrazo('30')
    setData('')
    setHora('')
    setEspecialista('')
    setObservacoes('')
    setIsSaving(false)
  }, [isOpen, pacienteNome])

  const handleClose = () => {
    if (isSaving) return
    onClose()
  }

  const handleSave = async () => {
    if (!pacienteNome || !data || !hora || !especialista.trim()) {
      toast.error('Preencha paciente, data, hora e especialista.')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        pacienteNome,
        data,
        hora,
        especialista: especialista.trim(),
        observacoes: observacoes.trim() || undefined,
      })
      toast.success('Retorno marcado.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível marcar o retorno.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[550px] p-6 md:p-8 rounded-[24px] bg-app-card dark:bg-app-card-dark border border-app-border dark:border-app-border-dark shadow-lg block custom-scrollbar"
      >
        <DialogTitle className="sr-only">Marcar retorno</DialogTitle>

        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">
              Marcar retorno
            </h2>
            <p className="text-base text-app-text-muted dark:text-app-text-muted font-normal">
              Agende o retorno do paciente para reavaliação
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-app-text-muted" />
          </button>
        </div>

        <div className="space-y-6 mb-8">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Paciente</Label>
            <Input
              readOnly
              value={pacienteNome ?? ''}
              className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-muted dark:text-app-text-muted font-normal"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Prazo para retorno</Label>
            <Input
              readOnly
              value={`${prazo} dias`}
              className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-muted dark:text-app-text-muted font-normal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">Data</Label>
              <DateInput
                value={data}
                onChange={setData}
                className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-primary dark:text-white pl-4"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">Hora</Label>
              <Input
                type="time"
                value={hora}
                onChange={(event) => setHora(event.target.value)}
                className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-primary dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Especialista</Label>
            <Input
              value={especialista}
              onChange={(event) => setEspecialista(event.target.value)}
              placeholder="Nome do especialista responsável"
              className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-primary dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">
              Observações para recepção (opcional)
            </Label>
            <Textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Instruções especiais para agendamento..."
              className="min-h-[100px] rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark resize-none p-4 text-base focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)]"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end w-full border-t border-app-border dark:border-app-border-dark pt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto h-11 px-6 rounded-integrallys font-normal text-app-text-primary dark:text-white hover:bg-app-bg-secondary dark:hover:bg-app-hover border-app-border dark:border-app-border-dark"
          >
            Cancelar
          </Button>
          <Button
            className="w-full sm:w-auto px-6 h-11 bg-app-primary hover:bg-app-primary-hover text-white rounded-integrallys font-normal shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            <CalendarCheck className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Confirmar retorno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
