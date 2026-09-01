/** Status em que prescrição não pode ser editada nem excluída (cláusula 4). */
export const IMMUTABLE_PRESCRIPTION_STATUSES = ['Convertida', 'Cancelada'] as const

export type ImmutablePrescriptionStatus = (typeof IMMUTABLE_PRESCRIPTION_STATUSES)[number]

/**
 * Prescrições assinadas (`Ativa`) e complementares (`Pendente`) permanecem editáveis
 * até conversão em venda — decisão de negócio confirmável na homologação (QA-2.4).
 */
export function isPrescriptionImmutable(status: string): boolean {
  return (IMMUTABLE_PRESCRIPTION_STATUSES as readonly string[]).includes(status)
}
