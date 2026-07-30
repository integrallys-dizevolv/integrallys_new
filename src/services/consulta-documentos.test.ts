import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarCep } from './cep.service'
import { consultarCnpj } from './cnpj.service'

// Contrato central destes dois serviços: eles NUNCA lançam exceção. Consulta a
// CEP/CNPJ é enriquecimento de cadastro, então falha de rede ou "não encontrado"
// tem que virar um resultado tratável, nunca travar o formulário.

function stubFetch(impl: (url: string) => Promise<unknown> | unknown) {
  const spy = vi.fn(async (input: string | URL) => impl(String(input)))
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
        logradouro: 'AVENIDA REPUBLICA DO CHILE',
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
