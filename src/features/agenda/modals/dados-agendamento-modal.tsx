'use client'

import { CalendarDays, Clock3, DollarSign, FileText, UserRound } from 'lucide-react'
import { ModalHeader } from '@/components/shared/modal-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'

interface AgendaInfo {
  paciente: string
  especialista: string
  horario: string
  tipo: string
  data?: string
  status?: string
  pagamento?: string
  observacoes?: string
}

interface DadosAgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
  agenda?: AgendaInfo | null
}

export function DadosAgendamentoModal({ isOpen, onClose, agenda }: DadosAgendamentoModalProps) {
  if (!agenda) return null

  const item = agenda

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-app-card dark:bg-app-card-dark">
        <ModalHeader
          title="Detalhes do agendamento"
          description="Visualize os dados principais do atendimento selecionado."
        />

        <div className="space-y-4 p-6 pt-0">
          <div className="rounded-[12px] border border-app-border bg-app-bg-secondary/35 p-4 dark:border-app-border-dark dark:bg-app-bg-dark/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-normal text-app-text-primary dark:text-white">{item.paciente}</p>
                <p className="text-sm text-app-text-secondary dark:text-white/70">{item.tipo}</p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {item.status ?? 'Agendado'}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-[12px] border border-app-border/70 p-3 dark:border-app-border-dark/70">
              <UserRound className="h-4 w-4 text-app-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-app-text-muted">Profissional</p>
                <p className="text-sm text-app-text-primary dark:text-white">{item.especialista}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[12px] border border-app-border/70 p-3 dark:border-app-border-dark/70">
              <CalendarDays className="h-4 w-4 text-app-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-app-text-muted">Data</p>
                <p className="text-sm text-app-text-primary dark:text-white">{item.data ?? 'Conforme agenda selecionada'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[12px] border border-app-border/70 p-3 dark:border-app-border-dark/70">
              <Clock3 className="h-4 w-4 text-app-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-app-text-muted">Horário</p>
                <p className="text-sm text-app-text-primary dark:text-white">{item.horario}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[12px] border border-app-border/70 p-3 dark:border-app-border-dark/70">
              <DollarSign className="h-4 w-4 text-app-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-app-text-muted">Pagamento</p>
                <p className="text-sm text-app-text-primary dark:text-white">{item.pagamento ?? 'Não informado'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-[12px] border border-app-border/70 p-3 dark:border-app-border-dark/70">
              <FileText className="mt-0.5 h-4 w-4 text-app-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-app-text-muted">Observações</p>
                <p className="text-sm text-app-text-primary dark:text-white">{item.observacoes ?? 'Sem observações registradas.'}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="h-11 rounded-integrallys bg-app-primary px-8 text-white hover:bg-app-primary-hover">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
