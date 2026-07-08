'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DateInput } from '@/components/shared/date-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useUsuarios } from '@/hooks/use-usuarios'

export interface GerarAgendaResumo {
  gerados: number
  pulados: number
  alertas: string[]
}

interface GerarAgendaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: {
    especialistaId: string
    dataInicio: string
    dataFim: string
    diasSemana: number[]
    considerarFeriados: boolean
  }) => Promise<GerarAgendaResumo>
}

// 0=Dom .. 6=Sáb, alinhado ao getDay() / profissional_horarios (migration 079).
const DIAS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

const TODOS_OS_DIAS = DIAS.map((dia) => dia.value)

export function GerarAgendaModal({ isOpen, onClose, onSave }: GerarAgendaModalProps) {
  const { data: usuarios } = useUsuarios()
  const [especialistaId, setEspecialistaId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  // Filtro de dias (restrição). Padrão: todos marcados = toda a grade do profissional.
  const [diasSemana, setDiasSemana] = useState<number[]>(TODOS_OS_DIAS)
  const [considerarFeriados, setConsiderarFeriados] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [resumo, setResumo] = useState<GerarAgendaResumo | null>(null)

  const especialistas = useMemo(
    () => usuarios.filter((item) => item.perfil === 'especialista'),
    [usuarios],
  )

  const resetForm = () => {
    setEspecialistaId('')
    setDataInicio('')
    setDataFim('')
    setDiasSemana(TODOS_OS_DIAS)
    setConsiderarFeriados(true)
    setResumo(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const toggleDay = (day: number) => {
    setDiasSemana((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b),
    )
  }

  const handleSave = async () => {
    if (!especialistaId || !dataInicio || !dataFim || diasSemana.length === 0) {
      toast.error('Preencha especialista, período e ao menos um dia da semana.')
      return
    }

    setIsSaving(true)
    try {
      const result = await onSave({
        especialistaId,
        dataInicio,
        dataFim,
        diasSemana,
        considerarFeriados,
      })
      setResumo(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar a agenda.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[620px] p-0 rounded-[24px] overflow-hidden border border-app-border dark:border-app-border-dark shadow-lg"
      >
        <DialogTitle className="sr-only">Gerar agenda</DialogTitle>
        <div className="bg-app-card dark:bg-app-card-dark p-8 custom-scrollbar">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h2 className="text-xl font-normal text-app-text-primary dark:text-white">
                Gerar agenda
              </h2>
              <p className="text-sm text-app-text-muted">
                {resumo
                  ? 'Resumo da geração.'
                  : 'Gera os slots a partir da grade de horários do profissional.'}
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

          {resumo ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-app-border bg-app-bg-secondary/50 px-5 py-6 text-center dark:border-app-border-dark dark:bg-app-bg-dark">
                <p className="text-4xl font-semibold text-app-text-primary dark:text-white">
                  {resumo.gerados}
                </p>
                <p className="mt-1 text-sm text-app-text-muted">slot(s) criado(s)</p>
                {resumo.pulados > 0 ? (
                  <p className="mt-1 text-xs text-app-text-muted">
                    {resumo.pulados} já existiam ou caíram em feriado.
                  </p>
                ) : null}
              </div>

              {resumo.alertas.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Alertas
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700 dark:text-amber-300">
                    {resumo.alertas.map((alerta) => (
                      <li key={alerta}>{alerta}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setResumo(null)}>
                  Gerar novamente
                </Button>
                <Button className="app-action-primary" onClick={handleClose}>
                  Concluir
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Especialista</Label>
                  <Select value={especialistaId} onValueChange={setEspecialistaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {especialistas.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Período</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DateInput value={dataInicio} onChange={setDataInicio} />
                    <DateInput value={dataFim} onChange={setDataFim} />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Dias da semana</Label>
                  <p className="text-xs text-app-text-muted">
                    Restringe a grade do profissional. Dias sem horário cadastrado não geram, mesmo
                    marcados.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {DIAS.map((dia) => {
                      const active = diasSemana.includes(dia.value)
                      return (
                        <button
                          key={dia.value}
                          type="button"
                          onClick={() => toggleDay(dia.value)}
                          className={`h-11 px-4 rounded-xl border text-sm transition-colors ${
                            active
                              ? 'border-app-primary bg-app-primary text-white'
                              : 'border-app-border bg-app-card text-app-text-primary dark:border-app-border-dark dark:bg-app-bg-dark dark:text-white'
                          }`}
                        >
                          {dia.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg-secondary/50 px-4 py-3 dark:border-app-border-dark dark:bg-app-bg-dark">
                  <div className="space-y-1">
                    <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                      Ignorar feriados nacionais
                    </Label>
                    <p className="text-xs text-app-text-muted">
                      Quando ativo, datas como 01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11 e
                      25/12 não geram slots.
                    </p>
                  </div>
                  <Switch checked={considerarFeriados} onCheckedChange={setConsiderarFeriados} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  className="app-action-primary"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                >
                  {isSaving ? 'Gerando...' : 'Gerar'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
