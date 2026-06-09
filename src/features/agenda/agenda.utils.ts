import type { AgendaSlot, DayGridSlot, MonthDayCell, ViewMode, WeekDayData } from './agenda.types'

export function formatAgendaDate(date: Date, viewMode: ViewMode) {
  const formatter = new Intl.DateTimeFormat(
    'pt-BR',
    viewMode === 'mes'
      ? { month: 'long', year: 'numeric' }
      : { weekday: 'long', day: '2-digit', month: 'long' },
  )

  const formatted = formatter.format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function normalizeAgendaStatus(status: string) {
  const normalized = status.trim().toLowerCase()
  if (normalized.includes('confirm')) return 'Confirmado'
  if (normalized.includes('check-in')) return 'Check-in'
  if (normalized.includes('check-out')) return 'Check-out'
  if (normalized.includes('atendimento')) return 'Em Atendimento'
  if (normalized.includes('atras')) return 'Em Atraso'
  if (normalized.includes('cancel')) return 'Cancelado'
  if (normalized.includes('pend')) return 'Aguardando'
  if (normalized.includes('conclu')) return 'Concluído'
  if (normalized.includes('faltou')) return 'Faltou'
  if (normalized.includes('adiad')) return 'Adiado'
  if (normalized.includes('bloque')) return 'Bloqueado'
  if (normalized.includes('agend')) return 'Agendado'
  return status || 'Agendado'
}

export function getStatusButtonTone(status: string) {
  switch (normalizeAgendaStatus(status)) {
    case 'Confirmado':
    case 'Agendado':
      return 'bg-app-primary'
    case 'Check-in':
    case 'Aguardando':
      return 'bg-sky-600'
    case 'Em Atendimento':
      return 'bg-indigo-600'
    case 'Check-out':
      return 'bg-emerald-600'
    case 'Em Atraso':
      return 'bg-amber-500 text-app-text-primary'
    case 'Cancelado':
      return 'bg-[var(--app-danger-text)]'
    case 'Concluído':
    case 'Concluido':
      return 'bg-slate-500'
    case 'Faltou':
      return 'bg-orange-500'
    case 'Adiado':
      return 'bg-purple-500'
    case 'Bloqueado':
      return 'bg-gray-600'
    default:
      return 'bg-app-primary'
  }
}

export function getStatusCardTone(status: string) {
  switch (normalizeAgendaStatus(status)) {
    case 'Confirmado':
    case 'Agendado':
      return 'bg-[#eaf2ff] dark:bg-[#10213e] border-l-4 border-app-primary'
    case 'Check-in':
      return 'bg-sky-50 dark:bg-sky-950/30 border-l-4 border-app-primary'
    case 'Em Atendimento':
      return 'bg-indigo-50 dark:bg-indigo-950/30 border-l-4 border-indigo-500'
    case 'Check-out':
      return 'bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-[var(--app-success-text)]'
    case 'Em Atraso':
      return 'bg-amber-50 dark:bg-amber-950/30 border-l-4 border-[var(--app-warning-text)]'
    case 'Cancelado':
      return 'bg-gray-100 dark:bg-gray-900/40 border-l-4 border-gray-400 dark:border-gray-600 opacity-60'
    case 'Aguardando':
      return 'bg-slate-50 dark:bg-slate-900/40 border-l-4 border-app-primary'
    default:
      return 'bg-app-bg-secondary dark:bg-app-bg-dark/50 border-l-4 border-app-border'
  }
}

/**
 * Retorna classes CSS para o badge pill de status na agenda.
 * Equivalente ao getBadgeStyle() do projeto original.
 */
export function getStatusBadgeTone(status: string): string {
  const s = normalizeAgendaStatus(status)
  const isAmber = s === 'Em Atraso'
  return `bg-transparent ${isAmber ? 'text-app-text-primary' : 'text-white'} border-none font-normal`
}

export function filterAgendaItemsByStatus(items: AgendaSlot[], filter: string) {
  switch (filter) {
    case 'agendamentos':
      return items.filter((item) =>
        ['Confirmado', 'Agendado', 'Em Atraso'].includes(normalizeAgendaStatus(item.status)),
      )
    case 'aguardando':
      return items.filter((item) => normalizeAgendaStatus(item.status) === 'Check-in')
    case 'atendimento':
      return items.filter((item) => normalizeAgendaStatus(item.status) === 'Em Atendimento')
    case 'atendidos':
      return items.filter((item) => ['Check-out'].includes(normalizeAgendaStatus(item.status)))
    default:
      return items
  }
}

export function buildDaySlots() {
  const slots: DayGridSlot[] = []
  for (let hour = 8; hour < 18; hour += 1) {
    const h = hour.toString().padStart(2, '0')
    slots.push({ id: `${h}-00`, time: `${h}:00` })
    slots.push({ id: `${h}-30`, time: `${h}:30` })
  }
  return slots
}

export function buildWeekDays(baseDate: Date): WeekDayData[] {
  const current = new Date(baseDate)
  const day = current.getDay()
  const diffToSunday = current.getDate() - day
  const start = new Date(current)
  start.setDate(diffToSunday)

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const label = date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    })
    const shortLabel = date.toLocaleDateString('pt-BR', { weekday: 'short' })
    const today = new Date()
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()

    return {
      key: date.toISOString(),
      date,
      label,
      shortLabel,
      isToday,
    }
  })
}

export function buildMonthDays(baseDate: Date): MonthDayCell[] {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const cells: MonthDayCell[] = []
  const today = new Date()

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({
      key: `empty-start-${i}`,
      date: null,
      isCurrentMonth: false,
      isToday: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day)
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()

    cells.push({
      key: date.toISOString(),
      date,
      isCurrentMonth: true,
      isToday,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      date: null,
      isCurrentMonth: false,
      isToday: false,
    })
  }

  return cells
}
