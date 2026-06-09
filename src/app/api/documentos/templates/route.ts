import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'read')
  if (denied) return denied

  const scopedUnit = await getScopedUnitId(session)
  const unidadeId = scopedUnit.error ? null : scopedUnit.unidadeId
  if (!unidadeId) {
    return serverErrorResponse('Usuário sem unidade vinculada', 'NO_UNIT', 400)
  }

  const url = new URL(request.url)
  const incluirInativos = url.searchParams.get('incluir_inativos') === 'true'

  const supabase = getAppSupabase()
  let query = supabase
    .from('documento_templates')
    .select(
      'id,slug,nome,tipo,conteudo,ativo,editavel_pelo_especialista,disponivel_portal_paciente,created_at,updated_at',
    )
    .eq('unidade_id', unidadeId)
    .order('nome', { ascending: true })

  if (!incluirInativos) query = query.eq('ativo', true)

  const { data, error } = await query
  if (error) return supabaseErrorResponse(error, 'Falha ao carregar templates de documento')

  return NextResponse.json({ data: data ?? [], meta: session })
}

export async function PATCH(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return serverErrorResponse('Requisição inválida', 'INVALID_BODY', 400)
  }

  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return serverErrorResponse('id do template é obrigatório', 'INVALID_TEMPLATE_ID', 400)

  const updates: Record<string, unknown> = {}
  if (typeof body.nome === 'string') updates.nome = body.nome
  if (typeof body.tipo === 'string') updates.tipo = body.tipo
  if (body.conteudo && typeof body.conteudo === 'object') updates.conteudo = body.conteudo
  if (typeof body.ativo === 'boolean') updates.ativo = body.ativo
  if (typeof body.editavel_pelo_especialista === 'boolean') {
    updates.editavel_pelo_especialista = body.editavel_pelo_especialista
  }
  if (typeof body.disponivel_portal_paciente === 'boolean') {
    updates.disponivel_portal_paciente = body.disponivel_portal_paciente
  }

  if (Object.keys(updates).length === 0) {
    return serverErrorResponse('Nada para atualizar', 'NO_UPDATE', 400)
  }

  const scopedUnit = await getScopedUnitId(session)
  const unidadeId = scopedUnit.error ? null : scopedUnit.unidadeId
  if (!unidadeId) {
    return serverErrorResponse('Usuário sem unidade vinculada', 'NO_UNIT', 400)
  }

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('documento_templates')
    .update(updates)
    .eq('id', id)
    .eq('unidade_id', unidadeId)
    .select(
      'id,slug,nome,tipo,conteudo,ativo,editavel_pelo_especialista,disponivel_portal_paciente,updated_at',
    )
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao atualizar template')
  if (!data) return serverErrorResponse('Template não encontrado', 'NOT_FOUND', 404)

  return NextResponse.json({ data, meta: session })
}

const TIPOS_VALIDOS = new Set(['formulario', 'declaracao', 'laudo', 'encaminhamento', 'procedimento', 'dieta'])
const SLUG_REGEX = /^[a-z0-9_]+$/

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return serverErrorResponse('Requisição inválida', 'INVALID_BODY', 400)
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  const tipo = typeof body.tipo === 'string' ? body.tipo : ''
  const conteudo = body.conteudo && typeof body.conteudo === 'object' ? body.conteudo : null

  if (!slug || !SLUG_REGEX.test(slug)) {
    return serverErrorResponse('slug inválido (use apenas minúsculas, números e _)', 'INVALID_SLUG', 400)
  }
  if (!nome) return serverErrorResponse('nome é obrigatório', 'INVALID_NAME', 400)
  if (!TIPOS_VALIDOS.has(tipo)) return serverErrorResponse('tipo inválido', 'INVALID_TIPO', 400)
  if (!conteudo) return serverErrorResponse('conteudo é obrigatório', 'INVALID_CONTEUDO', 400)

  const scopedUnit = await getScopedUnitId(session)
  const unidadeId = scopedUnit.error ? null : scopedUnit.unidadeId
  if (!unidadeId) {
    return serverErrorResponse('Usuário sem unidade vinculada', 'NO_UNIT', 400)
  }

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('documento_templates')
    .insert({
      unidade_id: unidadeId,
      slug,
      nome,
      tipo,
      conteudo,
      ativo: typeof body.ativo === 'boolean' ? body.ativo : true,
      editavel_pelo_especialista:
        typeof body.editavel_pelo_especialista === 'boolean' ? body.editavel_pelo_especialista : true,
      disponivel_portal_paciente:
        typeof body.disponivel_portal_paciente === 'boolean' ? body.disponivel_portal_paciente : false,
    })
    .select(
      'id,slug,nome,tipo,conteudo,ativo,editavel_pelo_especialista,disponivel_portal_paciente,created_at,updated_at',
    )
    .single()

  if (error) {
    if (error.code === '23505') {
      return serverErrorResponse('Já existe um template com esse slug', 'DUPLICATE_SLUG', 409)
    }
    return supabaseErrorResponse(error, 'Falha ao criar template')
  }

  return NextResponse.json({ data, meta: session }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return serverErrorResponse('id obrigatório', 'INVALID_ID', 400)

  const scopedUnit = await getScopedUnitId(session)
  const unidadeId = scopedUnit.error ? null : scopedUnit.unidadeId
  if (!unidadeId) {
    return serverErrorResponse('Usuário sem unidade vinculada', 'NO_UNIT', 400)
  }

  const supabase = getAppSupabase()

  // Se houver documentos gerados usando este template, preservamos histórico
  // desativando em vez de excluir — evita violação de FK em documentos_gerados.
  const { count, error: countError } = await supabase
    .from('documentos_gerados')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', id)

  if (countError) {
    return supabaseErrorResponse(countError, 'Falha ao checar uso do template')
  }

  if ((count ?? 0) > 0) {
    const { error: updateError } = await supabase
      .from('documento_templates')
      .update({ ativo: false })
      .eq('id', id)
      .eq('unidade_id', unidadeId)
    if (updateError) {
      return supabaseErrorResponse(updateError, 'Falha ao desativar template')
    }
    return NextResponse.json({
      data: { id, desativado: true, motivo: 'Template em uso — foi desativado em vez de excluído.' },
    })
  }

  const { error: deleteError } = await supabase
    .from('documento_templates')
    .delete()
    .eq('id', id)
    .eq('unidade_id', unidadeId)

  if (deleteError) return supabaseErrorResponse(deleteError, 'Falha ao excluir template')

  return NextResponse.json({ data: { id, excluido: true } })
}
