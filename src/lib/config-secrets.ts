/**
 * Mascaramento de chaves sensíveis da tabela `configuracoes`.
 *
 * Restrição TAREFA-WPP-01 / TAREFA-FIN-01: segredos de integração (API keys,
 * merchant keys, client secrets) nunca podem aparecer no response de GET
 * de `/api/configuracoes`. São retornados como `CONFIG_MASK`.
 *
 * No PUT, itens cujo valor é exatamente `CONFIG_MASK` são ignorados — assim
 * salvar o formulário sem redigitar o segredo NÃO sobrescreve o valor real.
 * Serviços server-side (ex.: getWhatsappConfig) leem o valor cru direto do
 * banco e não passam por este mascaramento.
 */

export const CONFIG_MASK = '••••••••'

/** Chaves cujo `valor` deve ser mascarado em GETs de configuração. */
export const SENSITIVE_CONFIG_KEYS = new Set<string>([
  'whatsapp.api_key',
  'cielo.merchant_key',
  'cielo.link_access_token',
  'sicredi.client_secret',
])

export function isSensitiveConfigKey(chave: string): boolean {
  return SENSITIVE_CONFIG_KEYS.has(chave)
}

/** Retorna o valor mascarado quando a chave é sensível e tem conteúdo. */
export function maskConfigValue(chave: string, valor: string): string {
  if (isSensitiveConfigKey(chave) && valor.length > 0) {
    return CONFIG_MASK
  }
  return valor
}

/** True quando o valor recebido é o sentinela de máscara (não deve sobrescrever). */
export function isMaskedValue(valor: string): boolean {
  return valor === CONFIG_MASK
}
