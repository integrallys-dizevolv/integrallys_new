'use client'

import { useRouter } from 'next/navigation'
import { Bell, Calendar, ChevronDown, Clock, DollarSign, Lock, MoreVertical, Play, Plus } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AgendaSlot, DayGridSlot } from '../agenda.types'
import { getStatusBadgeTone, getStatusButtonTone, getStatusCardTone, normalizeAgendaStatus } from '../agenda.utils'
import type { AgendaBloqueio } from '../hooks/use-agenda-bloqueios'

interface AgendaDayViewProps {
  daySlots: DayGridSlot[]
  dayFilteredItems: AgendaSlot[]
  bloqueios?: AgendaBloqueio[]
  bloqueiosProfissionais?: Array<{ id: string; nome: string }>
  currentDate?: Date
  selectedFilter: string
  selectedProfessional: string
  professionalOptions: string[]
  showDaySlots: boolean
  onOpenSlotModal: (modal: 'remarcar' | 'cancelar' | 'detalhes' | 'visualizar' | 'ficha-paciente', slot: AgendaSlot) => void
  onOpenCharge: (slot: AgendaSlot) => void
  onCallSpecialist: (slot: AgendaSlot) => void
  onStatusChange: (slot: AgendaSlot, status: string) => void
  onSelectProfessional: (professional: string) => void
  onOpenNewModal: () => void
  onOpenAvailableSlot?: (slot: AgendaSlot) => void
  onStartAtendimento?: (slot: AgendaSlot) => void
}

function isoDateLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timeWithinSlot(slotTime: string, hInicio: string | null, hFim: string | null) {
  if (!hInicio || !hFim) return true
  return slotTime >= hInicio.slice(0, 5) && slotTime < hFim.slice(0, 5)
}

