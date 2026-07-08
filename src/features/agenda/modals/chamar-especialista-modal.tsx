'use client'

import { useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AgendaItem } from '@/hooks/use-agenda'

interface ChamarEspecialistaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: AgendaItem | null
  professionals: Array<{ id: string; nome: string }>
  onSubmit: (profissionalId: string, mensagem: string) => Promise<void>
}

export function ChamarEspecialistaModal({ open, onOpenChange, item, professionals, onSubmit }: ChamarEspecialistaModalProps) {
  const [profissionalId, setProfissionalId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setProfissionalId('')
    setMensagem('')
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!profissionalId) return
    setIsSubmitting(true)
    try {
      await onSubmit(profissionalId, mensagem.trim())
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-app-card dark:bg-app-card-dark">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-normal">
            <Bell className="h-5 w-5 text-[var(--app-primary)]" />
            Chamar especialista
          </DialogTitle>
          <DialogDescription>
            Envie uma notificação de alta prioridade ao especialista
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6 pt-0">
          <div className="space-y-1 rounded-integrallys bg-app-bg-secondary p-3 dark:bg-app-bg-dark/50">
            <p className="text-sm font-normal text-app-text-primary dark:text-white">
              Paciente: {item.paciente}
            </p>
            <p className="text-xs text-app-text-secondary dark:text-app-text-muted">
              {item.horario} {item.tipo ? `\u2022 ${item.tipo}` : ''}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Especialista *</Label>
            <Select value={profissionalId} onValueChange={setProfissionalId}>
              <SelectTrigger className="h-11 border-app-border dark:border-app-border-dark">
                <SelectValue placeholder="Selecione o especialista" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Mensagem (opcional)</Label>
            <Textarea
              placeholder="Ex: Paciente aguardando na recepção."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[100px] resize-none border-app-border dark:border-app-border-dark"
            />
          </div>
        </div>

        <DialogFooter className="gap-3 p-6 pt-0 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-11 w-full rounded-integrallys px-6 sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!profissionalId || isSubmitting}
            className="h-11 w-full rounded-integrallys bg-app-primary px-8 font-normal text-white shadow-sm transition-all hover:bg-app-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Chamar Especialista'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
