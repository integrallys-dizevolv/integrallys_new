import { describe, expect, it } from 'vitest'
import { resolverUnidadeUsuario } from './usuario-input'

const NATUR_VIDA = '88e832f7-4209-45d2-8147-710ee85eb7fb'

describe('resolverUnidadeUsuario', () => {
  describe('perfis escopados por unidade', () => {
    for (const perfil of ['gestor', 'recepcao', 'especialista']) {
      it(`aceita a unidade informada para ${perfil}`, () => {
        expect(resolverUnidadeUsuario(perfil, { unidadeId: NATUR_VIDA })).toEqual({
          ok: true,
          unidadeId: NATUR_VIDA,
        })
      })

      it(`exige unidade para ${perfil} — sem ela o usuário nasce sem escopo`, () => {
        // Defesa em profundidade: o formulário já exige, mas quem chama a API
        // direto não pode criar um gestor órfão de unidade. Foi exatamente esse
        // buraco que deixou 7 contas sem unidade no banco.
        expect(resolverUnidadeUsuario(perfil, {})).toEqual({
          ok: false,
          codigo: 'USER_UNIDADE_REQUIRED',
        })
      })
    }

    it('trata string vazia ou só espaços como ausente', () => {
      expect(resolverUnidadeUsuario('gestor', { unidadeId: '   ' })).toEqual({
        ok: false,
        codigo: 'USER_UNIDADE_REQUIRED',
      })
    })

    it('aceita a forma snake_case vinda de clientes diretos da API', () => {
      expect(resolverUnidadeUsuario('gestor', { unidade_id: NATUR_VIDA })).toEqual({
        ok: true,
        unidadeId: NATUR_VIDA,
      })
    })

    it('normaliza o perfil antes de decidir', () => {
      expect(resolverUnidadeUsuario('  Gestor  ', {})).toEqual({
        ok: false,
        codigo: 'USER_UNIDADE_REQUIRED',
      })
    })
  })

  describe('perfis sem escopo de unidade', () => {
    for (const perfil of ['master', 'admin', 'paciente']) {
      it(`devolve null para ${perfil}, mesmo sem unidade informada`, () => {
        expect(resolverUnidadeUsuario(perfil, {})).toEqual({ ok: true, unidadeId: null })
      })

      it(`ignora unidade informada para ${perfil} — guardar seria mentira`, () => {
        // master/admin são "sem escopo, vê tudo" (getScopedUnitId) e paciente
        // não é escopado por unidade. Persistir um valor aqui daria a impressão
        // de um escopo que o sistema não aplica.
        expect(resolverUnidadeUsuario(perfil, { unidadeId: NATUR_VIDA })).toEqual({
          ok: true,
          unidadeId: null,
        })
      })
    }
  })

  it('ignora unidadeId que não é string', () => {
    expect(resolverUnidadeUsuario('gestor', { unidadeId: 42 })).toEqual({
      ok: false,
      codigo: 'USER_UNIDADE_REQUIRED',
    })
  })
})