export function AgendaDayView({
  daySlots,
  dayFilteredItems,
  bloqueios = [],
  bloqueiosProfissionais = [],
  currentDate,
  selectedProfessional,
  professionalOptions,
  showDaySlots,
  onOpenSlotModal,
  onOpenCharge,
  onCallSpecialist,
  onStatusChange,
  onSelectProfessional,
  onOpenNewModal,
  onOpenAvailableSlot,
  onStartAtendimento,
}: AgendaDayViewProps) {
  const router = useRouter()

  const todayIso = currentDate ? isoDateLocal(currentDate) : ''
  const profIdToNome = new Map(bloqueiosProfissionais.map((p) => [p.id, p.nome]))
  const bloqueiosDoDia = bloqueios.filter((b) => {
    if (!todayIso) return false
    return b.dataInicio <= todayIso && b.dataFim >= todayIso
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {daySlots.map((slot) => {
          const allItemsInSlot = dayFilteredItems.filter((item) => item.hora === slot.time)
          const itemsInSlot = allItemsInSlot.filter((item) => item.status !== 'Disponível')
          const activeItemsInSlot = itemsInSlot.filter((item) => normalizeAgendaStatus(item.status) !== 'Cancelado')
          const availableItemsInSlot =
            activeItemsInSlot.length > 0
              ? []
              : allItemsInSlot.filter((item) => item.status === 'Disponível')
          const targetNames =
            selectedProfessional === 'todos'
              ? professionalOptions
              : professionalOptions.filter((name) => name === selectedProfessional)

          const bloqueiosNoSlot = bloqueiosDoDia.filter((b) => {
            if (!b.diaInteiro && !timeWithinSlot(slot.time, b.horarioInicio, b.horarioFim)) return false
            if (selectedProfessional !== 'todos') {
              const profissionalNome = b.profissionalId ? profIdToNome.get(b.profissionalId) : null
              if (b.profissionalId && profissionalNome !== selectedProfessional) return false
            }
            return true
          })

          return (
            <div key={slot.id} className="space-y-2">
              {bloqueiosNoSlot.map((b) => {
                const profissionalNome = b.profissionalId ? profIdToNome.get(b.profissionalId) : null
                return (
                  <div
                    key={`bloq-${b.id}-${slot.time}`}
                    className="rounded-integrallys border border-red-200 bg-red-50/70 p-4 dark:border-red-900/40 dark:bg-red-950/20"
                    title={b.justificativa ?? undefined}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-shrink-0 w-[60px]">
                        <p className="text-xl font-normal text-red-700 dark:text-red-300 leading-[30px]">
                          {slot.time}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Lock className="h-3 w-3 text-red-700 dark:text-red-300" />
                          <span className="text-xs font-normal text-red-700/80 dark:text-red-300/80">
                            {b.diaInteiro ? 'Dia inteiro' : `${b.horarioInicio?.slice(0, 5) ?? ''}–${b.horarioFim?.slice(0, 5) ?? ''}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-medium text-red-900 dark:bg-red-900/50 dark:text-red-100">
                            {b.tipo}
                          </span>
                          <span className="text-sm font-normal text-red-900 dark:text-red-100">
                            {profissionalNome ?? 'Todos profissionais'}
                          </span>
                        </div>
                        {b.justificativa && (
                          <p className="text-xs text-red-800/80 dark:text-red-200/80 mt-1 truncate">
                            {b.justificativa}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {itemsInSlot.map((item) => {
                const currentStatus = normalizeAgendaStatus(item.status)

                return (
                  <div
                    key={item.id}
                    className={`${getStatusCardTone(item.status)} rounded-integrallys p-4 transition-colors duration-300`}
                  >
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 sm:gap-0">
                      <div className="flex-shrink-0 w-[60px]">
                        <p className="text-xl font-normal text-app-text-primary dark:text-white leading-[30px]">
                          {item.hora}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-app-text-secondary dark:text-app-text-muted" />
                          <span className="text-xs font-normal text-app-text-secondary dark:text-app-text-muted">
                            30min
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 w-full sm:w-auto ml-0 sm:ml-4 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-base font-normal text-app-text-primary dark:text-white truncate">
                            {item.paciente}
                          </p>
                          <span className="app-status-neutral px-2 py-0.5 rounded text-xs font-normal whitespace-nowrap">
                            Consulta
                          </span>
                          {item.foraJanela && (
                            <span
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap"
                              title={item.motivoEncaixe ?? 'Encaixe manual fora da janela de atendimento'}
                            >
                              Encaixe
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-normal text-app-text-secondary dark:text-app-text-muted leading-[21px] truncate">
                          {item.profissional}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-0 sm:ml-4 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                        {onStartAtendimento &&
                          !['Em Atendimento', 'Check-out', 'Cancelado'].includes(currentStatus) && (
                            <Button
                              onClick={() => onStartAtendimento(item)}
                              className="bg-app-primary hover:bg-app-primary-hover text-white h-9 px-3 sm:px-4 rounded-integrallys font-normal flex items-center gap-2 shadow-sm transition-all active:scale-95 flex-1 sm:flex-initial justify-center"
                            >
                              <Play className="h-3.5 w-3.5 fill-current shrink-0" />
                              <span className="text-sm">Iniciar Atendimento</span>
                            </Button>
                          )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Status: ${currentStatus} — alterar`}
                              className={`${getStatusButtonTone(item.status)} text-white px-4 py-1.5 rounded-[8px] text-sm font-normal flex items-center gap-2 min-w-[120px] justify-center transition-colors shadow-sm`}
                            >
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeTone(item.status)}`}>
                            {currentStatus}
                          </span>
                          <ChevronDown className="h-3 w-3" />
                        </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-app-card dark:bg-app-bg-dark border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white z-[9999] shadow-lg"
                          >
                            {['Confirmado', 'Check-in', 'Em Atendimento', 'Check-out', 'Em Atraso', 'Cancelado'].map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => onStatusChange(item, status)}
                                className="hover:bg-app-bg-secondary dark:hover:bg-app-hover cursor-pointer"
                              >
                                {status}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <button
                          type="button"
                          onClick={() => onOpenCharge(item)}
                          aria-label="Emitir cobrança"
                          className="h-8 w-8 flex items-center justify-center hover:bg-app-card/50 dark:hover:bg-app-hover rounded-lg transition-colors"
                        >
                          <DollarSign className="h-4 w-4 text-[var(--app-success-text)]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onCallSpecialist(item)}
                          aria-label="Chamar especialista"
                          className="h-8 w-8 flex items-center justify-center hover:bg-app-card/50 dark:hover:bg-app-hover rounded-lg transition-colors"
                        >
                          <Bell className="h-4 w-4 text-app-primary dark:text-white" />
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="Mais ações" className="h-8 w-8 flex items-center justify-center hover:bg-app-card/50 dark:hover:bg-app-hover rounded-lg transition-colors">
                              <MoreVertical className="h-4 w-4 text-app-text-secondary dark:text-white/80" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOpenSlotModal('visualizar', item)}>Visualizar detalhes</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenSlotModal('ficha-paciente', item)}>Ficha do paciente</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenSlotModal('detalhes', item)}>Dados do agendamento</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenSlotModal('remarcar', item)}>Reagendar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenCharge(item)}>Emitir nova cobrança</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCallSpecialist(item)}>Chamar especialista</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/financeiro')}>Abrir financeiro</DropdownMenuItem>
                            <DropdownMenuItem className="text-[var(--app-danger-text)]" onClick={() => onOpenSlotModal('cancelar', item)}>
                              Desmarcar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                )
              })}

              {availableItemsInSlot.map((item) => (
                <button
                  key={`disponivel-${item.id}`}
                  type="button"
                  onClick={() => onOpenAvailableSlot?.(item)}
                  className="w-full rounded-integrallys border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 p-4 flex items-center gap-4 transition-colors group"
                  title="Slot livre — clique para criar um agendamento"
                >
                  <div className="flex-shrink-0 w-[60px] text-left">
                    <p className="text-xl font-normal text-emerald-700 dark:text-emerald-300 leading-[30px]">
                      {item.hora}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-emerald-700/80 dark:text-emerald-300/80" />
                      <span className="text-xs font-normal text-emerald-700/80 dark:text-emerald-300/80">
                        Livre
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
                        Disponível
                      </span>
                      <span className="text-sm font-normal text-emerald-900 dark:text-emerald-100">
                        {item.profissional || 'Especialista'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-1">
                      Disponível — clique para agendar
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                </button>
              ))}

              {showDaySlots &&
                activeItemsInSlot.length === 0 &&
                availableItemsInSlot.length === 0 &&
                targetNames.map((professionalName) => (
                  <button
                    key={`${slot.id}-${professionalName}`}
                    onClick={() => {
                      onSelectProfessional(professionalName)
                      onOpenNewModal()
                    }}
                    className="w-full bg-app-card dark:bg-app-card-dark border border-dashed border-app-border dark:border-app-border-dark rounded-integrallys p-4 flex items-center gap-4 hover:bg-app-bg-secondary dark:hover:bg-app-hover/50 transition-all group"
                  >
                    <div className="w-[60px] text-left">
                      <p className="text-xl font-normal text-app-text-muted dark:text-white/60 group-hover:text-app-primary dark:group-hover:text-app-primary transition-colors leading-[30px]">
                        {slot.time}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Clock className="h-3 w-3 text-app-primary" />
                        <span className="text-xs font-normal text-app-primary">30min</span>
                      </div>
                    </div>
                    <div className="flex-1 text-left flex items-center">
                      <div className="w-8 h-8 rounded-full bg-app-bg-secondary dark:bg-app-hover flex items-center justify-center group-hover:app-status-info transition-colors">
                        <Plus className="w-5 h-5 text-app-text-muted dark:text-white/60 group-hover:text-app-primary transition-colors" />
                      </div>
                      <div className="flex flex-col ml-3">
                        <span className="text-base text-app-text-muted dark:text-white/60 font-normal group-hover:text-app-primary transition-colors">
                          Disponível
                        </span>
                        <span className="text-xs text-app-text-muted">
                          {selectedProfessional === 'todos' ? professionalName : 'Clique para novo agendamento'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )
        })}

        {dayFilteredItems.length === 0 && !showDaySlots && (
          <EmptyState
            icon={Calendar}
            title="Nenhum agendamento encontrado"
            description="Não há consultas agendadas para o período selecionado."
          />
        )}
      </div>
    </div>
  )
}
