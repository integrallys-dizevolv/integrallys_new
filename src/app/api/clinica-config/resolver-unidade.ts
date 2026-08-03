import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { type getRequestAuth, getScopedUnitId, isScopedRole } from '@/lib/request-auth'
import { MENSAGEM_RESOLUCAO, type ResolucaoUnidade, resolverUnidadeConfig } from './unidade-escopo'

// Camada HTTP em volta de `unidade-escopo.ts` (a decisão pura, testada). Fica
// num módulo próprio porque `route.ts` do App Router só aceita exports de
// handler — helper exportado de lá quebra o type-check do build.

type FalhaComResposta = { ok: false; resposta: ReturnType<typeof serverErrorResponse> }

/**
 * Resolve a unidade da identidade da clínica.
 *
 * master/admin: getScopedUnitId retorna unidadeId null de propósito ("sem
 * escopo, vê tudo"). Não tratar como NO_UNIT — só escopar quando o chamador for
 * escopado (gestor/recepção/especialista). Como `clinica_config` é 1:1 com a
 * unidade (migration 025), master/admin ainda precisam cair numa unidade
 * concreta: uma só cadastrada → automática; várias → seleção explícita.
 */
export async function resolverUnidade(
  session: NonNullable<Awaited<ReturnType<typeof getRequestAuth>>>,
  unidadeIdInformada: unknown,
): Promise<ResolucaoUnidade | FalhaComResposta> {
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return {
      ok: false,
      resposta: supabaseErrorResponse(scopedUnit.error, 'Falha ao identificar unidade do usuário'),
    }
  }

  // Só quem não tem escopo precisa da lista — evita uma ida ao banco por
  // requisição para gestor/recepção/especialista.
  let unidadesDisponiveis: string[] = []
  if (!scopedUnit.unidadeId) {
    const { data, error } = await getAppSupabase().from('unidades').select('id')
    if (error) {
      return { ok: false, resposta: supabaseErrorResponse(error, 'Falha ao listar unidades') }
    }
    unidadesDisponiveis = (data ?? []).map((row) => String(row.id))
  }

  return resolverUnidadeConfig({
    chamadorEscopado: isScopedRole(session.role),
    scopedUnidadeId: scopedUnit.unidadeId,
    unidadeIdInformada,
    unidadesDisponiveis,
  })
}

/** Converte a falha de resolução em resposta HTTP — mesma forma nas duas rotas. */
export function respostaResolucaoInvalida(
  falha: Exclude<ResolucaoUnidade, { ok: true }> | FalhaComResposta,
) {
  if ('resposta' in falha) return falha.resposta
  return serverErrorResponse(MENSAGEM_RESOLUCAO[falha.codigo], falha.codigo, 400)
}
