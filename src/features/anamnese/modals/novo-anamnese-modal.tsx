'use client'

import React, { useEffect, useState } from 'react'
import { Calendar, Activity, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePacientes } from '@/hooks/use-pacientes'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { NovaAnamneseInput } from '../hooks/use-anamnese'

interface NovoAnamneseModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: NovaAnamneseInput) => Promise<void>
  pacienteId?: string
  pacienteNome?: string
}

type FormState = {
  pacienteId: string
  data: string
  queixa: string
  peso: string
  imc: string
  gordura: string
}

const initialForm: FormState = {
  pacienteId: '',
  data: '',
  queixa: '',
  peso: '',
  imc: '',
  gordura: '',
}

function toNumber(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeDateInput(value: string) {
  const trimmed = value.trim()
  const parts = trimmed.split('/')
  if (parts.length === 3) {
    const [day, month, year] = parts
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }
  return trimmed
}

export function NovoAnamneseModal({
  isOpen,
  onClose,
  onSave,
  pacienteId,
  pacienteNome,
}: NovoAnamneseModalProps) {
  const { data: pacientes } = usePacientes()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<FormState>(initialForm)

  useEffect(() => {
    if (!isOpen) return
    setForm({
      ...initialForm,
      pacienteId: pacienteId ?? '',
    })
  }, [isOpen, pacienteId])

  const canEditPaciente = !pacienteId

  const handleSave = async () => {
    if (!form.pacienteId || !form.data.trim() || !form.queixa.trim()) {
      toast.error('Preencha paciente, data e queixa principal para continuar.')
      return
    }

    try {
      setIsSaving(true)
      await onSave({
        pacienteId: form.pacienteId,
        data: normalizeDateInput(form.data),
        tipo: 'Consulta',
        queixa: form.queixa.trim(),
        peso: toNumber(form.peso),
        imc: toNumber(form.imc),
        gordura: toNumber(form.gordura),
      })
      toast.success('Anamnese criada.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar a anamnese.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton={true}
        className="sm:max-w-[700px] p-0 rounded-[24px] overflow-hidden border border-app-border dark:border-app-border-dark shadow-lg"
      >
        <div className="bg-app-card dark:bg-app-card-dark p-10 custom-scrollbar">
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-normal text-app-text-primary dark:text-white leading-tight">
                Nova anamnese
              </h2>
              <p className="text-[#64748b] dark:text-app-text-muted text-base font-normal">
                Registre os dados clínicos e bioimpedância do paciente
              </p>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-all shrink-0"
            >
              <X className="h-5 w-5 text-app-text-muted" />
            </button>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                  Paciente <span className="text-[var(--app-danger-text)]">*</span>
                </Label>
                <Select
                  value={form.pacienteId}
                  onValueChange={(value) => setForm((current) => ({ ...current, pacienteId: value }))}
                  disabled={!canEditPaciente}
                >
                  <SelectTrigger className="h-12 rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark px-4 text-app-text-primary dark:text-white font-normal focus:ring-[var(--app-card-dark)]">
                    <SelectValue preferPlaceholder placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent className="rounded-integrallys-lg border-app-border dark:border-app-border-dark shadow-xl">
                    {pacienteId && pacienteNome && !pacientes.some((paciente) => paciente.id === pacienteId) ? (
                      <SelectItem value={pacienteId}>{pacienteNome}</SelectItem>
                    ) : null}
                    {pacientes.map((paciente) => (
                      <SelectItem key={paciente.id} value={paciente.id}>
                        {paciente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                  Data da avaliação <span className="text-[var(--app-danger-text)]">*</span>
                </Label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={form.data}
                    onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))}
                    placeholder="15/11/2025"
                    className="h-12 rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark px-4 focus-visible:ring-[var(--app-card-dark)] transition-all font-normal text-app-text-primary dark:text-white"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-app-text-muted group-focus-within:text-[var(--app-card-dark)] transition-colors pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-normal text-app-text-primary dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-[var(--app-primary)] dark:text-white" />
                Bioimpedância
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { key: 'peso', label: 'Peso (kg)' },
                  { key: 'imc', label: 'IMC' },
                  { key: 'gordura', label: 'Gordura (%)' },
                ].map((field) => (
                  <div key={field.key} className="space-y-3">
                    <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                      {field.label}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form[field.key as keyof FormState]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder="00.0"
                      className="h-12 rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark px-4 focus-visible:ring-[var(--app-card-dark)] transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                Queixa principal <span className="text-[var(--app-danger-text)]">*</span>
              </Label>
              <Textarea
                value={form.queixa}
                onChange={(event) => setForm((current) => ({ ...current, queixa: event.target.value }))}
                placeholder="Descreva os sintomas e queixas do paciente..."
                className="min-h-[120px] rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark p-4 text-app-text-primary dark:text-white font-normal placeholder:text-app-text-muted focus-visible:ring-[var(--app-card-dark)] resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-6">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-12 px-8 rounded-[12px] border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white font-normal text-base hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-all bg-app-card dark:bg-app-card-dark"
              >
                Cancelar
              </Button>
              <Button
                className="h-12 px-10 rounded-[12px] bg-app-primary hover:bg-app-primary-hover text-white font-normal text-base shadow-sm transition-all hover:shadow-xl"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar anamnese'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
