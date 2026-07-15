import { describe, expect, it } from 'vitest'
import { resolverVariaveisEmTexto } from './variables'

describe('resolverVariaveisEmTexto — variáveis de contrato (item 7c)', () => {
  it('preenche dados do profissional (CPF formatado) e o percentual de repasse', () => {
    const out = resolverVariaveisEmTexto(
      'CPF #PROFISSIONAL_CPF# · RG #PROFISSIONAL_RG# · EC #PROFISSIONAL_ESTADO_CIVIL# · END #PROFISSIONAL_ENDERECO# · PCT #REPASSE_PERCENTUAL#',
      {
        profissional: {
          cpf: '12345678901',
          rg: '12.345.678-9',
          estado_civil: 'Casado(a)',
          endereco: 'Rua X, 1 — Centro',
        },
        repasse: { percentual: 30, valor_fixo: null },
      },
    )
    expect(out).toBe(
      'CPF 123.456.789-01 · RG 12.345.678-9 · EC Casado(a) · END Rua X, 1 — Centro · PCT 30%',
    )
  })

  it('formata o valor fixo do repasse em BRL', () => {
    const out = resolverVariaveisEmTexto('VF #REPASSE_VALOR_FIXO#', {
      repasse: { percentual: null, valor_fixo: 1500 },
    })
    // Evita depender do tipo de espaço (NBSP) do Intl entre ambientes.
    expect(out).toContain('1.500,00')
    expect(out).toContain('R$')
  })

  it('tokens ausentes viram string vazia, sem quebrar o texto', () => {
    const out = resolverVariaveisEmTexto(
      'A#PROFISSIONAL_CPF#B#PROFISSIONAL_RG#C#REPASSE_PERCENTUAL#D#REPASSE_VALOR_FIXO#E',
      {},
    )
    expect(out).toBe('ABCDE')
  })

  it('mantém tokens desconhecidos intactos', () => {
    expect(resolverVariaveisEmTexto('#TOKEN_INEXISTENTE#', {})).toBe('#TOKEN_INEXISTENTE#')
  })
})
