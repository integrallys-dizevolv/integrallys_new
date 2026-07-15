export interface EnderecoUnidadeLike {
  endereco?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}

/**
 * Monta uma linha única e consistente do endereço de uma unidade.
 *
 * Formato-alvo quando há dados estruturados: "Rua, número — Bairro, Cidade/UF".
 * Faz fallback progressivo conforme os campos disponíveis, para que telas
 * diferentes nunca mostrem o mesmo endereço em formatos distintos:
 *   - endereço + local -> "Av. Paulista, 1000 — Bela Vista, São Paulo/SP"
 *   - só cidade + UF    -> "São Paulo/SP"
 *   - só cidade         -> "São Paulo"
 *   - só endereço livre -> "Av. Paulista, 1000"
 *   - nada              -> ""
 */
export function formatEnderecoUnidade(unidade: EnderecoUnidadeLike): string {
  const endereco = unidade.endereco?.trim() ?? ''
  const bairro = unidade.bairro?.trim() ?? ''
  const cidade = unidade.cidade?.trim() ?? ''
  const estado = unidade.estado?.trim() ?? ''

  const cidadeUf = cidade && estado ? `${cidade}/${estado}` : cidade
  const local = [bairro, cidadeUf].filter(Boolean).join(', ')

  if (endereco && local) return `${endereco} — ${local}`
  return endereco || local
}
