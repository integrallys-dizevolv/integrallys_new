import { describe, expect, it } from 'vitest'
import { isPrescriptionImmutable } from '@/lib/prescricao-immutability'

describe('prescricao-immutability', () => {
  it('bloqueia Convertida e Cancelada', () => {
    expect(isPrescriptionImmutable('Convertida')).toBe(true)
    expect(isPrescriptionImmutable('Cancelada')).toBe(true)
  })

  it('permite Ativa, Pendente e Rascunho (aguardando decisão QA-2.4)', () => {
    expect(isPrescriptionImmutable('Ativa')).toBe(false)
    expect(isPrescriptionImmutable('Pendente')).toBe(false)
    expect(isPrescriptionImmutable('Rascunho')).toBe(false)
    expect(isPrescriptionImmutable('Vencida')).toBe(false)
  })
})
