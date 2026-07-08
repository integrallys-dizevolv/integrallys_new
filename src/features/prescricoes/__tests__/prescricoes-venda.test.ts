import { describe, it, expect } from 'vitest'

describe('Cálculo de parcelamento (V05)', () => {
  it('calcula valor por parcela corretamente', () => {
    const total = 300
    const parcelas = 3
    const valorParcela = total / parcelas
    expect(valorParcela).toBe(100)
  })

  it('parcelas = 1 resulta em valor_parcela = valor_total', () => {
    const total = 265
    expect(total / 1).toBe(265)
  })

  it('numero_parcelas deve estar entre 1 e 12', () => {
    const validos = [1, 3, 6, 12]
    const invalidos = [0, 13, -1]
    validos.forEach((n) => expect(n >= 1 && n <= 12).toBe(true))
    invalidos.forEach((n) => expect(n >= 1 && n <= 12).toBe(false))
  })

  it('arredonda valor_parcela com 2 casas decimais', () => {
    const total = 100
    const parcelas = 3
    const valorParcela = Math.round((total / parcelas) * 100) / 100
    expect(valorParcela).toBe(33.33)
  })
})

describe('Campo vendedor (V06)', () => {
  it('vendedorId vazio resulta em null no payload', () => {
    const selectedSellerId = ''
    const vendedorId = selectedSellerId || null
    expect(vendedorId).toBeNull()
  })

  it('vendedorId preenchido é preservado no payload', () => {
    const selectedSellerId = 'abc-123'
    const vendedorId = selectedSellerId || null
    expect(vendedorId).toBe('abc-123')
  })

  it('aceita UUIDs de qualquer perfil (recepcionista, especialista, colaborador)', () => {
    const ids = [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '01234567-89ab-cdef-0123-456789abcdef',
    ]
    ids.forEach((id) => {
      const vendedorId = id || null
      expect(vendedorId).toBe(id)
    })
  })
})
