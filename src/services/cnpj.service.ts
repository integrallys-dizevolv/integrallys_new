export interface CnpjResult {
  razaoSocial: string
  cnpj: string
  email?: string
  telefone?: string
  endereco?: {
    cep?: string
    logradouro?: string
    numero?: string
    bairro?: string
    cidade?: string
    uf?: string
  }
}

function sanitizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

function validateCnpj(digits: string): boolean {
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false
  return true
}

export async function buscarCnpj(cnpj: string): Promise<CnpjResult> {
  const digits = sanitizeCnpj(cnpj)

  if (!validateCnpj(digits)) {
    throw new Error('CNPJ inválido. Informe os 14 dígitos.')
  }

  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (response.status === 404) {
    throw new Error('CNPJ não encontrado na Receita Federal.')
  }

  if (!response.ok) {
    throw new Error(`Falha ao consultar CNPJ (${response.status}). Tente novamente.`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as Record<string, any>

  return {
    razaoSocial: String(data.razao_social ?? data.nome_fantasia ?? ''),
    cnpj: digits,
    email: data.email ? String(data.email) : undefined,
    telefone: data.ddd_telefone_1
      ? String(data.ddd_telefone_1).replace(/\s/g, '')
      : undefined,
    endereco: {
      cep: data.cep ? String(data.cep).replace(/\D/g, '') : undefined,
      logradouro: data.logradouro ? String(data.logradouro) : undefined,
      numero: data.numero ? String(data.numero) : undefined,
      bairro: data.bairro ? String(data.bairro) : undefined,
      cidade: data.municipio ? String(data.municipio) : undefined,
      uf: data.uf ? String(data.uf) : undefined,
    },
  }
}
