import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarCep } from './cep.service'
import { consultarCnpj } from './cnpj.service'

// Contrato central destes dois serviços: eles NUNCA lançam exceção. Consulta a
// CEP/CNPJ é enriquecimento de cadastro, então falha de rede ou "não encontrado"
// tem que virar um resultado tratável, nunca travar o formulário.

function stubFetch(impl: (url: string) => Promise<unknown> | unknown) {
  const spy = vi.fn(async (input: string | URL, _init?: RequestInit) => impl(String(input)))
  vi.stubGlobal('fetch', spy)
  return spy
}

function respostaJson(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buscarCep', () => {
  it('devolve o endereço quando o ViaCEP encontra o CEP', async () => {
    stubFetch(() =>
      respostaJson({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        complemento: 'de 612 a 1510 - lado par',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    )

    const resultado = await buscarCep('01310-100')

    expect(resultado).toEqual({
      status: 'encontrado',
      endereco: {
        cep: '01310100',
        logradouro: 'Avenida Paulista',
        complemento: 'de 612 a 1510 - lado par',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      },
    })
  })

  it('consulta o ViaCEP apenas com os dígitos do CEP', async () => {
    const spy = stubFetch(() =>
      respostaJson({ cep: '01310-100', localidade: 'São Paulo', uf: 'SP' }),
    )

    await buscarCep('01310-100')

    expect(spy).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/', expect.anything())
  })

  it('devolve invalido sem chamar a rede quando o CEP não tem 8 dígitos', async () => {
    const spy = stubFetch(() => respostaJson({}))

    expect(await buscarCep('0131010')).toEqual({ status: 'invalido' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('devolve nao-encontrado quando o ViaCEP responde com erro:true', async () => {
    stubFetch(() => respostaJson({ erro: true }))

    expect(await buscarCep('99999999')).toEqual({ status: 'nao-encontrado' })
  })

  it('devolve nao-encontrado quando o ViaCEP responde erro como string', async () => {
    // O ViaCEP já respondeu `{"erro": "true"}` (string) em algumas rotas.
    stubFetch(() => respostaJson({ erro: 'true' }))

    expect(await buscarCep('99999999')).toEqual({ status: 'nao-encontrado' })
  })

  it('devolve erro, sem lançar exceção, quando a rede falha', async () => {
    stubFetch(() => Promise.reject(new Error('network down')))

    const resultado = await buscarCep('01310100')

    expect(resultado.status).toBe('erro')
  })

  it('devolve erro quando o ViaCEP responde com status HTTP de falha', async () => {
    stubFetch(() => respostaJson({}, 500))

    expect((await buscarCep('01310100')).status).toBe('erro')
  })
})

describe('consultarCnpj', () => {
  it('devolve a empresa quando a BrasilAPI encontra o CNPJ', async () => {
    stubFetch(() =>
      respostaJson({
        razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS',
        nome_fantasia: 'PETROBRAS',
        email: 'contato@petrobras.com.br',
        ddd_telefone_1: '21 32242040',
        cep: '20031-170',
        descricao_tipo_de_logradouro: 'AVENIDA',
        logradouro: 'REPUBLICA DO CHILE',
        numero: '65',
        bairro: 'CENTRO',
        municipio: 'RIO DE JANEIRO',
        uf: 'RJ',
      }),
    )

    const resultado = await consultarCnpj('33.000.167/0001-01')

    expect(resultado.status).toBe('encontrado')
    if (resultado.status !== 'encontrado') return
    expect(resultado.empresa.razaoSocial).toBe('PETROLEO BRASILEIRO S A PETROBRAS')
    expect(resultado.empresa.nomeFantasia).toBe('PETROBRAS')
    expect(resultado.empresa.telefone).toBe('2132242040')
    expect(resultado.empresa.endereco.cep).toBe('20031170')
    expect(resultado.empresa.endereco.cidade).toBe('RIO DE JANEIRO')
  })

  it('devolve invalido sem chamar a rede quando o dígito verificador não confere', async () => {
    const spy = stubFetch(() => respostaJson({}))

    expect(await consultarCnpj('33.000.167/0001-02')).toEqual({ status: 'invalido' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('consulta a BrasilAPI com o CNPJ normalizado, aceitando alfanumérico', async () => {
    const spy = stubFetch(() => respostaJson({ razao_social: 'EMPRESA TESTE' }))

    await consultarCnpj('12.abc.345/01de-35')

    expect(spy).toHaveBeenCalledWith(
      'https://brasilapi.com.br/api/cnpj/v1/12ABC34501DE35',
      expect.anything(),
    )
  })

  it('devolve nao-encontrado no 404 (empresa nova ainda não indexada)', async () => {
    stubFetch(() => respostaJson({ type: 'not_found' }, 404))

    expect(await consultarCnpj('12.ABC.345/01DE-35')).toEqual({ status: 'nao-encontrado' })
  })

  it('devolve erro, sem lançar exceção, quando a rede falha', async () => {
    stubFetch(() => Promise.reject(new Error('network down')))

    expect((await consultarCnpj('33.000.167/0001-01')).status).toBe('erro')
  })

  it('devolve erro quando a BrasilAPI responde 429 ou 500', async () => {
    stubFetch(() => respostaJson({}, 429))
    expect((await consultarCnpj('33.000.167/0001-01')).status).toBe('erro')

    stubFetch(() => respostaJson({}, 500))
    expect((await consultarCnpj('33.000.167/0001-01')).status).toBe('erro')
  })

  it('não inventa razão social quando a BrasilAPI devolve o campo vazio', async () => {
    stubFetch(() => respostaJson({ razao_social: '', nome_fantasia: '' }))

    const resultado = await consultarCnpj('33.000.167/0001-01')

    expect(resultado.status).toBe('encontrado')
    if (resultado.status !== 'encontrado') return
    expect(resultado.empresa.razaoSocial).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Fallback de segunda fonte
//
// BrasilAPI e minhaReceita espelham a mesma base da Receita Federal, mas
// sincronizam em ritmos diferentes — vimos ao vivo um MEI que a Receita
// confirma existir e que a BrasilAPI ainda não tinha indexado.
//
// Daí a regra que estes testes travam: "não encontrado" só pode aparecer
// quando as DUAS fontes responderam 404 de forma limpa. Se alguma consulta não
// completou (timeout, 5xx, rede), não temos como afirmar que o CNPJ não
// existe — o certo é "erro".
// ---------------------------------------------------------------------------

// Resposta real, campo a campo, de GET https://minhareceita.org/33000167000101
// — a BrasilAPI devolve exatamente os mesmos nomes e valores para este CNPJ.
const EMPRESA_MINHA_RECEITA = {
  cnpj: '33000167000101',
  razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS',
  nome_fantasia: 'PETROBRAS - EDISE',
  email: null,
  ddd_telefone_1: '2121660000',
  cep: '20031170',
  descricao_tipo_de_logradouro: 'AVENIDA',
  logradouro: 'REPUBLICA DO CHILE',
  numero: '65',
  complemento: '',
  bairro: 'CENTRO',
  municipio: 'RIO DE JANEIRO',
  uf: 'RJ',
}

function ehMinhaReceita(url: string) {
  return url.includes('minhareceita.org')
}

/** Responde diferente por fonte, para exercitar cada combinação da tabela. */
function stubFontes(fontes: {
  brasilApi: () => Promise<unknown> | unknown
  minhaReceita: () => Promise<unknown> | unknown
}) {
  return stubFetch((url) => (ehMinhaReceita(url) ? fontes.minhaReceita() : fontes.brasilApi()))
}

const falhaDeRede = () => Promise.reject(new Error('network down'))

describe('consultarCnpj · fallback da segunda fonte', () => {
  it('não gasta a segunda fonte quando a BrasilAPI já encontrou', async () => {
    const spy = stubFontes({
      brasilApi: () => respostaJson(EMPRESA_MINHA_RECEITA),
      minhaReceita: () => respostaJson({ razao_social: 'NÃO DEVERIA SER CHAMADA' }),
    })

    expect((await consultarCnpj('33.000.167/0001-01')).status).toBe('encontrado')
    expect(spy.mock.calls.some(([url]) => ehMinhaReceita(String(url)))).toBe(false)
  })

  it('encontra pela minhaReceita quando a BrasilAPI ainda não indexou o CNPJ', async () => {
    stubFontes({
      brasilApi: () => respostaJson({ type: 'not_found' }, 404),
      minhaReceita: () => respostaJson(EMPRESA_MINHA_RECEITA),
    })

    const resultado = await consultarCnpj('33.000.167/0001-01')

    expect(resultado.status).toBe('encontrado')
    if (resultado.status !== 'encontrado') return
    expect(resultado.empresa.razaoSocial).toBe('PETROLEO BRASILEIRO S A PETROBRAS')
  })

  it('encontra pela minhaReceita quando a BrasilAPI cai por falha de rede', async () => {
    stubFontes({
      brasilApi: falhaDeRede,
      minhaReceita: () => respostaJson(EMPRESA_MINHA_RECEITA),
    })

    expect((await consultarCnpj('33.000.167/0001-01')).status).toBe('encontrado')
  })

  it('consulta a minhaReceita no endpoint documentado, com o CNPJ normalizado', async () => {
    const spy = stubFontes({
      brasilApi: () => respostaJson({}, 404),
      minhaReceita: () => respostaJson(EMPRESA_MINHA_RECEITA),
    })

    await consultarCnpj('12.abc.345/01de-35')

    expect(spy).toHaveBeenCalledWith('https://minhareceita.org/12ABC34501DE35', expect.anything())
  })

  it('devolve nao-encontrado quando as duas fontes confirmam 404', async () => {
    stubFontes({
      brasilApi: () => respostaJson({}, 404),
      minhaReceita: () => respostaJson({ message: 'CNPJ não encontrado.' }, 404),
    })

    expect(await consultarCnpj('33.000.167/0001-01')).toEqual({ status: 'nao-encontrado' })
  })

  it('devolve erro, não nao-encontrado, quando a BrasilAPI falhou e a minhaReceita não achou', async () => {
    // A minhaReceita respondeu 404 limpo, mas a BrasilAPI nunca respondeu.
    // Afirmar "não existe" aqui seria mentir sobre o que foi realmente checado.
    stubFontes({
      brasilApi: () => respostaJson({}, 500),
      minhaReceita: () => respostaJson({}, 404),
    })

    expect((await consultarCnpj('33.000.167/0001-01')).status).toBe('erro')
  })

  it('devolve erro quando a BrasilAPI não achou e a minhaReceita falhou por comunicação', async () => {
    stubFontes({
      brasilApi: () => respostaJson({}, 404),
      minhaReceita: falhaDeRede,
    })

    expect((await consultarCnpj('33.000.167/0001-01')).status).toBe('erro')
  })

  it('devolve erro quando as duas fontes falham por comunicação', async () => {
    stubFontes({ brasilApi: falhaDeRede, minhaReceita: falhaDeRede })

    expect((await consultarCnpj('33.000.167/0001-01')).status).toBe('erro')
  })

  it('mapeia a minhaReceita no mesmo formato que a BrasilAPI produziria', async () => {
    // As duas expõem o mesmo schema da Receita, então o endereço preenchido no
    // formulário não pode depender de qual fonte respondeu.
    stubFetch(() => respostaJson(EMPRESA_MINHA_RECEITA))
    const viaBrasilApi = await consultarCnpj('33.000.167/0001-01')

    stubFontes({
      brasilApi: () => respostaJson({}, 404),
      minhaReceita: () => respostaJson(EMPRESA_MINHA_RECEITA),
    })
    const viaMinhaReceita = await consultarCnpj('33.000.167/0001-01')

    expect(viaMinhaReceita).toEqual(viaBrasilApi)
    expect(viaBrasilApi.status).toBe('encontrado')
  })

  it('compõe o logradouro com o tipo, que vem em campo separado nas duas fontes', async () => {
    // Resposta real de GET /33000167000101 nas DUAS fontes:
    //   descricao_tipo_de_logradouro: "AVENIDA"
    //   logradouro:                   "REPUBLICA DO CHILE"
    // Sem juntar, o formulário grava um endereço truncado.
    stubFetch(() => respostaJson(EMPRESA_MINHA_RECEITA))

    const resultado = await consultarCnpj('33.000.167/0001-01')

    expect(resultado.status).toBe('encontrado')
    if (resultado.status !== 'encontrado') return
    expect(resultado.empresa.endereco.logradouro).toBe('AVENIDA REPUBLICA DO CHILE')
  })

  it('compõe igual quando o logradouro é só um número (caso real da Natur & Vida)', async () => {
    // Resposta real de GET /48175688000177 nas duas fontes. Este é o caso que
    // deixa o defeito óbvio: sem o tipo, o endereço vira literalmente "16".
    stubFetch(() =>
      respostaJson({
        razao_social: 'NATUR E VIDA LTDA',
        descricao_tipo_de_logradouro: 'RUA',
        logradouro: '16',
        numero: '699',
        bairro: 'GUARUJA',
        municipio: 'AGUA BOA',
        uf: 'MT',
      }),
    )

    const resultado = await consultarCnpj('48.175.688/0001-77')

    expect(resultado.status).toBe('encontrado')
    if (resultado.status !== 'encontrado') return
    expect(resultado.empresa.endereco.logradouro).toBe('RUA 16')
  })

  it('não deixa espaço sobrando quando o tipo vem vazio', async () => {
    // Também é resposta real: CNPJ baixado devolve os dois campos como "".
    stubFetch(() =>
      respostaJson({
        razao_social: 'X',
        descricao_tipo_de_logradouro: '',
        logradouro: 'DAS FLORES',
      }),
    )

    const resultado = await consultarCnpj('33.000.167/0001-01')

    expect(resultado.status).toBe('encontrado')
    if (resultado.status !== 'encontrado') return
    expect(resultado.empresa.endereco.logradouro).toBe('DAS FLORES')
  })

  it('devolve string vazia quando não há nem tipo nem logradouro', async () => {
    stubFetch(() =>
      respostaJson({ razao_social: 'X', descricao_tipo_de_logradouro: '', logradouro: '' }),
    )

    const resultado = await consultarCnpj('33.000.167/0001-01')

    expect(resultado.status).toBe('encontrado')
    if (resultado.status !== 'encontrado') return
    expect(resultado.empresa.endereco.logradouro).toBe('')
  })

  it('limita cada fonte com timeout, para não somar as esperas em série', async () => {
    const spy = stubFontes({
      brasilApi: () => respostaJson({}, 404),
      minhaReceita: () => respostaJson(EMPRESA_MINHA_RECEITA),
    })

    await consultarCnpj('33.000.167/0001-01')

    expect(spy.mock.calls).toHaveLength(2)
    for (const [, init] of spy.mock.calls) {
      expect((init as RequestInit | undefined)?.signal).toBeInstanceOf(AbortSignal)
    }
  })
})
