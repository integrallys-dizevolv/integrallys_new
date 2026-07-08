import { getAppSupabase } from '@/lib/app-api'

/**
 * Integração Sicredi Pix (padrão BACEN). Zero SDK — apenas `fetch` nativo.
 *
 * Token OAuth2 (client_credentials) cacheado em variável de módulo com
 * expiração. Limitação conhecida: a API Pix do Sicredi exige certificado
 * mTLS em produção — `fetch` nativo não anexa o certificado do cliente; em
 * produção será necessário um proxy/mTLS (documentado no README). Sandbox e a
 * estrutura (cobrança/consulta/webhook) ficam funcionais. Qualquer resposta
 * não-OK retorna `null` e NÃO bloqueia o fluxo de agendamento/lançamento.
 *
 * O QR Code não é gerado localmente (zero deps): retornamos o
 * `qrCodeCopiaECola` (EMV) e, quando o gateway devolve `imagemQrcode`, também
 * o base64. A UI prioriza o copia-e-cola.
 */

/**
 * ⚠️  LIMITAÇÃO DE PRODUÇÃO — SICREDI PIX mTLS                       [SEC-04.6]
 *
 * A API Pix do Sicredi em produção exige autenticação mTLS (certificado de
 * cliente PKCS#12). O `fetch` nativo do Node.js / Next.js NÃO suporta
 * certificado de cliente sem configuração adicional — as chamadas para
 * `https://api-pix.sicredi.com.br` falham com TLS handshake / 401 enquanto
 * essa lacuna não for resolvida no ambiente de runtime.
 *
 * OPÇÕES PARA PRODUÇÃO:
 *   1. Proxy mTLS dedicado (ex.: nginx com `proxy_ssl_certificate` +
 *      `proxy_ssl_certificate_key`) fazendo forward dos requests para
 *      `https://api-pix.sicredi.com.br`, com o certificado anexado pelo
 *      proxy. A app passa a chamar `https://<proxy-interno>` sem mTLS.
 *   2. Usar `https.Agent` do Node.js com `pfx` + `passphrase` (requer
 *      abandonar `fetch` nativo e adotar `node-fetch` ou `axios`, e
 *      garantir que o agent seja anexado em TODAS as chamadas Sicredi).
 *   3. `NODE_EXTRA_CA_CERTS` NÃO resolve mTLS — controla apenas confiança
 *      em CAs servidores, não envia certificado de cliente. Não é solução.
 *
 * Em SANDBOX (`api-pix-h.sicredi.com.br`) o mTLS não é exigido e a
 * implementação atual funciona corretamente — útil pra integrar end-to-end
 * antes do go-live.
 *
 * STATUS: pendente de definição com o cliente antes do go-live Sicredi.
 *         Ver `AGENTS.md` → "Pendências de Go-Live".
 */

export interface SicrediConfig {
  clientId: string
  clientSecret: string
  ambiente: 'sandbox' | 'producao'
  chavePix: string
}

interface CachedToken {
  token: string
  expiresAt: number
}

let tokenCache: CachedToken | null = null

function sicrediBase(ambiente: SicrediConfig['ambiente']) {
  return ambiente === 'producao'
    ? 'https://api-pix.sicredi.com.br'
    : 'https://api-pix-h.sicredi.com.br'
}

export async function getSicrediConfig(): Promise<SicrediConfig | null> {
  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('configuracoes')
    .select('chave,valor')
    .eq('categoria', 'sicredi')

  if (error || !data?.length) return null

  const map: Record<string, string> = {}
  for (const row of data) map[row.chave] = row.valor ?? ''

  if (map['sicredi.ativo'] !== 'true') return null

  const clientId = map['sicredi.client_id']?.trim()
  const clientSecret = map['sicredi.client_secret']?.trim()
  const chavePix = map['sicredi.chave_pix']?.trim()
  if (!clientId || !clientSecret || !chavePix) return null

  return {
    clientId,
    clientSecret,
    ambiente: map['sicredi.ambiente'] === 'producao' ? 'producao' : 'sandbox',
    chavePix,
  }
}

async function getSicrediToken(config: SicrediConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token
  }

  const base = sicrediBase(config.ambiente)
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch(`${base}/auth/openapi/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'cob.write cob.read' }),
  })

  if (!response.ok) {
    throw new Error(`Sicredi token HTTP ${response.status}`)
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Sicredi token ausente')

  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  }
  return tokenCache.token
}

/** Exposto para o "Testar conexão" da tela de configurações. */
export async function testarSicrediToken(
  config: SicrediConfig,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await getSicrediToken(config)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function gerarTxid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 35)
}

export async function criarCobrancaPix(
  config: SicrediConfig,
  params: { valor: number; descricao: string; txid?: string; expiracao?: number },
): Promise<{ txid: string; qrCode: string; qrCodeCopiaECola: string } | null> {
  try {
    const token = await getSicrediToken(config)
    const base = sicrediBase(config.ambiente)
    const txid = params.txid?.trim() || gerarTxid()

    const response = await fetch(`${base}/pix/v2/cob/${txid}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendario: { expiracao: params.expiracao ?? 3600 },
        valor: { original: params.valor.toFixed(2) },
        chave: config.chavePix,
        solicitacaoPagador: params.descricao.slice(0, 140),
      }),
    })

    if (!response.ok) return null
    const json = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!json) return null

    return {
      txid: String(json.txid ?? txid),
      qrCode: String(json.imagemQrcode ?? ''),
      qrCodeCopiaECola: String(json.pixCopiaECola ?? ''),
    }
  } catch {
    return null
  }
}

export async function consultarPix(
  config: SicrediConfig,
  txid: string,
): Promise<{ status: string; pago: boolean; pago_em?: string } | null> {
  try {
    const token = await getSicrediToken(config)
    const base = sicrediBase(config.ambiente)
    const response = await fetch(`${base}/pix/v2/cob/${txid}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return null
    const json = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!json) return null

    const status = String(json.status ?? '')
    const pago = status === 'CONCLUIDA'
    const pixArr = Array.isArray(json.pix) ? (json.pix as Array<Record<string, unknown>>) : []
    const pagoEm = pixArr[0]?.horario ? String(pixArr[0].horario) : undefined

    return { status, pago, pago_em: pagoEm }
  } catch {
    return null
  }
}
