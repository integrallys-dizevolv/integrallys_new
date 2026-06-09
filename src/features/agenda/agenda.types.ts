export type ViewMode = 'dia' | 'semana' | 'mes'

export type AgendaModal =
  | 'novo'
  | 'lista-espera'
  | 'aniversariantes'
  | 'tarefas'
  | 'bloqueio'
  | 'remarcar'
  | 'cancelar'
  | 'detalhes'
  | 'cobranca'
  | 'visualizar'
  | 'ficha-paciente'
  | 'chamar-especialista'
  | null

export interface AgendaSlot {
  id: string
  hora: string
  pacienteId?: string
  paciente: string
  profissionalId?: string
  profissional: string
  status: string
  data?: string
  tipo?: string
  modalidade?: string
  plataformaOnline?: string
  urlOnline?: string
  valorProcedimento?: number
  observacoes?: string
  pagamento?: string
  totalPago?: number
  dataPagamentoAnterior?: string
  foraJanela?: boolean
  motivoEncaixe?: string
}

export interface DayGridSlot {
  id: string
  time: string
}

export interface WeekDayData {
  key: string
  date: Date
  label: string
  shortLabel: string
  isToday: boolean
}

export interface MonthDayCell {
  key: string
  date: Date | null
  isCurrentMonth: boolean
  isToday: boolean
}
