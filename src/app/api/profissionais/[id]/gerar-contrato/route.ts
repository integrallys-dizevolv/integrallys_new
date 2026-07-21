import { type NextRequest, NextResponse } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { carregarContexto, resolverVariaveisEmTemplate } from '@/lib/documentos'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

/**
 * POST /api/profissionais/[id]/gerar-contrato
 *
 * Gera um documento do tipo `contrato` para o profissional parceiro (item 7).
 * Fluxo separado de POST /api/documentos/gerar (clínico, centrado em paciente):
 * - sem paciente/agendamento
 * - contexto com profissional alvo + regra de repasse (`incluirRepasse: true`)
 * - persiste em `documentos_gerados` com `paciente_id = null` e
 *   `profissional_id = <profissional alvo>` (sujeito do contrato).
 *   `gerado_por` continua sendo quem clicou (sessão).
 *
 * Autorização: `profissionais:update` (mesma ação de quem edita o cadastro —
 * master/admin/gestor). Não usa `documentacao:create` (só master/especialista).
 *
 * Escopo de unidade:
 * - Valida o template contra as unidades do **profissional-alvo** (principal +
 *   `profissional_unidades`), não contra a unidade do chamador.
 * - Chamadores escopados (gestor etc.): a unidade do JWT precisa estar entre as
 *   do profissional (cross-unit → 403).
 * - master/admin (`scopedUnit.unidadeId === null`): sem restrição de escopo.
 *
 * Body: { templateId: string }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  // Gestão do cadastro de profissional (master/admin/gestor). `update` já é o
  // grant correto — não combinar com documentacao:create (interseção só master).
  const denied = await requirePermission(session.userId, 'profissionais', 'update')
  if (denied) return denied

  const { id: profissionalId } = await params
  if (!profissionalId) {
    return serverErrorResponse('id do profissional obrigatório', 'INVALID_ID', 400)
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return serverErrorResponse('Requisição inválida', 'INVALID_BODY', 400)
  }

  const templateId = typeof body.templateId === 'string' ? body.templateId.trim() : ''
  if (!templateId) {
    return serverErrorResponse('templateId obrigatório', 'INVALID_TEMPLATE_ID', 400)
  }

  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao identificar unidade do usuário')
  }

  const supabase = getAppSupabase()

  const { data: profissional, error: profError } = await supabase
    .from('usuarios')
    .select('id,nome,perfil,tipo_vinculo,status,unidade_id')
    .eq('id', profissionalId)
    .maybeSingle()

  if (profError) {
    return supabaseErrorResponse(profError, 'Falha ao carregar profissional')
  }
  if (!profissional || String(profissional.perfil) !== 'especialista') {
    return serverErrorResponse('Profissional não encontrado', 'NOT_FOUND', 404)
  }
  if (String(profissional.tipo_vinculo) !== 'parceiro') {
    return serverErrorResponse(
      'Contrato de parceria só está disponível para profissionais com vínculo parceiro',
      'NOT_PARCEIRO',
      400,
    )
  }

  // Unidades do profissional-alvo: principal (usuarios.unidade_id) + filiais
  // adicionais (profissional_unidades). É esta lista — e não a do chamador —
  // que define se o template é compatível.
  const { data: filiaisRows, error: filiaisError } = await supabase
    .from('profissional_unidades')
    .select('unidade_id')
    .eq('profissional_id', profissionalId)

  if (filiaisError) {
    return supabaseErrorResponse(filiaisError, 'Falha ao carregar unidades do profissional')
  }

  const unidadesProfissional = new Set<string>()
  if (profissional.unidade_id) {
    unidadesProfissional.add(String(profissional.unidade_id))
  }
  for (const row of filiaisRows ?? []) {
    if (row.unidade_id) unidadesProfissional.add(String(row.unidade_id))
  }

  if (unidadesProfissional.size === 0) {
    return serverErrorResponse(
      'Profissional sem unidade vinculada — cadastre a unidade principal antes de gerar o contrato',
      'NO_UNIT',
      400,
    )
  }

  // Escopo do chamador: só se JWT/unidade não for null (gestor/recepção/especialista).
  // master/admin têm unidadeId null de propósito → sem restrição.
  if (scopedUnit.unidadeId && !unidadesProfissional.has(scopedUnit.unidadeId)) {
    return serverErrorResponse('Profissional de outra unidade', 'UNIT_MISMATCH', 403)
  }

  const { data: template, error: templateError } = await supabase
    .from('documento_templates')
    .select(
      'id,unidade_id,slug,nome,tipo,conteudo,ativo,disponivel_portal_paciente,editavel_pelo_especialista,created_at,updated_at',
    )
    .eq('id', templateId)
    .maybeSingle()

  if (templateError) {
    return supabaseErrorResponse(templateError, 'Falha ao carregar template')
  }
  if (!template) {
    return serverErrorResponse('Template não encontrado', 'NOT_FOUND', 404)
  }
  if (!template.ativo) {
    return serverErrorResponse('Template inativo', 'TEMPLATE_INACTIVE', 400)
  }
  if (String(template.tipo) !== 'contrato') {
    return serverErrorResponse(
      'Template precisa ser do tipo contrato',
      'INVALID_TEMPLATE_TYPE',
      400,
    )
  }

  const templateUnidadeId = template.unidade_id ? String(template.unidade_id) : null
  if (!templateUnidadeId || !unidadesProfissional.has(templateUnidadeId)) {
    return serverErrorResponse(
      'Template não pertence a nenhuma unidade deste profissional',
      'UNIT_MISMATCH',
      403,
    )
  }

  // Clínica no contexto = unidade do template (dados oficiais do contrato).
  const contexto = await carregarContexto({
    supabase,
    unidadeId: templateUnidadeId,
    profissionalId,
    incluirRepasse: true,
  })

  const conteudoResolvido = resolverVariaveisEmTemplate(template.conteudo, contexto)

  const { data: inserted, error: insertError } = await supabase
    .from('documentos_gerados')
    .insert({
      template_id: templateId,
      agendamento_id: null,
      paciente_id: null,
      profissional_id: profissionalId,
      conteudo_preenchido: conteudoResolvido,
      gerado_por: session.userId,
      disponivel_no_portal: false,
    })
    .select(
      'id,template_id,agendamento_id,paciente_id,profissional_id,conteudo_preenchido,gerado_em,disponivel_no_portal,pdf_url',
    )
    .single()

  if (insertError) {
    return supabaseErrorResponse(insertError, 'Falha ao gerar contrato')
  }

  return NextResponse.json({
    data: {
      ...inserted,
      template_nome: template.nome,
      profissional_nome: profissional.nome,
    },
    meta: session,
  })
}
