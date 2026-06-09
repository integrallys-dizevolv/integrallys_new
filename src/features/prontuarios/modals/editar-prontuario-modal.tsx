'use client'

import { useEffect, useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { toast } from 'sonner'

import type { NovoProntuarioInput, ProntuarioItem } from '@/features/prontuarios/hooks/use-prontuarios'
import type { PacienteItem } from '@/hooks/use-pacientes'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface EditarProntuarioModalProps {
  isOpen: boolean
  onClose: () => void
  prontuario: ProntuarioItem | null
  pacientes: PacienteItem[]
  onSave: (payload: NovoProntuarioInput) => Promise<void>
}

export function EditarProntuarioModal({
  isOpen,
  onClose,
  prontuario,
  pacientes,
  onSave,
}: EditarProntuarioModalProps) {
  const [pacienteId, setPacienteId] = useState('')
  const [data, setData] = useState('')
  const [tipo, setTipo] = useState('Consulta')
  const [status, setStatus] = useState('Em Andamento')
  const [queixaPrincipal, setQueixaPrincipal] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setPacienteId(prontuario?.pacienteId ?? '')
    setData(prontuario?.data ?? '')
    setTipo(prontuario?.tipo ?? 'Consulta')
    setStatus(prontuario?.status ?? 'Em Andamento')
    setQueixaPrincipal('')
    setDiagnostico('')
    setIsSaving(false)
  }, [prontuario, isOpen])

  if (!prontuario) return null

  const handleSave = async () => {
    if (!pacienteId || !data.trim() || !tipo) {
      toast.error('Selecione paciente, data e tipo de consulta.')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        id: prontuario.id,
        pacienteId,
        data: data.trim(),
        tipo,
        status,
      })
      toast.success('Prontuário atualizado.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar o prontuário.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton={true}
        className="sm:max-w-[650px] p-0 rounded-[20px] overflow-hidden border border-app-border dark:border-app-border-dark shadow-lg"
      >
        <DialogTitle className="sr-only">Editar prontuário</DialogTitle>
        <div className="bg-app-card dark:bg-app-card-dark p-10 custom-scrollbar">
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-normal text-app-text-primary dark:text-white leading-tight">
                Editar prontuário
              </h2>
              <p className="text-app-text-muted dark:text-app-text-muted text-base font-normal">
                Faça alterações no prontuário do paciente
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-all shrink-0"
            >
              <X className="h-5 w-5 text-app-text-muted" />
            </button>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                Paciente
              </Label>
              <Select value={pacienteId} onValueChange={setPacienteId}>
                <SelectTrigger className="h-12 rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark px-4 text-app-text-primary dark:text-white font-normal focus:ring-[var(--app-card-dark)]">
                  <SelectValue preferPlaceholder placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="rounded-integrallys-lg border-app-border dark:border-app-border-dark shadow-xl">
                  {pacientes.map((paciente) => (
                    <SelectItem key={paciente.id} value={paciente.id}>{paciente.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                Data do atendimento
              </Label>
              <div className="relative group">
                <Input
                  type="text"
                  value={data}
                  onChange={(event) => setData(event.target.value)}
                  className="h-12 rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark px-4 focus-visible:ring-[var(--app-card-dark)] transition-all font-normal text-app-text-primary dark:text-white"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-app-text-muted group-focus-within:text-[var(--app-card-dark)] transition-colors pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                Tipo de consulta
              </Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-12 rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark px-4 text-app-text-primary dark:text-white font-normal focus:ring-[var(--app-card-dark)]">
                  <SelectValue preferPlaceholder placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-integrallys-lg border-app-border dark:border-app-border-dark shadow-xl">
                  <SelectItem value="Consulta">Consulta</SelectItem>
                  <SelectItem value="Avaliação">Avaliação</SelectItem>
                  <SelectItem value="Reconsulta">Reconsulta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-12 rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark px-4 text-app-text-primary dark:text-white font-normal focus:ring-[var(--app-card-dark)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-integrallys-lg border-app-border dark:border-app-border-dark shadow-xl">
                  <SelectItem value="Em Andamento">Em andamento</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                Queixa principal
              </Label>
            <Textarea
              value={queixaPrincipal}
              onChange={(event) => setQueixaPrincipal(event.target.value)}
              className="min-h-[120px] rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark p-4 text-app-text-primary dark:text-white font-normal placeholder:text-app-text-muted focus-visible:ring-[var(--app-card-dark)] resize-none leading-relaxed"
            />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-normal text-app-text-primary dark:text-white tracking-tight">
                Diagnóstico
              </Label>
            <Textarea
              value={diagnostico}
              onChange={(event) => setDiagnostico(event.target.value)}
              className="min-h-[120px] rounded-[12px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark p-4 text-app-text-primary dark:text-white font-normal placeholder:text-app-text-muted focus-visible:ring-[var(--app-card-dark)] resize-none leading-relaxed"
            />
            </div>

            <div className="flex items-center justify-end gap-3 pt-6">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-12 px-8 rounded-integrallys-lg border-app-border dark:border-app-border-dark text-app-text-secondary dark:text-white/60 hover:bg-app-bg-secondary dark:hover:bg-app-hover font-normal transition-all"
              >
                Cancelar
              </Button>
              <Button
                className="h-12 px-10 rounded-integrallys-lg bg-[var(--app-card-dark)] hover:bg-[var(--app-card-dark)] text-white font-normal shadow-sm transition-all"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
