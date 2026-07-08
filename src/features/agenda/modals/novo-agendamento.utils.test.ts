import { describe, expect, it } from 'vitest'
import { resolveModalidade } from './novo-agendamento.utils'

describe('resolveModalidade (modal → payload)', () => {
  it('online → enum "Online" e mantém a plataforma', () => {
    expect(resolveModalidade('online', 'google_meet')).toEqual({
      modalidade: 'Online',
      plataformaOnline: 'google_meet',
    })
  })

  it('híbrido → "Hibrido" SEM acento (enum public.modalidade_atendimento) e mantém a plataforma', () => {
    expect(resolveModalidade('hibrido', 'zoom')).toEqual({
      modalidade: 'Hibrido',
      plataformaOnline: 'zoom',
    })
  })

  it('presencial → "Presencial" e zera a plataforma (sem lixo)', () => {
    expect(resolveModalidade('presencial', 'google_meet')).toEqual({
      modalidade: 'Presencial',
      plataformaOnline: undefined,
    })
  })
})
