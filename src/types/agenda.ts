/**
 * Status possíveis de um agendamento.
 * Sincronizado com o enum `agendamento_status` no banco.
 *
 * Fonte (em ordem cronológica das migrations):
 * - `sql/migrations/002_operational_domains.sql:25` — cria o enum com os
 *   valores base: 'Agendado', 'Confirmado', 'Em atendimento', 'Concluído',
 *   'Cancelado', 'Faltou', 'Bloqueado', 'Adiado'.
 * - `sql/migrations/019_agendamento_status_tarefa_002.sql:21-26` — renomeia
 *   'Em atendimento' → 'Em Atendimento' e adiciona 'Check-in', 'Check-out'
 *   e 'Em Atraso'.
 * - `sql/migrations/046_agendamento_status_disponivel.sql:11` — adiciona
 *   'Disponível' (slots vagos gerados em lote).
 *
 * Total: 12 valores literais no enum do banco.
 *
 * Ao adicionar valor aqui, atualizar também:
 * - Migration SQL com ALTER TYPE ADD VALUE
 * - statusLabel() em src/app/api/dashboard/route.ts
 * - normalizeAgendaStatus() em src/features/agenda/agenda.utils.ts
 */
export type AgendamentoStatus =
  | 'Agendado'
  | 'Confirmado'
  | 'Check-in'
  | 'Em Atendimento'
  | 'Check-out'
  | 'Concluído'
  | 'Cancelado'
  | 'Em Atraso'
  | 'Faltou'
  | 'Bloqueado'
  | 'Adiado'
  | 'Disponível'

/**
 * Lista runtime para iteração (selects, validações, filtros).
 * `as const satisfies readonly AgendamentoStatus[]` garante:
 * - tipo readonly tuple (cada item literal)
 * - bate exatamente com a união acima (compilador alerta se divergir)
 */
export const AGENDAMENTO_STATUS_VALUES = [
  'Agendado',
  'Confirmado',
  'Check-in',
  'Em Atendimento',
  'Check-out',
  'Concluído',
  'Cancelado',
  'Em Atraso',
  'Faltou',
  'Bloqueado',
  'Adiado',
  'Disponível',
] as const satisfies readonly AgendamentoStatus[]
