import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'
import { carregarContexto, resolverVariaveisEmTemplate } from '@/lib/documentos'

/**
 * POST /api/documentos/gerar
 *
 * Recebe o conteúdo do documento já preenchido pelo usuário (mesma estrutura
 * do template, com `valor_padrao`/`valor` preenchidos nos campos), resolve
 * as variáveis #XXX# com dados do contexto (paciente, agendamento,
 * profissional, clínica) e persiste como snapshot imutável em
 * `documentos_gerados`.
 *
 * Body:
 *   {
 *     templateId: string            (obrigatório)
 *     pacienteId: string            (obrigatório)
 *     agendamentoId?: string | null (opcional — se houver, resolve
 *                                    #AGENDA_DATA_HORA# e profissional)
 *     disponivelNoPortal?: boolean  (default: template.disponivel_portal_paciente)
 *     conteudoPreenchido: object    (estrutura do template com valores do
 *                                    usuário preenchidos)
 *   }
 */
export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return serverErrorResponse('Requisição inválida', 'INVALID_BODY', 400)
  }

  const templateId = typeof body.templateId === 'string' ? body.templateId : ''
  const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId : ''
  const agendamentoId = typeof body.agendamentoId === 'string' ? body.agendamentoId : null
  const conteudoPreenchido = body.conteudoPreenchido as Record<string, unknown> | undefined
  const disponivelNoPortalReq = typeof body.disponivelNoPortal === 'boolean' ? body.disponivelNoPortal : null

  if (!templateId) return serverErrorResponse('templateId obrigatório', 'INVALID_TEMPLATE_ID', 400)
  if (!pacienteId) return serverErrorResponse('pacienteId obrigatório', 'INVALID_PACIENTE_ID', 400)
  if (!conteudoPreenchido || typeof conteudoPreenchido !== 'object') {
    return serverErrorResponse('conteudoPreenchido obrigatório', 'INVALID_CONTENT', 400)
  }

  const scopedUnit = await getScopedUnitId(session)
  const unidadeId = scopedUnit.error ? null : scopedUnit.unidadeId
  if (!unidadeId) {
    return serverErrorResponse('Usuário sem unidade vinculada', 'NO_UNIT', 400)
  }

  const supabase = getAppSupabase()

  const { data: template, error: templateError } = await supabase
    .from('documento_templates')
    .select('id,unidade_id,tipo,disponivel_portal_paciente,ativo')
    .eq('id', templateId)
    .maybeSingle()

  if (templateError) {
    return supabaseErrorResponse(templateError, 'Falha ao carregar template')
  }
  if (!template) return serverErrorResponse('Template não encontrado', 'NOT_FOUND', 404)
  if (String(template.unidade_id) !== unidadeId) {
    return serverErrorResponse('Template de outra unidade', 'UNIT_MISMATCH', 403)
  }
  if (!template.ativo) {
    return serverErrorResponse('Template inativo', 'TEMPLATE_INACTIVE', 400)
  }

  const contexto = await carregarContexto({
    supabase,
    unidadeId,
    pacienteId,
    agendamentoId,
    profissionalId: session.userId,
  })

  const conteudoResolvido = resolverVariaveisEmTemplate(conteudoPreenchido, contexto)

  const disponivelNoPortal =
    disponivelNoPortalReq !== null ? disponivelNoPortalReq : Boolean(template.disponivel_portal_paciente)

  const { data: inserted, error: insertError } = await supabase
    .from('documentos_gerados')
    .insert({
      template_id: templateId,
      agendamento_id: agendamentoId,
      paciente_id: pacienteId,
      profissional_id: session.userId,
      conteudo_preenchido: conteudoResolvido,
      gerado_por: session.userId,
      disponivel_no_portal: disponivelNoPortal,
    })
    .select('id,template_id,agendamento_id,paciente_id,profissional_id,conteudo_preenchido,gerado_em,disponivel_no_portal,pdf_url')
    .single()

  if (insertError) {
    return supabaseErrorResponse(insertError, 'Falha ao gerar documento')
  }

  return NextResponse.json({ data: inserted, meta: session })
}
