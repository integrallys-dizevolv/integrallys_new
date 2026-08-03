// Resolve QUAL unidade a identidade da clínica está lendo/gravando.
//
// master/admin: `getScopedUnitId` devolve unidadeId null de propósito ("sem
// escopo, vê tudo"). Não tratar como NO_UNIT — esse era o bug: o null de
// "sem escopo" era lido como "usuário sem unidade" e virava 400.
//
// Diferença em relação ao precedente de `documento_templates`: lá cada template
// é uma linha nova, então master/admin escolhem a unidade a cada criação. Aqui
// `clinica_config` é 1:1 com a unidade (`unidade_id unique not null`, migration
// 025) — é identidade, não cadastro que se repete. Então quando existe uma só
// unidade no sistema não há o que escolher, e resolver sozinho é o certo.

export type CodigoResolucao = 'SEM_UNIDADES' | 'UNIDADE_NAO_INFORMADA'

export type ResolucaoUnidade =
  | { ok: true; unidadeId: string }
  | { ok: false; codigo: CodigoResolucao }

// Mensagens ficam aqui (e não nas rotas) para as duas rotas responderem igual.
// Deixado como dado puro de propósito: este módulo não importa `next/server`,
// então continua testável sem subir runtime de API.
export const MENSAGEM_RESOLUCAO: Record<CodigoResolucao, string> = {
  SEM_UNIDADES:
    'Nenhuma unidade cadastrada — cadastre uma unidade antes de configurar a identidade da clínica.',
  UNIDADE_NAO_INFORMADA:
    'Informe a unidade (unidadeId): há mais de uma unidade cadastrada e o seu perfil não é escopado a nenhuma.',
}

export function resolverUnidadeConfig(params: {
  /**
   * Papel escopado por unidade (gestor/recepção/especialista) — independente de
   * ter unidade preenchida. Precisa vir separado de `scopedUnidadeId` porque os
   * dois nulls significam coisas diferentes: master/admin é "sem escopo, pode
   * escolher"; gestor sem unidade no cadastro é "escopado, mas com dado
   * faltando" — e esse nunca pode escolher, senão escapa do próprio escopo.
   */
  chamadorEscopado: boolean
  scopedUnidadeId: string | null
  unidadeIdInformada: unknown
  unidadesDisponiveis: string[]
}): ResolucaoUnidade {
  const { chamadorEscopado, scopedUnidadeId, unidadeIdInformada, unidadesDisponiveis } = params

  // Chamador escopado manda no próprio escopo: o que vier do cliente é
  // ignorado, senão um gestor sairia da própria unidade (anti-IDOR).
  if (scopedUnidadeId) return { ok: true, unidadeId: scopedUnidadeId }

  const informada =
    !chamadorEscopado && typeof unidadeIdInformada === 'string' ? unidadeIdInformada.trim() : ''
  if (informada) return { ok: true, unidadeId: informada }

  if (unidadesDisponiveis.length === 1) {
    return { ok: true, unidadeId: unidadesDisponiveis[0] }
  }

  // Sem unidade nenhuma não há identidade a configurar; com várias, master/admin
  // precisa dizer qual. Os dois casos são erro nomeado e recuperável — a UI de
  // seleção ainda não existe porque hoje só há uma unidade cadastrada.
  if (unidadesDisponiveis.length === 0) return { ok: false, codigo: 'SEM_UNIDADES' }
  return { ok: false, codigo: 'UNIDADE_NAO_INFORMADA' }
}
