import { describe, expect, it } from 'vitest'
import { normalizeContaTipo, validateContaInput } from './conta-input'

describe('normalizeContaTipo', () => {
  it('preserva tipos válidos, incluindo dinheiro', () => {
    expect(normalizeContaTipo('dinheiro')).toBe('dinheiro')
    expect(normalizeContaTipo('poupanca')).toBe('poupanca')
    expect(normalizeContaTipo('investimento')).toBe('investimento')
    expect(normalizeContaTipo('corrente')).toBe('corrente')
  })

  it('cai para corrente em valor desconhecido/ausente', () => {
    expect(normalizeContaTipo('xpto')).toBe('corrente')
    expect(normalizeContaTipo(undefined)).toBe('corrente')
  })
})

describe('validateContaInput', () => {
  it('dinheiro: só nome + saldo, sem dados bancários → ok', () => {
    const r = validateContaInput({ nome: 'Caixa Recepção', tipo: 'dinheiro', saldoInicial: 150 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.tipo).toBe('dinheiro')
      expect(r.value.banco).toBeNull()
      expect(r.value.agencia).toBeNull()
      expect(r.value.conta).toBeNull()
      expect(r.value.saldoInicial).toBe(150)
    }
  })

  it('dinheiro: ignora dados bancários enviados por engano (banco vira null)', () => {
    const r = validateContaInput({
      nome: 'Cofre',
      tipo: 'dinheiro',
      banco: 'Itaú',
      agencia: '0001',
      saldoInicial: 0,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.banco).toBeNull()
      expect(r.value.agencia).toBeNull()
    }
  })

  it('corrente sem banco → aceita (backend leniente, comportamento original)', () => {
    const r = validateContaInput({ nome: 'Conta principal', tipo: 'corrente', saldoInicial: 0 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.tipo).toBe('corrente')
      expect(r.value.banco).toBeNull()
    }
  })

  it('corrente com banco → ok', () => {
    const r = validateContaInput({
      nome: 'Conta principal',
      tipo: 'corrente',
      banco: 'Itaú',
      saldoInicial: 0,
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.banco).toBe('Itaú')
  })

  it('sem nome → rejeitada', () => {
    const r = validateContaInput({ tipo: 'dinheiro', saldoInicial: 0 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('NOME_REQUIRED')
  })

  it('saldo inválido vira 0', () => {
    const r = validateContaInput({ nome: 'Cofre', tipo: 'dinheiro', saldoInicial: 'abc' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.saldoInicial).toBe(0)
  })
})
