import { normalizarCNPJ, validarCNPJ } from '@/lib/validacao-br'

// Consulta de CNPJ para auto-preenchimento de razão social e endereço, com duas
// fontes públicas da base da Receita Federal: BrasilAPI (principal) e
// minhaReceita (fallback).
//
// Por que duas fontes: as duas espelham a mesma base, mas sincronizam em ritmos
// diferentes. Já vimos ao vivo um MEI que a Receita confirma existir e que a
// BrasilAPI ainda não tinha indexado — registros abertos pelo Portal do
// Empreendedor costumam demorar mais a aparecer. Com uma fonte só, "não
// encontrado" acabava significando "esta fonte não tem", não "não existe".
//
// A regra que sai disso, e que os testes travam:
//   · qualquer fonte encontrou            → encontrado
//   · as DUAS responderam 404 limpo       → nao-encontrado (aí sim é ausência)
//   · alguma consulta não completou       → erro (não dá pra afirmar ausência)
//
// Este serviço NUNCA lança exceção nem bloqueia o cadastro: a consulta é
// enriquecimento, não obrigatoriedade.
//
// As duas APIs expõem o mesmo schema da Receita, então um único mapper atende
// as duas — o endereço preenchido não depende de quem respondeu. Ambas também
// já aceitam o formato alfanumérico na URL, então o CNPJ normalizado vai como
// está.

export interface EmpresaCnpj {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  email: string
  telefone: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    estado: string
  }
}

export type ConsultaCnpj =
  | { status: 'encontrado'; empresa: EmpresaCnpj }
  | { status: 'invalido' }
  | { status: 'nao-encontrado' }
  | { status: 'erro'; mensagem: string }

// Resultado de UMA fonte. Separar "nao-encontrado" de "falha" é o núcleo do
// fallback: só um 404 limpo prova ausência. Timeout, 5xx e queda de rede não
// provam nada, e não podem virar "não encontrado".
type RespostaFonte =
  | { tipo: 'encontrado'; empresa: EmpresaCnpj }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'falha' }

// Curto de propósito: as fontes são consultadas em série, então o pior caso é
// o dobro disto. As duas respondem em ~0,6s medidos, e nada aqui bloqueia o
// salvamento — desistir cedo é melhor do que segurar o formulário.
const TIMEOUT_MS = 4000

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor).trim()
}

function mapearEmpresa(cnpj: string, data: Record<string, unknown>): EmpresaCnpj {
  return {
    cnpj,
    razaoSocial: texto(data.razao_social),
    nomeFantasia: texto(data.nome_fantasia),
    email: texto(data.email),
    telefone: texto(data.ddd_telefone_1).replace(/\s/g, ''),
    endereco: {
      cep: texto(data.cep).replace(/\D/g, ''),
      logradouro: texto(data.logradouro),
      numero: texto(data.numero),
      complemento: texto(data.complemento),
      bairro: texto(data.bairro),
      cidade: texto(data.municipio),
      estado: texto(data.uf),
    },
  }
}

async function consultarFonte(url: string, cnpj: string): Promise<RespostaFonte> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        // A BrasilAPI responde 403 para o User-Agent padrão do fetch do Node
        // ("node"), então identificamos a aplicação. No navegador este header é
        // proibido e simplesmente ignorado — quem manda é o próprio navegador.
        'User-Agent': 'Integrallys/1.0 (+cadastro de unidades e fornecedores)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (response.status === 404) return { tipo: 'nao-encontrado' }

    // Qualquer outro status fora da faixa de sucesso (429, 5xx, e até um 400
    // inesperado) é resposta que não conseguimos interpretar como ausência.
    if (!response.ok) return { tipo: 'falha' }

    const data = (await response.json()) as Record<string, unknown>

    return { tipo: 'encontrado', empresa: mapearEmpresa(cnpj, data) }
  } catch {
    // Timeout, DNS, TLS, JSON quebrado: a consulta não completou.
    return { tipo: 'falha' }
  }
}

export async function consultarCnpj(cnpj: string): Promise<ConsultaCnpj> {
  if (!validarCNPJ(cnpj)) return { status: 'invalido' }

  const normalizado = normalizarCNPJ(cnpj)

  const brasilApi = await consultarFonte(
    `https://brasilapi.com.br/api/cnpj/v1/${normalizado}`,
    normalizado,
  )
  if (brasilApi.tipo === 'encontrado') {
    return { status: 'encontrado', empresa: brasilApi.empresa }
  }

  const minhaReceita = await consultarFonte(`https://minhareceita.org/${normalizado}`, normalizado)
  if (minhaReceita.tipo === 'encontrado') {
    return { status: 'encontrado', empresa: minhaReceita.empresa }
  }

  if (brasilApi.tipo === 'nao-encontrado' && minhaReceita.tipo === 'nao-encontrado') {
    return { status: 'nao-encontrado' }
  }

  return { status: 'erro', mensagem: 'Não foi possível consultar o CNPJ agora.' }
}
