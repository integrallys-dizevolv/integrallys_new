/**
 * Cláusula 4 / CR-SEC-01: especialista nunca recebe valores monetários.
 * A sanitização é sempre no servidor — a UI só esconde o que a API omitiu.
 */

export function isFinanciallyRestrictedRole(role?: string | null): boolean {
  return role === 'especialista'
}

/** Prescrição mapeada: zera totais e unitários; flag valoresOcultos. */
export function stripPrescricaoFinancialFields<
  T extends {
    valorTotal: number
    valorBruto?: number
    valorParcela?: number
    descontoValor?: number
    descontoPercentual?: number
    items?: Array<{ unitPrice?: number; total?: number }>
  },
>(item: T, role?: string | null): T & { valoresOcultos?: boolean } {
  if (!isFinanciallyRestrictedRole(role)) return item
  return {
    ...item,
    valoresOcultos: true,
    valorTotal: 0,
    valorBruto: undefined,
    valorParcela: undefined,
    descontoValor: undefined,
    descontoPercentual: undefined,
    items: (item.items ?? []).map((line) => ({
      ...line,
      unitPrice: 0,
      total: 0,
    })),
  }
}

/** Item do histórico de atendimento: omite preço unitário. */
export function stripHistoricoValorUnitario(
  valorUnitario: number | null,
  role?: string | null,
): number | null {
  if (isFinanciallyRestrictedRole(role)) return null
  return valorUnitario
}

/** Produto de estoque: remove custo/venda. */
export function stripEstoquePrices<T extends { precoCusto?: number; precoVenda?: number }>(
  item: T,
  role?: string | null,
): T {
  if (!isFinanciallyRestrictedRole(role)) return item
  const { precoCusto: _c, precoVenda: _v, ...rest } = item
  return rest as T
}

/** Linha de relatório de prescrições: zera valorTotal. */
export function stripRelatorioPrescricaoValor(
  valorTotal: number,
  role?: string | null,
): number {
  if (isFinanciallyRestrictedRole(role)) return 0
  return valorTotal
}
