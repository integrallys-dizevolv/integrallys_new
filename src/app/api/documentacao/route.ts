import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getEntityNameMap, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapDocumentoClinicoItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

function pickString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildDocumentoMeta(body: Record<string, unknown>) {
  return {
    nome: pickString(body.nome),
    categoria: pickString(body.categoria) || pickString(body.tipo),
    descricao: pickString(body.descricao),
    template: pickString(body.template),
    especialista: pickString(body.especialista),
  }
}

async function upsertDocumentoMeta(documentoId: string, meta: Record<string, unknown>) {
  const supabase = getAppSupabase()
  return supabase.from('configuracoes').upsert(
    [{
      categoria: 'documento_clinico_meta',
      chave: `doc_${documentoId}`,
      valor: JSON.stringify(meta),
    }],
    { onConflict: 'categoria,chave' },
  )
}

async function listDocumentacao(request: NextRequest, session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()
  const [{ data, error }, { data: configs, error: configError }] = await Promise.all([
    supabase
      .from('documentos_clinicos')
      .select('id,paciente_id,tipo,atualizado_em,meio,recebido,anexo_url')
      .order('atualizado_em', { ascending: false }),
    supabase
      .from('configuracoes')
      .select('chave,valor')
      .eq('categoria', 'documento_clinico_meta'),
  ])

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar documentação clínica')
  }
  if (configError) {
    return supabaseErrorResponse(configError, 'Falha ao carregar documentação clínica')
  }

  const { map, error: pacienteError } = await getEntityNameMap(
    supabase,
    'pacientes',
    (data ?? []).map((row) => String(row.paciente_id ?? '')),
  )

  if (pacienteError) {
    return supabaseErrorResponse(pacienteError, 'Falha ao carregar documentação clínica')
  }

  const configMap = Object.fromEntries(
    (configs ?? []).map((config) => [
      String(config.chave).replace(/^doc_/, ''),
      safeJsonParse(String(config.valor ?? '{}')),
    ]),
  )

  return NextResponse.json({
    data: (data ?? []).map((row) =>
      mapDocumentoClinicoItem({
        ...row,
        ...configMap[String(row.id ?? '')],
        paciente_nome: map[String(row.paciente_id ?? '')] ?? '',
      }),
    ),
    meta: session,
  })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'documentacao', 'read')
  if (denied) return denied

  return listDocumentacao(request, session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'documentacao', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const tipo = pickString(body?.categoria) || pickString(body?.tipo)
  if (!body?.pacienteId || !tipo) {
    return serverErrorResponse('Documento inválido', 'INVALID_CLINICAL_DOCUMENT', 400)
  }

  const supabase = getAppSupabase()
  const { data: inserted, error } = await supabase.from('documentos_clinicos').insert({
    paciente_id: String(body.pacienteId),
    profissional_id: session.userId,
    tipo,
    meio: body.meio ? String(body.meio) : null,
    recebido: typeof body.recebido === 'boolean' ? body.recebido : false,
    anexo_url: body.anexoUrl ? String(body.anexoUrl) : null,
    atualizado_em: new Date().toISOString(),
  }).select('id').single()

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao salvar documento clínico')
  }
  if (inserted?.id) {
    const { error: metaError } = await upsertDocumentoMeta(String(inserted.id), buildDocumentoMeta(body))
    if (metaError) {
      return supabaseErrorResponse(metaError, 'Falha ao salvar documento clínico')
    }
  }

  return listDocumentacao(request, session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'documentacao', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const tipo = pickString(body?.categoria) || pickString(body?.tipo)
  if (!body?.id || !body?.pacienteId || !tipo) {
    return serverErrorResponse('Documento inválido', 'INVALID_CLINICAL_DOCUMENT', 400)
  }

  const supabase = getAppSupabase()
  const { error } = await supabase
    .from('documentos_clinicos')
    .update({
      paciente_id: String(body.pacienteId),
      tipo,
      meio: body.meio ? String(body.meio) : null,
      recebido: typeof body.recebido === 'boolean' ? body.recebido : false,
      anexo_url: body.anexoUrl ? String(body.anexoUrl) : null,
      atualizado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(body.id))

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao atualizar documento clínico')
  }
  const { error: metaError } = await upsertDocumentoMeta(String(body.id), buildDocumentoMeta(body))
  if (metaError) {
    return supabaseErrorResponse(metaError, 'Falha ao atualizar documento clínico')
  }

  return listDocumentacao(request, session)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'documentacao', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id) {
    return serverErrorResponse('Documento inválido', 'INVALID_CLINICAL_DOCUMENT', 400)
  }

  const supabase = getAppSupabase()
  const { error } = await supabase.from('documentos_clinicos').delete().eq('id', String(body.id))

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao excluir documento clínico')
  }

  return listDocumentacao(request, session)
}
