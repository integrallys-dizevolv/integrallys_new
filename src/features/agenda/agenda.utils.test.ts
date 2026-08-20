import { describe, expect, it } from 'vitest'
import { formatSlotDuration } from './agenda.utils'

describe('formatSlotDuration', () => {
  it('calcula minutos quando fim-início < 60', () => {
    expect(formatSlotDuration('08:00', '08:40')).toBe('40min')
    expect(formatSlotDuration('09:00', '09:30')).toBe('30min')
  })

  it('formata horas e minutos mistos', () => {
    expect(formatSlotDuration('08:00', '09:00')).toBe('1h')
    expect(formatSlotDuration('08:00', '09:15')).toBe('1h 15min')
  })

  it('retorna null sem horaFim ou com diff inválido (UI omite badge)', () => {
    expect(formatSlotDuration('08:00')).toBeNull()
    expect(formatSlotDuration('08:00', undefined)).toBeNull()
    expect(formatSlotDuration('10:00', '09:00')).toBeNull()
    expect(formatSlotDuration('10:00', '10:00')).toBeNull()
  })

  it('aceita HH:MM:SS truncando para HH:MM', () => {
    expect(formatSlotDuration('08:00:00', '08:40:00')).toBe('40min')
  })
})
