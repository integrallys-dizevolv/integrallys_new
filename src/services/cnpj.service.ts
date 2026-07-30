import { normalizarCNPJ, validarCNPJ } from '@/lib/validacao-br'

// Consulta de CNPJ na BrasilAPI (base pública da Receita Federal) para
// auto-preenchimento de razão social e endereço.
//
// Este serviço NUNCA lança exceção: a consulta é enriquecimento de cadastro, não
// obrigatoriedade. "Não encontrado" é esperado para empresa recém-aberta (e para
// todo CNPJ alfanumérico enquanto a base não estiver populada), e falha de rede
// nunca pode travar o formulário.
//
// A BrasilAPI já aceita o formato alfanumérico na URL, então o CNPJ normalizado
// é enviado como está — sem precisar de tratamento separado.

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

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor).trim()
}

export async function consultarCnpj(cnpj: string): Promise<ConsultaCnpj> {
  if (!validarCNPJ(cnpj)) return { status: 'invalido' }

  const normalizado = normalizarCNPJ(cnpj)

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${normalizado}`, {
      headers: {
        Accept: 'application/json',
        // A BrasilAPI responde 403 para o User-Agent padrão do fetch do Node
        // ("node"), então identificamos a aplicação. No navegador este header é
        // proibido e simplesmente ignorado — quem manda é o próprio navegador.
        'User-Agent': 'Integrallys/1.0 (+cadastro de unidades e fornecedores)',
      },
      cache: 'no-store',
    })

    if (response.status === 404) return { status: 'nao-encontrado' }

    if (!response.ok) {
      return { status: 'erro', mensagem: `Falha ao consultar o CNPJ (${response.status}).` }
    }

    const data = (await response.json()) as Record<string, unknown>

    return {
      status: 'encontrado',
      empresa: {
        cnpj: normalizado,
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
      },
    }
  } catch {
    return { status: 'erro', mensagem: 'Não foi possível consultar o CNPJ agora.' }
  }
}
