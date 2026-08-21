import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

export type AnamneseCampoDef = {
  id: string
  label: string
  tipo: 'texto' | 'numero' | 'booleano'
}

function normalizeTipo(raw: unknown): AnamneseCampoDef['tipo'] {
  if (raw === 'numero' || raw === 'booleano' || raw === 'texto') return raw
  return 'texto'
}

function parseCampos(raw: string | null | undefined): AnamneseCampoDef[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item): AnamneseCampoDef => ({
        id: String(item.id ?? '').trim(),
        label: String(item.label ?? '').trim(),
        tipo: normalizeTipo(item.tipo),
      }))
      .filter((item) => item.id && item.label)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'anamnese', 'read')
  if (denied) return denied

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('categoria', 'anamnese')
    .eq('chave', 'campos_personalizados')
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar campos de anamnese')

  return NextResponse.json({
    data: parseCampos(data?.valor ? String(data.valor) : null),
    meta: session,
  })
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'configuracoes', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as { campos?: AnamneseCampoDef[] } | null
  if (!body || !Array.isArray(body.campos)) {
    return serverErrorResponse('Payload inválido', 'INVALID_ANAMNESE_CAMPOS', 400)
  }

  const campos: AnamneseCampoDef[] = body.campos
    .map((item) => ({
      id: String(item.id ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_'),
      label: String(item.label ?? '').trim(),
      tipo: normalizeTipo(item.tipo),
    }))
    .filter((item) => item.id && item.label)

  const supabase = getAppSupabase()
  const { error } = await supabase.from('configuracoes').upsert(
    {
      categoria: 'anamnese',
      chave: 'campos_personalizados',
      valor: JSON.stringify(campos),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'categoria,chave' },
  )

  if (error) return supabaseErrorResponse(error, 'Falha ao salvar campos de anamnese')

  return NextResponse.json({ data: campos, meta: session })
}
