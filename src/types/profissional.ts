/**
 * Tipos do cadastro de Profissionais (especialistas).
 *
 * Profissional é um `usuarios` com perfil='especialista' acrescido de:
 *  - grade semanal (`profissional_horarios`) — migration 079
 *  - procedimentos atendidos (`profissional_procedimentos`) — migration 079
 *
 * `diaSemana` segue 0=Dom .. 6=Sáb (getDay() de api/agenda/gerar/route.ts), que
 * a Fase 2 consumirá para derivar dias/janelas/duração da geração de agenda.
 */

export type ProfissionalTurno = 'manha' | 'tarde'

export const PROFISSIONAL_TURNOS = [
  'manha',
  'tarde',
] as const satisfies readonly ProfissionalTurno[]

export type ProfissionalTipoVinculo = 'interno' | 'parceiro'

export interface ProfissionalHorario {
  id?: string
  /** 0=Dom .. 6=Sáb, alinhado ao getDay() usado na geração de agenda. */
  diaSemana: number
  turno: ProfissionalTurno
  /** Formato HH:MM. */
  horaInicio: string
  /** Formato HH:MM. */
  horaFim: string
  duracaoMin: number
  ativo: boolean
}

export interface ProfissionalItem {
  id: string
  nome: string
  email: string
  telefone?: string | null
  /** Conselho de classe (ex.: CRM, CRO, CREFITO). */
  conselho?: string | null
  /** Número de registro no conselho. */
  crm?: string | null
  tipoVinculo: ProfissionalTipoVinculo
  status: string
  unidadeId?: string | null
  horarios: ProfissionalHorario[]
  procedimentoIds: string[]
}

export interface ProfissionalInput {
  id?: string
  nome: string
  email: string
  /** Obrigatória na criação (mín. 6 caracteres); ignorada/omitida na edição. */
  senha?: string
  telefone?: string | null
  conselho?: string | null
  crm?: string | null
  tipoVinculo: ProfissionalTipoVinculo
  status?: string
  unidadeId?: string | null
  horarios: ProfissionalHorario[]
  procedimentoIds: string[]
}
