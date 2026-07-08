import { describe, expect, it } from 'vitest'
import { isClientePaciente } from './pacientes.utils'

describe('isClientePaciente (null-safe; exclui só fornecedor/prestador)', () => {
  it('mantém cliente', () => {
    expect(isClientePaciente('cliente')).toBe(true)
  })

  it('mantém legados sem vínculo (null/undefined/"") — tratados como cliente', () => {
    expect(isClientePaciente(undefined)).toBe(true)
    expect(isClientePaciente(null)).toBe(true)
    expect(isClientePaciente('')).toBe(true)
  })

  it('exclui fornecedor e prestador', () => {
    expect(isClientePaciente('fornecedor')).toBe(false)
    expect(isClientePaciente('prestador')).toBe(false)
  })

  it('normaliza caixa/espaços antes de comparar', () => {
    expect(isClientePaciente('Fornecedor')).toBe(false)
    expect(isClientePaciente('  fornecedor  ')).toBe(false)
    expect(isClientePaciente('PRESTADOR')).toBe(false)
  })

  it('não exclui outros vínculos (ex.: especialista) — fora do escopo do vazamento', () => {
    expect(isClientePaciente('especialista')).toBe(true)
  })
})
