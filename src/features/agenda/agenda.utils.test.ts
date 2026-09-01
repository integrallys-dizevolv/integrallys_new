import { describe, expect, it } from 'vitest'
import {
  getPagamentoIconTone,
  normalizeAgendaStatus,
  resolvePagamentoSituacao,
} from './agenda.utils'

describe('resolvePagamentoSituacao', () => {
  it('novo agendamento com valor e sem pagamento → Pendente (não Pago)', () => {
    expect(
      resolvePagamentoSituacao({
        pagamento: 'Pago',
        valorProcedimento: 250,
        totalPago: 0,
      }),
    ).toBe('Pendente')
  })

  it('quitado quando total_pago >= valor', () => {
    expect(
      resolvePagamentoSituacao({
        pagamento: 'Pendente',
        valorProcedimento: 250,
        totalPago: 250,
      }),
    ).toBe('Pago')
  })

  it('parcial quando pagou parte', () => {
    expect(
      resolvePagamentoSituacao({
        valorProcedimento: 200,
        totalPago: 80,
      }),
    ).toBe('Parcial')
  })

  it('sem valor de procedimento', () => {
    expect(resolvePagamentoSituacao({ pagamento: 'Sem valor' })).toBe('Sem valor')
  })
})

describe('normalizeAgendaStatus', () => {
  it('Agendado permanece distinto de Confirmado', () => {
    expect(normalizeAgendaStatus('Agendado')).toBe('Agendado')
    expect(normalizeAgendaStatus('Confirmado')).toBe('Confirmado')
  })
})

describe('getPagamentoIconTone', () => {
  it('pendente não usa verde', () => {
    expect(getPagamentoIconTone('Pendente')).not.toContain('success')
    expect(getPagamentoIconTone('Pago')).toContain('success')
  })
})
