// Vínculos que NÃO são clientes e não devem aparecer na lista de Pacientes.
// Fornecedor/prestador são linhas de `pacientes` com vinculo_tipo próprio; têm
// telas próprias (ex.: /fornecedores) e vazavam na lista de clientes.
const VINCULOS_NAO_CLIENTE = new Set(['fornecedor', 'prestador'])

/**
 * Null-safe: mantém quem é cliente OU não tem vínculo (null/undefined/'' —
 * legados que o mapper trata como cliente). Exclui apenas fornecedor/prestador.
 * NÃO usa igualdade a 'cliente' de propósito (sumiria os legados sem vínculo).
 */
export function isClientePaciente(vinculoTipo?: string | null): boolean {
  const normalized = (vinculoTipo ?? '').trim().toLowerCase()
  return !VINCULOS_NAO_CLIENTE.has(normalized)
}
