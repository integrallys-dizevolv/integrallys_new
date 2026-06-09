/**
 * Templates de documentos clínicos — API única [SEC-05 fechado, 2026-05-21]
 *
 * Persistência via `/api/documentos/templates*` em `documento_templates`
 * (escopo por unidade). O legado sync com `localStorage` foi removido pelo
 * Agente 19 — não havia mais consumers em `src/` além desta lib.
 *
 * NOTA SOBRE MAPEAMENTO DE TIPO
 *   A API guarda `conteudo` como JSONB. As helpers async marshalham
 *   string ↔ `{ corpo: <string> }` pra manter a interface
 *   `Record<slug, string>` no consumidor. Leitura prefere `conteudo.corpo`
 *   e, se ausente, devolve `JSON.stringify(conteudo)` como fallback.
 */

interface ApiTemplateRow {
  id: string
  slug: string
  conteudo?: unknown
}

interface ApiListResponse {
  data?: ApiTemplateRow[]
}

interface ApiItemResponse {
  data?: ApiTemplateRow
}

/** Extrai uma string canônica do `conteudo` JSONB da API. */
function extractContent(conteudo: unknown): string | null {
  if (conteudo == null) return null
  if (typeof conteudo === 'string') return conteudo
  if (typeof conteudo === 'object') {
    const c = conteudo as Record<string, unknown>
    if (typeof c.corpo === 'string') return c.corpo
    try {
      return JSON.stringify(c)
    } catch {
      return null
    }
  }
  return null
}

/** Lê 1 template pelo slug; retorna `null` em 404 ou erro de rede. */
export async function loadDocumentTemplateAsync(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/documentos/templates/${encodeURIComponent(slug)}`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const payload = (await res.json()) as ApiItemResponse
    return extractContent(payload.data?.conteudo)
  } catch {
    return null
  }
}

/** Lê todos os templates da unidade em um único request. Retorna `Record<slug, content>`. */
export async function loadDocumentTemplatesAsync(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/documentos/templates?incluir_inativos=true', {
      credentials: 'include',
    })
    if (!res.ok) return {}
    const payload = (await res.json()) as ApiListResponse
    const rows = payload.data ?? []
    const out: Record<string, string> = {}
    for (const row of rows) {
      const content = extractContent(row.conteudo)
      if (content !== null && row.slug) out[row.slug] = content
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Salva conteúdo num template existente (escopo da unidade), localizando-o
 * pelo `slug` e atualizando `conteudo = { corpo: content }` via PATCH.
 *
 * Retorna `false` quando o slug não existe na unidade — esta helper NÃO cria
 * template novo (criação exige `nome`/`tipo` e é feita pelo hook
 * `useDocumentTemplates`, fora deste fluxo de edição inline).
 */
export async function saveDocumentTemplateAsync(slug: string, content: string): Promise<boolean> {
  try {
    const lookup = await fetch(`/api/documentos/templates/${encodeURIComponent(slug)}`, {
      credentials: 'include',
    })
    if (!lookup.ok) return false
    const lookupBody = (await lookup.json()) as ApiItemResponse
    const id = lookupBody.data?.id
    if (!id) return false

    const patch = await fetch('/api/documentos/templates', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, conteudo: { corpo: content } }),
    })
    return patch.ok
  } catch {
    return false
  }
}

/**
 * "Reset" do conteúdo de um template: faz PATCH zerando `conteudo.corpo` (não
 * deleta o template em si — deleção real exige `id` e é exclusiva do hook
 * administrativo, que cuida de docs-emitidos dependentes).
 */
export async function resetDocumentTemplateAsync(slug: string): Promise<boolean> {
  return saveDocumentTemplateAsync(slug, '')
}
