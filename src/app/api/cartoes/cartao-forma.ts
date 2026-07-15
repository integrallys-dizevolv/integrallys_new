// Item 9c — lógica pura da forma de pagamento "espelho" de um cartão empresarial.
// Cada cartão gera/atualiza uma linha em formas_pagamento (tipo cartao_credito,
// com cartao_id apontando pra ele). Segue o padrão de fornecedor-input.ts /
// procedimento-input.ts (lógica pura, testável).

export interface CartaoFormaPayload {
  nome: string
  tipo: 'cartao_credito'
  cartao_id: string
  ativo: boolean
}

// Nome distintivo (formas_pagamento.nome é UNIQUE). Anexa os últimos dígitos
// quando houver, para reduzir colisão entre cartões de mesmo nome.
export function buildCartaoFormaNome(nome: string, ultimosDigitos?: string | null): string {
  const base = nome.trim()
  const digitos = (ultimosDigitos ?? '').replace(/\D/g, '').slice(-4)
  return digitos ? `${base} ••${digitos}` : base
}

export function buildCartaoFormaPayload(
  cartaoId: string,
  nome: string,
  ultimosDigitos?: string | null,
): CartaoFormaPayload {
  return {
    nome: buildCartaoFormaNome(nome, ultimosDigitos),
    tipo: 'cartao_credito',
    cartao_id: cartaoId,
    ativo: true,
  }
}
