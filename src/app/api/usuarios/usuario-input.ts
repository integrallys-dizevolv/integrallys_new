// Regra de unidade do usuário criado/editado pela tela de Usuários.
//
// Contexto: `unidade_id` nunca chegava ao banco por esta rota — o campo faltava
// na cadeia inteira (formulário → hook → POST → PUT). Resultado: 7 contas de
// papel escopado ficaram sem unidade, e `getScopedUnitId` devolvia null para
// elas, indistinguível do null "sem escopo" de master/admin.
//
// Esta função é a defesa em profundidade: mesmo quem chama a API direto não
// consegue mais criar um gestor/recepção/especialista órfão de unidade.

const PERFIS_ESCOPADOS = new Set(['gestor', 'recepcao', 'especialista'])

export type ResolucaoUnidadeUsuario =
  | { ok: true; unidadeId: string | null }
  | { ok: false; codigo: 'USER_UNIDADE_REQUIRED' }

export function resolverUnidadeUsuario(
  perfil: string,
  body: Record<string, unknown>,
): ResolucaoUnidadeUsuario {
  const perfilNormalizado = perfil.trim().toLowerCase()

  // master/admin são "sem escopo, vê tudo" (ver getScopedUnitId) e paciente não
  // é escopado por unidade. Guardar um valor aqui sugeriria um escopo que o
  // sistema não aplica em lugar nenhum — então força null em vez de aceitar.
  if (!PERFIS_ESCOPADOS.has(perfilNormalizado)) {
    return { ok: true, unidadeId: null }
  }

  const bruto = body.unidadeId ?? body.unidade_id
  const unidadeId = typeof bruto === 'string' ? bruto.trim() : ''
  if (!unidadeId) return { ok: false, codigo: 'USER_UNIDADE_REQUIRED' }

  return { ok: true, unidadeId }
}
