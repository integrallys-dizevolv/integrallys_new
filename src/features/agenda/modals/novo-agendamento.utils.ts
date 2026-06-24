export type TipoAtendimento = 'presencial' | 'online' | 'hibrido'

// Valores do enum public.modalidade_atendimento (migration 013):
// 'Presencial' | 'Online' | 'Hibrido'  — atenção: 'Hibrido' é SEM acento.
const MODALIDADE_POR_TIPO: Record<TipoAtendimento, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Hibrido',
}

/**
 * Converte a escolha do modal (tipoAtendimento minúsculo) no valor do enum +
 * a plataforma. Presencial não carrega plataforma (evita lixo de seleção anterior).
 */
export function resolveModalidade(
  tipoAtendimento: TipoAtendimento,
  plataformaOnline: string,
): { modalidade: string; plataformaOnline?: string } {
  const comOnline = tipoAtendimento === 'online' || tipoAtendimento === 'hibrido'
  return {
    modalidade: MODALIDADE_POR_TIPO[tipoAtendimento],
    plataformaOnline: comOnline ? plataformaOnline : undefined,
  }
}
