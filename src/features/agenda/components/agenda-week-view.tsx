'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Clock, MoreVertical } from 'lucide-react'
import type { AgendaSlot } from '../agenda.types'
import type { useAgendaCalendar } from '../hooks/use-agenda-calendar'
import { getStatusBadgeTone, getStatusCardTone, normalizeAgendaStatus } from '../agenda.utils'

interface AgendaWeekViewProps {
  weekAgendaGroups: ReturnType<typeof useAgendaCalendar>['weekAgendaGroups']
  onOpenSlotModal: (modal: 'remarcar' | 'cancelar' | 'detalhes', slot: AgendaSlot) => void
  onSetCurrentDate: (date: Date) => void
  onOpenNewModal: () => void
}

export function AgendaWeekView({
  weekAgendaGroups,
  onOpenSlotModal,
  onSetCurrentDate,
  onOpenNewModal,
}: AgendaWeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {weekAgendaGroups.map((day) => (
        <div
          key={day.key}
          className="rounded-integrallys border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-bg-dark overflow-hidden"
        >
          <div
            className={`p-3 text-center border-b border-app-border dark:border-app-border-dark ${
              day.isToday ? 'bg-app-primary dark:bg-app-card-dark' : 'bg-app-bg-secondary dark:bg-app-bg-dark/50'
            }`}
          >
            <p
              className={`text-sm ${
                day.isToday ? 'text-white/80' : 'text-app-text-secondary dark:text-app-text-muted'
              }`}
            >
              {day.shortLabel}
            </p>
            <p
              className={`text-xl ${
                day.isToday ? 'text-white' : 'text-app-text-primary dark:text-white'
              }`}
            >
              {day.date.getDate().toString().padStart(2, '0')}
            </p>
            <p
              className={`text-xs ${
                day.isToday ? 'text-white/60' : 'text-app-text-secondary dark:text-app-text-muted'
              }`}
            >
              ({day.items.length})
            </p>
          </div>

          <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
            {day.items.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  onSetCurrentDate(day.date)
                  onOpenNewModal()
                }}
                className="w-full text-xs rounded-[8px] border border-dashed border-app-border dark:border-app-border-dark px-2 py-1 text-app-text-secondary hover:text-app-primary hover:border-app-primary transition-colors"
              >
                Disponível • Novo agendamento
              </button>
            ) : (
              day.items.map((item) => (
                <div
                  key={item.id}
                  className={`${getStatusCardTone(item.status)} rounded-[8px] p-3 space-y-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-normal text-app-text-primary dark:text-white">{item.hora}</p>
                        <Clock className="h-3 w-3 text-app-text-secondary dark:text-app-text-muted" />
                        <span className="text-xs font-normal text-app-text-secondary dark:text-app-text-muted">
                          30min
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-tight text-app-text-primary dark:text-white">
                        {item.paciente}
                      </p>
                      <p className="mt-1 text-xs leading-tight text-app-text-secondary dark:text-app-text-muted">
                        {item.profissional}
                      </p>
                      <span className="mt-2 inline-block app-status-neutral px-2 py-0.5 rounded text-xs">
                        Consulta
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeTone(item.status)}`}>
                        {normalizeAgendaStatus(item.status)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" aria-label="Ações do agendamento" className="h-6 w-6 flex items-center justify-center hover:bg-app-card/50 dark:hover:bg-app-hover rounded transition-colors">
                            <MoreVertical className="h-3 w-3 text-app-text-secondary dark:text-white/80" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenSlotModal('detalhes', item)}>Visualizar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenSlotModal('remarcar', item)}>Reagendar</DropdownMenuItem>
                          <DropdownMenuItem className="text-[var(--app-danger-text)]" onClick={() => onOpenSlotModal('cancelar', item)}>
                            Desmarcar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
