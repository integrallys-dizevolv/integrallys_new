import { describe, expect, it } from 'vitest'
import { formatEnderecoUnidade } from './format-endereco'

describe('formatEnderecoUnidade', () => {
  it('monta endereço completo com rua, bairro e cidade/UF', () => {
    expect(
      formatEnderecoUnidade({
        endereco: 'Av. Paulista, 1000',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      }),
    ).toBe('Av. Paulista, 1000 — Bela Vista, São Paulo/SP')
  })

  it('usa cidade/UF sem bairro quando bairro está ausente', () => {
    expect(formatEnderecoUnidade({ endereco: 'Rua A, 10', cidade: 'Recife', estado: 'PE' })).toBe(
      'Rua A, 10 — Recife/PE',
    )
  })

  it('cai para cidade/UF quando não há endereço livre', () => {
    expect(formatEnderecoUnidade({ cidade: 'Curitiba', estado: 'PR' })).toBe('Curitiba/PR')
  })

  it('cai para só a cidade quando não há estado', () => {
    expect(formatEnderecoUnidade({ cidade: 'Curitiba' })).toBe('Curitiba')
  })

  it('mostra só o endereço livre quando não há cidade (dado legado)', () => {
    expect(formatEnderecoUnidade({ endereco: 'Rua Antiga, 5' })).toBe('Rua Antiga, 5')
  })

  it('ignora campos em branco / nulos e retorna string vazia quando não há nada', () => {
    expect(
      formatEnderecoUnidade({ endereco: '  ', bairro: null, cidade: '', estado: undefined }),
    ).toBe('')
  })
})
