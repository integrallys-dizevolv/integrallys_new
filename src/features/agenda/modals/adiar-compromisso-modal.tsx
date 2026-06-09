'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Calendar, Clock, X } from 'lucide-react'

import { DateInput } from '@/components/shared/date-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AdiarCompromissoModalProps {
  isOpen: boolean
  onClose: () => void
  compromissoId?: string
  compromissoTitulo?: string
  onSave: (payload: { id: string; novaData: string; novaHora: string; motivo?: string }) => Promise<void>
}

export function AdiarCompromissoModal({
  isOpen,
  onClose,
  compromissoId,
  compromissoTitulo,
  onSave,
}: AdiarCompromissoModalProps) {
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [motivo, setMotivo] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setNovaData('')
    setNovaHora('')
    setMotivo('')
    setIsSaving(false)
  }, [isOpen, compromissoId])

  const handleSave = async () => {
    if (!compromissoId || !novaData || !novaHora) {
      toast.error('Informe a nova data e horário do compromisso.')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        id: compromissoId,
        novaData,
        novaHora,
        motivo: motivo.trim() || undefined,
      })
      toast.success('Compromisso adiado.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível adiar o compromisso.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[600px] p-8 rounded-[24px] bg-app-card dark:bg-app-card-dark border border-app-border dark:border-app-border-dark shadow-lg gap-8 custom-scrollbar"
      >
        <DialogTitle className="sr-only">Adiar compromisso</DialogTitle>
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-normal text-app-text-primary dark:text-white leading-tight">
              Adiar compromisso
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-app-text-muted" />
            </button>
          </div>

          <div className="bg-app-bg-secondary dark:bg-app-table-header-dark border border-app-border dark:border-app-border-dark rounded-[12px] p-5">
            <h4 className="font-normal text-app-text-primary dark:text-white text-lg mb-2">
              {compromissoTitulo || 'Compromisso selecionado'}
            </h4>
            <div className="flex items-center gap-4 text-app-text-muted dark:text-app-text-muted text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{novaData || 'Selecione a nova data'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{novaHora || 'Selecione o novo horário'}</span>
              </div>
            </div>
          </div>

          <p className="text-app-primary dark:text-white font-normal">
            Selecione a nova data e horário:
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">Nova data *</Label>
              <div className="relative">
                <DateInput
                  value={novaData}
                  onChange={setNovaData}
                  className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-card-dark px-4"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">Novo horário *</Label>
              <div className="relative">
                <Input
                  type="time"
                  value={novaHora}
                  onChange={(event) => setNovaHora(event.target.value)}
                  className="h-12 rounded-[12px] border-app-border dark:border-app-border-dark bg-app-bg-secondary dark:bg-app-card-dark px-4 focus-visible:ring-[var(--app-primary)]"
                />
                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">
              Motivo do adiamento (opcional)
            </Label>
            <Textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              className="min-h-[120px] rounded-integrallys-lg border-app-border dark:border-app-border-dark bg-white dark:bg-transparent p-4 placeholder:text-app-text-muted focus-visible:ring-red-500/50 resize-none text-base"
            />
          </div>

          <div className="app-status-warning border border-transparent rounded-[12px] p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--app-warning-text)] dark:text-[var(--app-warning-text)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--app-warning-text)] leading-relaxed">
              O compromisso será reagendado para a nova data e horário. Todas as outras informações serão mantidas.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              className="h-12 px-8 rounded-integrallys bg-app-primary hover:bg-app-primary-hover text-white font-normal shadow-sm transition-all"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? 'Adiando...' : 'Adiar compromisso'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
