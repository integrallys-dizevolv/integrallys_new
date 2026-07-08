'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ConsultaInfo {
  id?: string
  paciente: string
  especialista: string
  pacienteId?: string
  data?: string
  horario: string
  tipo: string
}

interface RemarcarConsultaModalProps {
  isOpen: boolean
  onClose: () => void
  consulta?: ConsultaInfo | null
  onSave?: (payload: { id: string; pacienteId?: string; data: string; horario: string }) => Promise<void> | void
}

export function RemarcarConsultaModal({ isOpen, onClose, consulta, onSave }: RemarcarConsultaModalProps) {
  const [novoHorario, setNovoHorario] = useState('')
  const [novaData, setNovaData] = useState('')

  const item = consulta ?? {
    id: '',
    paciente: 'Paciente',
    especialista: 'Especialista',
    pacienteId: '',
    data: '',
    horario: '08:00',
    tipo: 'Consulta',
  }

  const handleSave = async () => {
    if (!item.id || !novaData || !novoHorario) return
    await onSave?.({ id: item.id, pacienteId: item.pacienteId, data: novaData, horario: novoHorario })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-app-card dark:bg-app-card-dark">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-normal">
            <Calendar className="h-5 w-5 text-[var(--app-primary)]" />
            Remarcar consulta
          </DialogTitle>
          <DialogDescription className="font-normal">
            Altere a data e horário da consulta agendada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6 pt-0">
          <div className="rounded-integrallys bg-app-bg-secondary p-4 dark:bg-app-bg-dark/50">
            <h4 className="text-sm font-normal uppercase tracking-wider text-app-text-primary dark:text-white">Consulta atual</h4>
            <div className="mt-2 space-y-1 text-xs">
              <p className="font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">
                <span className="font-normal">Paciente:</span> {item.paciente}
              </p>
              <p className="font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">
                <span className="font-normal">Especialista:</span> {item.especialista}
              </p>
              <p className="font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">
                <span className="font-normal">Horário:</span> {item.horario}
              </p>
              <p className="font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">
                <span className="font-normal">Tipo:</span> {item.tipo}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-normal">Nova data *</Label>
              <Input type="date" value={novaData} onChange={(event) => setNovaData(event.target.value)} className="font-normal" />
            </div>
            <div className="space-y-2">
              <Label className="font-normal">Novo horário *</Label>
              <Select value={novoHorario} onValueChange={setNovoHorario}>
                <SelectTrigger className="font-normal">
                  <SelectValue placeholder="Horário" />
                </SelectTrigger>
                <SelectContent>
                  {['08:00','08:30','09:00','09:30','10:00','10:30','11:00','14:00','14:30','15:00','15:30','16:00'].map((value) => (
                    <SelectItem key={value} value={value} className="font-normal">
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-normal">Motivo da remarcação</Label>
            <Input placeholder="Motivo (opcional)" className="font-normal" />
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="h-11 w-full rounded-integrallys px-6 font-normal sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!novaData || !novoHorario || !item.id} className="h-11 w-full rounded-integrallys bg-app-primary px-8 font-normal text-white shadow-sm transition-all active:scale-[0.98] hover:bg-app-primary-hover sm:w-auto">
            Remarcar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
