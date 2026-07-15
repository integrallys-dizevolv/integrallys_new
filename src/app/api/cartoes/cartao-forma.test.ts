import { describe, expect, it } from 'vitest'
import { buildCartaoFormaNome, buildCartaoFormaPayload } from './cartao-forma'

describe('buildCartaoFormaNome', () => {
  it('anexa os últimos 4 dígitos quando há', () => {
    expect(buildCartaoFormaNome('Nubank Empresarial', '1234')).toBe('Nubank Empresarial ••1234')
  })

  it('normaliza dígitos (pega só os 4 finais) e apara o nome', () => {
    expect(buildCartaoFormaNome('  Itaú  ', 'abc987654')).toBe('Itaú ••7654')
  })

  it('só o nome quando não há dígitos', () => {
    expect(buildCartaoFormaNome('Cartão X', null)).toBe('Cartão X')
    expect(buildCartaoFormaNome('Cartão X', '')).toBe('Cartão X')
  })
})

describe('buildCartaoFormaPayload', () => {
  it('monta a forma espelho (tipo cartao_credito, cartao_id, ativo)', () => {
    expect(buildCartaoFormaPayload('card-1', 'Nubank', '9999')).toEqual({
      nome: 'Nubank ••9999',
      tipo: 'cartao_credito',
      cartao_id: 'card-1',
      ativo: true,
    })
  })
})
