import type { SupabaseClient } from '@supabase/supabase-js'

export type AgendamentoProcedimentoResolved = {
  procedimentoId: string | null
  valorProcedimento: number | null
}

/**
 * Resolve procedimento + valor para POST/PUT de agendamento.
 * Se procedimentoId informado, preenche valor_procedimento a partir do cadastro
 * quando o body não envia valorProcedimento explicitamente.
 */
export async function resolveAgendamentoProcedimento(
  supabase: SupabaseClient,
  params: {
    procedimentoId: unknown
    valorProcedimento: unknown
    profissionalId: string | null
  },
): Promise<
  | { ok: true; data: AgendamentoProcedimentoResolved }
  | { ok: false; code: string; message: string }
> {
  const rawId =
    typeof params.procedimentoId === 'string' && params.procedimentoId.trim().length > 0
      ? params.procedimentoId.trim()
      : null

  if (!rawId) {
    const explicit =
      params.valorProcedimento != null && params.valorProcedimento !== ''
        ? Number(params.valorProcedimento)
        : null
    return {
      ok: true,
      data: {
        procedimentoId: null,
        valorProcedimento: explicit != null && Number.isFinite(explicit) ? explicit : null,
      },
    }
  }

  const { data: proc, error: procError } = await supabase
    .from('procedimentos')
    .select('id,valor,ativo')
    .eq('id', rawId)
    .maybeSingle()

  if (procError) {
    return { ok: false, code: 'PROCEDIMENTO_LOOKUP_FAILED', message: 'Falha ao carregar procedimento' }
  }
  if (!proc?.id) {
    return { ok: false, code: 'PROCEDIMENTO_NOT_FOUND', message: 'Procedimento não encontrado' }
  }
  if (proc.ativo === false) {
    return { ok: false, code: 'PROCEDIMENTO_INATIVO', message: 'Procedimento inativo' }
  }

  if (params.profissionalId) {
    const { data: vinculos, error: vincError } = await supabase
      .from('profissional_procedimentos')
      .select('procedimento_id')
      .eq('profissional_id', params.profissionalId)

    if (vincError) {
      return {
        ok: false,
        code: 'PROCEDIMENTO_VINCULO_FAILED',
        message: 'Falha ao validar procedimentos do profissional',
      }
    }

    const allowed = (vinculos ?? []).map((row) => String(row.procedimento_id ?? ''))
    if (allowed.length > 0 && !allowed.includes(String(proc.id))) {
      return {
        ok: false,
        code: 'PROCEDIMENTO_NAO_VINCULADO',
        message: 'Procedimento não vinculado a este profissional',
      }
    }
  }

  const explicit =
    params.valorProcedimento != null && params.valorProcedimento !== ''
      ? Number(params.valorProcedimento)
      : null
  const valorFromProc = proc.valor != null ? Number(proc.valor) : null
  const valorProcedimento =
    explicit != null && Number.isFinite(explicit)
      ? explicit
      : valorFromProc != null && Number.isFinite(valorFromProc)
        ? valorFromProc
        : null

  return {
    ok: true,
    data: {
      procedimentoId: String(proc.id),
      valorProcedimento,
    },
  }
}
