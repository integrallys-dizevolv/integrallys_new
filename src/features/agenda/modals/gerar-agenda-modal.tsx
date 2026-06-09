'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'

import { DateInput } from '@/components/shared/date-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useUsuarios } from '@/hooks/use-usuarios'

interface GerarAgendaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: {
    especialistaId: string
    dataInicio: string
    dataFim: string
    horarioInicio: string
    horarioFim: string
    intervalos: number
    diasSemana: number[]
    considerarFeriados: boolean
  }) => Promise<void>
}

const DIAS = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

export function GerarAgendaModal({ isOpen, onClose, onSave }: GerarAgendaModalProps) {
  const { data: usuarios } = useUsuarios()
  const [especialistaId, setEspecialistaId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('')
  const [horarioFim, setHorarioFim] = useState('')
  const [intervalos, setIntervalos] = useState('30')
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5])
  const [considerarFeriados, setConsiderarFeriados] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const especialistas = useMemo(
    () => usuarios.filter((item) => item.perfil === 'especialista'),
    [usuarios],
  )

  const toggleDay = (day: number) => {
    setDiasSemana((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    )
  }

  const handleSave = async () => {
    if (!especialistaId || !dataInicio || !dataFim || !horarioInicio || !horarioFim || diasSemana.length === 0) {
      toast.error('Preencha especialista, período, horários e dias da semana.')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        especialistaId,
        dataInicio,
        dataFim,
        horarioInicio,
        horarioFim,
        intervalos: Number(intervalos),
        diasSemana,
        considerarFeriados,
      })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar a agenda.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[620px] p-0 rounded-[24px] overflow-hidden border border-app-border dark:border-app-border-dark shadow-lg"
      >
        <DialogTitle className="sr-only">Gerar agenda</DialogTitle>
        <div className="bg-app-card dark:bg-app-card-dark p-8 custom-scrollbar">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h2 className="text-xl font-normal text-app-text-primary dark:text-white">Gerar agenda</h2>
              <p className="text-sm text-app-text-muted">Crie slots em lote para um especialista.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-app-text-muted" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Especialista</Label>
              <Select value={especialistaId} onValueChange={setEspecialistaId}>
                <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                <SelectContent>
                  {especialistas.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
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
              <Label>Horários</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input type="time" value={horarioInicio} onChange={(event) => setHorarioInicio(event.target.value)} />
                <Input type="time" value={horarioFim} onChange={(event) => setHorarioFim(event.target.value)} />
                <Select value={intervalos} onValueChange={setIntervalos}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Dias da semana</Label>
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
                  Quando ativo, datas como 01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11 e 25/12 não geram slots.
                </p>
              </div>
              <Switch checked={considerarFeriados} onCheckedChange={setConsiderarFeriados} />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="app-action-primary" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
