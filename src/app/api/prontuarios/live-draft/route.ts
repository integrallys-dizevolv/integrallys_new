import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

async function assertPacienteInScope(
  supabase: ReturnType<typeof getAppSupabase>,
  session: NonNullable<Awaited<ReturnType<typeof getRequestAuth>>>,
  pacienteId: string,
) {
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return { error: supabaseErrorResponse(scopedUnit.error, 'Falha ao validar unidade do paciente') }
  }

  const { data: pacienteRow, error: pacienteError } = await supabase
    .from('pacientes')
    .select('id,unidade_id,nome')
    .eq('id', pacienteId)
    .maybeSingle()

  if (pacienteError) {
    return { error: supabaseErrorResponse(pacienteError, 'Falha ao validar paciente') }
  }
  if (!pacienteRow) {
    return { error: serverErrorResponse('Paciente não encontrado', 'PACIENTE_NOT_FOUND', 404) }
  }

  if (
    scopedUnit.unidadeId &&
    !['master', 'admin'].includes(session.role) &&
    pacienteRow.unidade_id &&
    String(pacienteRow.unidade_id) !== scopedUnit.unidadeId
  ) {
    return { error: serverErrorResponse('Paciente fora do escopo da unidade', 'PACIENTE_UNIT_FORBIDDEN', 403) }
  }

  return {
    paciente: {
      id: String(pacienteRow.id),
      nome: String(pacienteRow.nome ?? ''),
      unidadeId: pacienteRow.unidade_id ? String(pacienteRow.unidade_id) : null,
    },
  }
}

function mapDraft(
  row: Record<string, unknown>,
  pacienteNome?: string,
) {
  return {
    pacienteId: String(row.paciente_id ?? ''),
    pacienteNome: pacienteNome ?? '',
    texto: String(row.texto ?? ''),
    authorId: String(row.author_id ?? ''),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'prontuarios', 'read')
  if (denied) return denied

  const pacienteId = request.nextUrl.searchParams.get('pacienteId')?.trim()
  if (!pacienteId) {
    return serverErrorResponse('pacienteId obrigatório', 'INVALID_LIVE_DRAFT', 400)
  }

  const supabase = getAppSupabase()
  const scoped = await assertPacienteInScope(supabase, session, pacienteId)
  if (scoped.error) return scoped.error

  const { data, error } = await supabase
    .from('prontuario_live_drafts')
    .select('paciente_id,texto,author_id,updated_at')
    .eq('paciente_id', pacienteId)
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar draft ao vivo')

  return NextResponse.json({
    data: data ? mapDraft(data as Record<string, unknown>, scoped.paciente?.nome) : null,
    meta: session,
  })
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'prontuarios', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const pacienteId = typeof body?.pacienteId === 'string' ? body.pacienteId.trim() : ''
  const texto = typeof body?.texto === 'string' ? body.texto : ''
  if (!pacienteId) {
    return serverErrorResponse('pacienteId obrigatório', 'INVALID_LIVE_DRAFT', 400)
  }

  const supabase = getAppSupabase()
  const scoped = await assertPacienteInScope(supabase, session, pacienteId)
  if (scoped.error) return scoped.error

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('prontuario_live_drafts')
    .upsert(
      {
        paciente_id: pacienteId,
        texto,
        author_id: session.userId,
        unidade_id: scoped.paciente?.unidadeId,
        updated_at: now,
      },
      { onConflict: 'paciente_id' },
    )
    .select('paciente_id,texto,author_id,updated_at')
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao salvar draft ao vivo')

  return NextResponse.json({
    data: mapDraft((data ?? {}) as Record<string, unknown>, scoped.paciente?.nome),
    meta: session,
  })
}
