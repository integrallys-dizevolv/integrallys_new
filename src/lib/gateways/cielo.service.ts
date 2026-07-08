import { getAppSupabase } from '@/lib/app-api'

/**
 * Integração Cielo — produto "Link de Pagamento". Zero SDK — apenas `fetch`
 * nativo, parsing defensivo.
 *
 * Fluxo: o app apenas GERA um link de cobrança; o paciente paga nesse link; a
 * confirmação chega por webhook (postback) + polling. O app NUNCA coleta dados
 * de cartão.
 *
 * ⚠️ VERIFICAR (variam por conta/versão da Cielo): endpoint/host do Link de
 * Pagamento, esquema de autenticação (Bearer x MerchantId/MerchantKey) e os
 * nomes de campos da resposta. Tudo é defensivo: qualquer resposta não-OK ou
 * inesperada retorna `null` e NÃO bloqueia o fluxo de agendamento/lançamento.
 */

export interface CieloConfig {
  merchantId: string
  merchantKey: string
  /** "Chave de Integração" do Link de Pagamento (Bearer). Opcional na prática. */
  linkAccessToken: string
  ambiente: 'sandbox' | 'producao'
}

/**
 * Hosts da API 3.0 (venda / consulta reversa). O Link de Pagamento usa host
 * próprio (`CIELO_LINK_HOST`), não estes.
 */
function cieloHosts(ambiente: CieloConfig['ambiente']) {
  if (ambiente === 'producao') {
    return {
      transacao: 'https://api.cieloecommerce.cielo.com.br',
      consulta: 'https://apiquery.cieloecommerce.cielo.com.br',
    }
  }
  return {
    transacao: 'https://apisandbox.cieloecommerce.cielo.com.br',
    consulta: 'https://apiquerysandbox.cieloecommerce.cielo.com.br',
  }
}

// ⚠️ VERIFICAR: o Link de Pagamento normalmente NÃO tem host de sandbox próprio
// — usa-se o host de produção mesmo para testes (valor baixo).
const CIELO_LINK_HOST = 'https://cieloecommerce.cielo.com.br'

export async function getCieloConfig(): Promise<CieloConfig | null> {
  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('configuracoes')
    .select('chave,valor')
    .eq('categoria', 'cielo')

  if (error || !data?.length) return null

  const map: Record<string, string> = {}
  for (const row of data) map[row.chave] = row.valor ?? ''

  if (map['cielo.ativo'] !== 'true') return null

  const merchantId = map['cielo.merchant_id']?.trim() ?? ''
  const merchantKey = map['cielo.merchant_key']?.trim() ?? ''
  const linkAccessToken = map['cielo.link_access_token']?.trim() ?? ''

  // Válida se houver OU o Access Token do Link, OU o par MerchantId+MerchantKey.
  if (!linkAccessToken && !(merchantId && merchantKey)) return null

  return {
    merchantId,
    merchantKey,
    linkAccessToken,
    ambiente: map['cielo.ambiente'] === 'producao' ? 'producao' : 'sandbox',
  }
}

/**
 * Auth do Link de Pagamento: usa Bearer quando há Access Token; caso contrário,
 * cai para MerchantId/MerchantKey. ⚠️ VERIFICAR conforme a conta.
 */
