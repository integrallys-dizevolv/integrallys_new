import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

function mapCentro(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    nome: String(row.nome ?? ''),
    unidadeId: row.unidade_id ? String(row.unidade_id) : null,
    ativo: row.ativo !== false,
    createdAt: row.created_at ? String(row.created_at) : null,
  }
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'read')
  if (denied) return denied

  const supabase = getAppSupabase()
  const scoped = await getScopedUnitId(session)
  if (scoped.error) return supabaseErrorResponse(scoped.error, 'Falha ao carregar centros de custo')

  let query = supabase
    .from('centros_custo')
    .select('id,nome,unidade_id,ativo,created_at')
    .order('nome', { ascending: true })

  if (scoped.unidadeId) {
    query = query.or(`unidade_id.eq.${scoped.unidadeId},unidade_id.is.null`)
  }

  const onlyActive = request.nextUrl.searchParams.get('ativos') === '1'
  if (onlyActive) query = query.eq('ativo', true)

  const { data, error } = await query
  if (error) return supabaseErrorResponse(error, 'Falha ao carregar centros de custo')

  return NextResponse.json({
    data: (data ?? []).map((row) => mapCentro(row as Record<string, unknown>)),
    meta: session,
  })
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
  if (!nome) return serverErrorResponse('Nome obrigatório', 'INVALID_CENTRO_CUSTO', 400)

  const supabase = getAppSupabase()
  const scoped = await getScopedUnitId(session)
  if (scoped.error) return supabaseErrorResponse(scoped.error, 'Falha ao criar centro de custo')

  const unidadeId =
    typeof body?.unidadeId === 'string' && body.unidadeId.trim()
      ? body.unidadeId.trim()
      : scoped.unidadeId

  const { data, error } = await supabase
    .from('centros_custo')
    .insert({
      nome,
      unidade_id: unidadeId,
      ativo: body?.ativo === false ? false : true,
    })
    .select('id,nome,unidade_id,ativo,created_at')
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao criar centro de custo')

  return NextResponse.json({ data: mapCentro((data ?? {}) as Record<string, unknown>), meta: session }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'financeiro', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id) return serverErrorResponse('ID obrigatório', 'INVALID_CENTRO_CUSTO', 400)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.nome === 'string' && body.nome.trim()) patch.nome = body.nome.trim()
  if (typeof body.ativo === 'boolean') patch.ativo = body.ativo
  if (body.unidadeId === null) patch.unidade_id = null
  else if (typeof body.unidadeId === 'string') patch.unidade_id = body.unidadeId.trim() || null

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('centros_custo')
    .update(patch)
    .eq('id', String(body.id))
    .select('id,nome,unidade_id,ativo,created_at')
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao atualizar centro de custo')
  if (!data) return serverErrorResponse('Centro de custo não encontrado', 'NOT_FOUND', 404)

  return NextResponse.json({ data: mapCentro(data as Record<string, unknown>), meta: session })
}
