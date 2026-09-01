import { describe, expect, it } from 'vitest'
import { resolveAgendamentoProcedimento } from './agendamento-procedimento'

type Row = Record<string, unknown>

function makeSupabase(config: {
  procedimento?: Row | null
  vinculos?: Row[]
}) {
  return {
    from(table: string) {
      if (table === 'procedimentos') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: config.procedimento ?? null, error: null }),
            }),
          }),
        }
      }
      if (table === 'profissional_procedimentos') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: config.vinculos ?? [], error: null }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
}

describe('resolveAgendamentoProcedimento', () => {
  it('sem procedimento retorna ids nulos', async () => {
    const result = await resolveAgendamentoProcedimento(makeSupabase({}) as never, {
      procedimentoId: '',
      valorProcedimento: null,
      profissionalId: 'prof-1',
    })
    expect(result).toEqual({
      ok: true,
      data: { procedimentoId: null, valorProcedimento: null },
    })
  })

  it('preenche valor a partir do cadastro do procedimento', async () => {
    const result = await resolveAgendamentoProcedimento(
      makeSupabase({
        procedimento: { id: 'proc-1', valor: 250, ativo: true },
        vinculos: [{ procedimento_id: 'proc-1' }],
      }) as never,
      {
        procedimentoId: 'proc-1',
        valorProcedimento: null,
        profissionalId: 'prof-1',
      },
    )
    expect(result).toEqual({
      ok: true,
      data: { procedimentoId: 'proc-1', valorProcedimento: 250 },
    })
  })

  it('rejeita procedimento não vinculado ao profissional', async () => {
    const result = await resolveAgendamentoProcedimento(
      makeSupabase({
        procedimento: { id: 'proc-2', valor: 100, ativo: true },
        vinculos: [{ procedimento_id: 'proc-1' }],
      }) as never,
      {
        procedimentoId: 'proc-2',
        valorProcedimento: null,
        profissionalId: 'prof-1',
      },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('PROCEDIMENTO_NAO_VINCULADO')
    }
  })
})