function cieloLinkHeaders(config: CieloConfig): Record<string, string> {
  if (config.linkAccessToken) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.linkAccessToken}`,
    }
  }
  return {
    'Content-Type': 'application/json',
    MerchantId: config.merchantId,
    MerchantKey: config.merchantKey,
  }
}

/** Consulta reversa 3.0 (venda) usa SEMPRE MerchantId/MerchantKey — nunca Bearer. */
function cieloHeaders(config: CieloConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    MerchantId: config.merchantId,
    MerchantKey: config.merchantKey,
  }
}

/** Mapeia o Status numérico da Cielo (venda 3.0) para o status interno. */
export function mapCieloStatus(status: unknown): {
  status: 'pendente' | 'autorizado' | 'capturado' | 'cancelado' | 'erro'
  pago: boolean
} {
  switch (Number(status)) {
    case 1:
      return { status: 'autorizado', pago: false }
    case 2:
      return { status: 'capturado', pago: true }
    case 0:
      return { status: 'pendente', pago: false }
    case 3:
    case 13:
      return { status: 'cancelado', pago: false }
    default:
      return { status: 'erro', pago: false }
  }
}

/**
 * Normaliza o status do Link de Pagamento, que pode vir como TEXTO ou número.
 * Numérico cai em `mapCieloStatus` (status de venda 3.0). ⚠️ VERIFICAR os
 * rótulos textuais conforme a conta.
 */
export function mapCieloLinkStatus(status: unknown): {
  status: 'pendente' | 'autorizado' | 'capturado' | 'cancelado' | 'erro'
  pago: boolean
} {
  const raw = String(status ?? '').trim()
  if (raw !== '' && /^\d+$/.test(raw)) return mapCieloStatus(raw)

  const s = raw.toLowerCase()
  if (['paid', 'paga', 'pago', 'confirmed', 'completed'].includes(s)) {
    return { status: 'capturado', pago: true }
  }
  if (['pending', 'created', 'pendente', 'open', 'active'].includes(s)) {
    return { status: 'pendente', pago: false }
  }
  if (
    ['denied', 'canceled', 'cancelled', 'cancelado', 'refunded', 'expired', 'expirado'].includes(s)
  ) {
    return { status: 'cancelado', pago: false }
  }
  return { status: 'erro', pago: false }
}

/** Data no formato yyyy-MM-dd (sem hora). */
function toYyyyMmDd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Cria um produto "Link de Pagamento" e devolve o link encurtado.
 *
 * IMPORTANTE: aqui `paymentId` é o ID DO LINK (produto), NÃO um PaymentId de
 * venda 3.0 (esse só nasce quando o paciente paga). A forma de retorno é mantida
 * porque o insert em `/api/pagamentos/online` consome `paymentId`/`linkPagamento`/`status`.
 */
export async function criarCobrancaCielo(
  config: CieloConfig,
  params: { valor: number; descricao: string; referencia: string; parcelas?: number },
): Promise<{ paymentId: string; linkPagamento: string; status: string } | null> {
  // Valor sempre em centavos na API Cielo (o sistema usa reais).
  const price = Math.round(params.valor * 100)
  const parcelas = Math.min(12, Math.max(1, params.parcelas ?? 1))
  const expiracao = new Date()
  expiracao.setDate(expiracao.getDate() + 7)

  try {
    // ⚠️ VERIFICAR endpoint/host e nomes de campos do Link de Pagamento.
    const response = await fetch(`${CIELO_LINK_HOST}/api/public/v1/products`, {
      method: 'POST',
      headers: cieloLinkHeaders(config),
      body: JSON.stringify({
        type: 'Digital',
        name: params.descricao.slice(0, 128),
        description: `Ref: ${params.referencia}`,
        showDescription: false,
        price,
        expirationDate: toYyyyMmDd(expiracao),
        maxNumberOfInstallments: parcelas,
        sku: params.referencia,
        softDescriptor: params.descricao.slice(0, 13),
      }),
    })

    if (!response.ok) return null
    const json = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!json) return null

    const id = String(json.id ?? json.Id ?? json.productId ?? '')
    const shortUrl = String(json.shortUrl ?? json.ShortUrl ?? json.url ?? '')
    if (!id || !shortUrl) return null

    return { paymentId: id, linkPagamento: shortUrl, status: 'pendente' }
  } catch {
    return null
  }
}

/** Lê o status de um campo de pedido cobrindo variações de nome. */
function pedidoStatus(order: Record<string, unknown>): unknown {
  return order.status ?? order.Status ?? order.payment_status ?? order.paymentStatus
}

/**
 * Consulta os pedidos de um Link de Pagamento (productId é o ID DO LINK). Se
 * algum pedido estiver pago, retorna pago=true; senão, o status do mais recente.
 * ⚠️ VERIFICAR endpoint de pedidos e ordenação por data.
 */
export async function consultarPedidoLinkCielo(
  config: CieloConfig,
  productId: string,
): Promise<{ status: string; pago: boolean } | null> {
  try {
    const response = await fetch(`${CIELO_LINK_HOST}/api/public/v1/products/${productId}/orders`, {
      method: 'GET',
      headers: cieloLinkHeaders(config),
    })
    if (!response.ok) return null
    const json = (await response.json().catch(() => null)) as unknown
    // TEMP: remover após validar campos do postback
    console.log('[cielo orders]', JSON.stringify(json))
    if (!json) return null

    let orders: Array<Record<string, unknown>> = []
    if (Array.isArray(json)) {
      orders = json as Array<Record<string, unknown>>
    } else if (typeof json === 'object') {
      const maybe = (json as Record<string, unknown>).orders
      if (Array.isArray(maybe)) orders = maybe as Array<Record<string, unknown>>
    }

    if (!orders.length) return { status: 'pendente', pago: false }

    for (const order of orders) {
      const mapped = mapCieloLinkStatus(pedidoStatus(order))
      if (mapped.pago) return mapped
    }

    // Sem pedido pago: status do mais recente. ⚠️ VERIFICAR critério de "recente".
    const recente = orders[orders.length - 1]
    return mapCieloLinkStatus(pedidoStatus(recente))
  } catch {
    return null
  }
}

/**
 * Consulta reversa de uma VENDA 3.0 (quando já existe um PaymentId de venda).
 * Usa MerchantId/MerchantKey — NÃO usa Bearer.
 */
export async function consultarPagamentoCielo(
  config: CieloConfig,
  paymentId: string,
): Promise<{ status: string; pago: boolean } | null> {
  const { consulta } = cieloHosts(config.ambiente)
  try {
    const response = await fetch(`${consulta}/1/sales/${paymentId}`, {
      method: 'GET',
      headers: cieloHeaders(config),
    })
    if (!response.ok) return null
    const json = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!json) return null
    const payment = (json.Payment ?? {}) as Record<string, unknown>
    return mapCieloStatus(payment.Status)
  } catch {
    return null
  }
}
