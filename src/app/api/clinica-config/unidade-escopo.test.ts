import { describe, expect, it } from 'vitest'
import { MENSAGEM_RESOLUCAO, resolverUnidadeConfig } from './unidade-escopo'

const NATUR_VIDA = '88e832f7-4209-45d2-8147-710ee85eb7fb'
const OUTRA = '11111111-2222-3333-4444-555555555555'

describe('resolverUnidadeConfig', () => {
  describe('chamador escopado com unidade (gestor/recepção/especialista)', () => {
    it('usa a unidade do JWT', () => {
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: true,
          scopedUnidadeId: NATUR_VIDA,
          unidadeIdInformada: null,
          unidadesDisponiveis: [NATUR_VIDA, OUTRA],
        }),
      ).toEqual({ ok: true, unidadeId: NATUR_VIDA })
    })

    it('ignora unidadeId informado pelo cliente (anti-IDOR)', () => {
      // Um gestor não pode escapar do próprio escopo mandando outra unidade
      // no corpo/query — mesma regra do precedente em documento_templates.
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: true,
          scopedUnidadeId: NATUR_VIDA,
          unidadeIdInformada: OUTRA,
          unidadesDisponiveis: [NATUR_VIDA, OUTRA],
        }),
      ).toEqual({ ok: true, unidadeId: NATUR_VIDA })
    })
  })

  describe('papel escopado SEM unidade no cadastro (gestor/recepção com unidade_id nulo)', () => {
    // Caso real hoje: gestor e recepção estão com unidade_id nulo no banco, e
    // getScopedUnitId devolve null — igualzinho ao null "sem escopo" de
    // master/admin. Sem distinguir os dois, um gestor escaparia do próprio
    // escopo mandando ?unidadeId=<outra>. Papel escopado nunca escolhe unidade.
    it('não aceita unidadeId informado, mesmo com o escopo vazio', () => {
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: true,
          scopedUnidadeId: null,
          unidadeIdInformada: OUTRA,
          unidadesDisponiveis: [NATUR_VIDA, OUTRA],
        }),
      ).toEqual({ ok: false, codigo: 'UNIDADE_NAO_INFORMADA' })
    })

    it('ainda resolve sozinho quando só existe uma unidade', () => {
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: true,
          scopedUnidadeId: null,
          unidadeIdInformada: OUTRA,
          unidadesDisponiveis: [NATUR_VIDA],
        }),
      ).toEqual({ ok: true, unidadeId: NATUR_VIDA })
    })
  })

  describe('master/admin (sem escopo — unidadeId null de propósito)', () => {
    it('resolve sozinho quando só existe uma unidade cadastrada', () => {
      // Não faz sentido pedir para escolher entre uma opção só.
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: false,
          scopedUnidadeId: null,
          unidadeIdInformada: null,
          unidadesDisponiveis: [NATUR_VIDA],
        }),
      ).toEqual({ ok: true, unidadeId: NATUR_VIDA })
    })

    it('exige seleção explícita quando existe mais de uma unidade', () => {
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: false,
          scopedUnidadeId: null,
          unidadeIdInformada: null,
          unidadesDisponiveis: [NATUR_VIDA, OUTRA],
        }),
      ).toEqual({ ok: false, codigo: 'UNIDADE_NAO_INFORMADA' })
    })

    it('aceita a unidade informada quando existe mais de uma', () => {
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: false,
          scopedUnidadeId: null,
          unidadeIdInformada: OUTRA,
          unidadesDisponiveis: [NATUR_VIDA, OUTRA],
        }),
      ).toEqual({ ok: true, unidadeId: OUTRA })
    })

    it('dá precedência ao unidadeId informado sobre a resolução automática', () => {
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: false,
          scopedUnidadeId: null,
          unidadeIdInformada: OUTRA,
          unidadesDisponiveis: [NATUR_VIDA],
        }),
      ).toEqual({ ok: true, unidadeId: OUTRA })
    })

    it('trata string vazia ou só espaços como não informado', () => {
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: false,
          scopedUnidadeId: null,
          unidadeIdInformada: '   ',
          unidadesDisponiveis: [NATUR_VIDA, OUTRA],
        }),
      ).toEqual({ ok: false, codigo: 'UNIDADE_NAO_INFORMADA' })
    })

    it('ignora unidadeId que não é string', () => {
      expect(
        resolverUnidadeConfig({
          chamadorEscopado: false,
          scopedUnidadeId: null,
          unidadeIdInformada: 42,
          unidadesDisponiveis: [NATUR_VIDA],
        }),
      ).toEqual({ ok: true, unidadeId: NATUR_VIDA })
    })
  })

  it('erra de forma explícita quando não há nenhuma unidade cadastrada', () => {
    // Sistema sem unidade nenhuma: não há identidade a configurar. Precisa ser
    // erro nomeado e recuperável, não crash nem "usuário sem unidade".
    expect(
      resolverUnidadeConfig({
        chamadorEscopado: false,
        scopedUnidadeId: null,
        unidadeIdInformada: null,
        unidadesDisponiveis: [],
      }),
    ).toEqual({ ok: false, codigo: 'SEM_UNIDADES' })
  })

  it('tem mensagem para todo código de falha que a função pode devolver', () => {
    // Guarda: código novo sem mensagem viraria `undefined` na resposta da API.
    const codigos = ['SEM_UNIDADES', 'UNIDADE_NAO_INFORMADA'] as const
    for (const codigo of codigos) {
      expect(MENSAGEM_RESOLUCAO[codigo]).toBeTruthy()
    }
  })
})
