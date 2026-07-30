import { validarCEP } from '@/lib/validacao-br'

// Consulta de CEP no ViaCEP para auto-preenchimento de endereço.
//
// Este serviço NUNCA lança exceção: preencher endereço a partir do CEP é
// enriquecimento de cadastro, então "não encontrado" e falha de rede são
// resultados normais que o formulário trata sem travar o salvamento.

export interface EnderecoCep {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

export type ConsultaCep =
  | { status: 'encontrado'; endereco: EnderecoCep }
  | { status: 'invalido' }
  | { status: 'nao-encontrado' }
  | { status: 'erro'; mensagem: string }

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

export async function buscarCep(cep: string): Promise<ConsultaCep> {
  if (!validarCEP(cep)) return { status: 'invalido' }

  const digitos = cep.replace(/\D/g, '')

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      return { status: 'erro', mensagem: `Falha ao consultar o CEP (${response.status}).` }
    }

    const data = (await response.json()) as Record<string, unknown>

    // O ViaCEP sinaliza CEP inexistente com `erro`, que já veio como boolean
    // true e como a string "true" dependendo da rota.
    if (data.erro === true || data.erro === 'true') return { status: 'nao-encontrado' }

    return {
      status: 'encontrado',
      endereco: {
        cep: texto(data.cep).replace(/\D/g, '') || digitos,
        logradouro: texto(data.logradouro),
        complemento: texto(data.complemento),
        bairro: texto(data.bairro),
        cidade: texto(data.localidade),
        estado: texto(data.uf),
      },
    }
  } catch {
    return { status: 'erro', mensagem: 'Não foi possível consultar o CEP agora.' }
  }
}
