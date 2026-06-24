import { describe, expect, it } from 'vitest'
import { mapFornecedorRow, validateFornecedorInput } from './fornecedor-input'

describe('validateFornecedorInput', () => {
  it('sem nome → rejeitado', () => {
    const r = validateFornecedorInput({ razaoSocial: 'ACME LTDA' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('NOME_REQUIRED')
  })

  it('válido: monta fornecedorDados, normaliza email e default de status', () => {
    const r = validateFornecedorInput({
      nome: 'ACME Suprimentos',
      email: 'Contato@ACME.COM',
      telefone: '11 1234-5678',
      razaoSocial: 'ACME Comércio LTDA',
      cnpj: '12.345.678/0001-90',
      inscricaoEstadual: 'IE-123',
      contatoNome: 'João',
      contatoSetor: 'Compras',
      categoriaDre: 'Insumos',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.nome).toBe('ACME Suprimentos')
      expect(r.value.email).toBe('contato@acme.com')
      expect(r.value.status).toBe('Ativo')
      expect(r.value.fornecedorDados).toEqual({
        razaoSocial: 'ACME Comércio LTDA',
        cnpj: '12.345.678/0001-90',
        inscricaoEstadual: 'IE-123',
        contatoNome: 'João',
        contatoSetor: 'Compras',
        categoriaDre: 'Insumos',
      })
    }
  })

  it('campos de fornecedorDados ausentes viram null', () => {
    const r = validateFornecedorInput({ nome: 'Fornecedor Simples' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.fornecedorDados.cnpj).toBeNull()
      expect(r.value.fornecedorDados.razaoSocial).toBeNull()
      expect(r.value.telefone).toBeNull()
      expect(r.value.email).toBeNull()
    }
  })

  it('status informado é preservado', () => {
    const r = validateFornecedorInput({ nome: 'X', status: 'Inativo' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.status).toBe('Inativo')
  })
})

describe('mapFornecedorRow', () => {
  it('achata fornecedor_dados (JSONB) nos campos do item', () => {
    const item = mapFornecedorRow({
      id: 'f1',
      nome: 'ACME',
      telefone: '11999',
      email: 'a@b.com',
      status: 'Ativo',
      unidade_id: 'u1',
      fornecedor_dados: {
        razaoSocial: 'ACME LTDA',
        cnpj: '123',
        inscricaoEstadual: 'IE',
        contatoNome: 'João',
        contatoSetor: 'Compras',
        categoriaDre: 'Insumos',
      },
    })
    expect(item).toEqual({
      id: 'f1',
      nome: 'ACME',
      telefone: '11999',
      email: 'a@b.com',
      status: 'Ativo',
      unidadeId: 'u1',
      razaoSocial: 'ACME LTDA',
      cnpj: '123',
      inscricaoEstadual: 'IE',
      contatoNome: 'João',
      contatoSetor: 'Compras',
      categoriaDre: 'Insumos',
    })
  })

  it('fornecedor_dados nulo → campos de dados null', () => {
    const item = mapFornecedorRow({ id: 'f2', nome: 'Sem dados', fornecedor_dados: null })
    expect(item.id).toBe('f2')
    expect(item.razaoSocial).toBeNull()
    expect(item.cnpj).toBeNull()
    expect(item.status).toBe('Ativo')
  })

  it('round-trip: validate → linha → map preserva os dados', () => {
    const v = validateFornecedorInput({ nome: 'ACME', cnpj: '999', razaoSocial: 'ACME LTDA' })
    if (!v.ok) throw new Error('esperava ok')
    const item = mapFornecedorRow({
      id: 'f3',
      nome: v.value.nome,
      telefone: v.value.telefone,
      email: v.value.email,
      status: v.value.status,
      fornecedor_dados: v.value.fornecedorDados,
    })
    expect(item.cnpj).toBe('999')
    expect(item.razaoSocial).toBe('ACME LTDA')
  })
})
