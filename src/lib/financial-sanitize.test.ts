import { describe, expect, it } from 'vitest'
import {
  isFinanciallyRestrictedRole,
  stripEstoquePrices,
  stripHistoricoValorUnitario,
  stripPrescricaoFinancialFields,
  stripRelatorioPrescricaoValor,
} from '@/lib/financial-sanitize'

describe('financial-sanitize', () => {
  it('identifies especialista as restricted', () => {
    expect(isFinanciallyRestrictedRole('especialista')).toBe(true)
    expect(isFinanciallyRestrictedRole('recepcao')).toBe(false)
  })

  it('strips historico unit price for especialista', () => {
    expect(stripHistoricoValorUnitario(12.5, 'especialista')).toBeNull()
    expect(stripHistoricoValorUnitario(12.5, 'recepcao')).toBe(12.5)
  })

  it('strips estoque prices for especialista', () => {
    const item = { id: '1', precoCusto: 10, precoVenda: 20, nome: 'X' }
    expect(stripEstoquePrices(item, 'especialista')).toEqual({ id: '1', nome: 'X' })
    expect(stripEstoquePrices(item, 'gestor')).toEqual(item)
  })

  it('zeros relatorio valor for especialista', () => {
    expect(stripRelatorioPrescricaoValor(99, 'especialista')).toBe(0)
    expect(stripRelatorioPrescricaoValor(99, 'admin')).toBe(99)
  })

  it('sanitizes mapped prescription for especialista', () => {
    const item = {
      valorTotal: 100,
      valorBruto: 120,
      items: [{ unitPrice: 50, total: 100 }],
    }
    const out = stripPrescricaoFinancialFields(item, 'especialista')
    expect(out.valoresOcultos).toBe(true)
    expect(out.valorTotal).toBe(0)
    expect(out.items?.[0]?.unitPrice).toBe(0)
  })
})
