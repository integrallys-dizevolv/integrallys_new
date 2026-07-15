// Lógica pura (testável) do cadastro de Procedimentos — Item 8.
// Espelha o padrão de fornecedor-input.ts / conta-input.ts.

export interface ProcedimentoPayload {
  nome: string
  codigo: string | null
  descricao: string | null
  valor: number | null
  duracao_min: number | null
  tem_retorno: boolean
  prazo_retorno_dias: number | null
  valor_retorno: number | null
  ativo: boolean
}

// Código automático quando não informado — mesmo estilo de generateNumero() em
// prescricoes (prefixo + fatia final do timestamp), livre de corrida.
export function generateCodigo(): string {
  return `PROC-${Date.now().toString().slice(-8)}`
}

export function parseNumeric(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseInteger(value: unknown): number | null {
  const parsed = parseNumeric(value)
  return parsed == null ? null : Math.trunc(parsed)
}

// Payload compartilhado entre POST e PUT. Enforça a coerência do retorno:
// quando tem_retorno = false, prazo e valor de retorno voltam a null (nunca
// violam o check `procedimentos_retorno_coerente` da migration 084).
export function buildProcedimentoPayload(
  body: Record<string, unknown>,
  opts: { autoCodigo: boolean },
): ProcedimentoPayload {
  const codigoInformado = body.codigo ? String(body.codigo).trim() : ''
  const temRetorno = body.temRetorno === true
  return {
    nome: String(body.nome),
    codigo: codigoInformado || (opts.autoCodigo ? generateCodigo() : null),
    descricao: body.descricao ? String(body.descricao) : null,
    valor: parseNumeric(body.valor),
    duracao_min: parseInteger(body.duracaoMin),
    tem_retorno: temRetorno,
    prazo_retorno_dias: temRetorno ? parseInteger(body.prazoRetornoDias) : null,
    valor_retorno: temRetorno ? parseNumeric(body.valorRetorno) : null,
    ativo: body.ativo !== false,
  }
}
