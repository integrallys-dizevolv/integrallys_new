import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'configuracoes', 'read')
  if (denied) return denied

  const scopedUnit = await getScopedUnitId(session)
  const unidadeId = scopedUnit.error ? null : scopedUnit.unidadeId
  if (!unidadeId) {
    return serverErrorResponse('Usuário sem unidade vinculada', 'NO_UNIT', 400)
  }

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('clinica_config')
    .select('id,unidade_id,nome,cidade_uf,endereco,cep,telefone,logo_url,cor_primaria,cor_secundaria,updated_at')
    .eq('unidade_id', unidadeId)
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar identidade da clínica')

  return NextResponse.json({ data: data ?? null, meta: session })
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'configuracoes', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return serverErrorResponse('Requisição inválida', 'INVALID_BODY', 400)
  }

  const scopedUnit = await getScopedUnitId(session)
  const unidadeId = scopedUnit.error ? null : scopedUnit.unidadeId
  if (!unidadeId) {
    return serverErrorResponse('Usuário sem unidade vinculada', 'NO_UNIT', 400)
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  if (!nome) return serverErrorResponse('nome é obrigatório', 'INVALID_NAME', 400)

  const corPrimaria = typeof body.cor_primaria === 'string' ? body.cor_primaria : '#000000'
  const corSecundaria = typeof body.cor_secundaria === 'string' ? body.cor_secundaria : '#ffffff'
  if (!HEX_COLOR.test(corPrimaria) || !HEX_COLOR.test(corSecundaria)) {
    return serverErrorResponse(
      'Cores devem estar no formato #RRGGBB',
      'INVALID_COLOR',
      400,
    )
  }

  const record = {
    unidade_id: unidadeId,
    nome,
    cidade_uf: typeof body.cidade_uf === 'string' ? body.cidade_uf : null,
    endereco: typeof body.endereco === 'string' ? body.endereco : null,
    cep: typeof body.cep === 'string' ? body.cep : null,
    telefone: typeof body.telefone === 'string' ? body.telefone : null,
    logo_url: typeof body.logo_url === 'string' ? body.logo_url : null,
    cor_primaria: corPrimaria,
    cor_secundaria: corSecundaria,
  }

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('clinica_config')
    .upsert(record, { onConflict: 'unidade_id' })
    .select('id,unidade_id,nome,cidade_uf,endereco,cep,telefone,logo_url,cor_primaria,cor_secundaria,updated_at')
    .maybeSingle()

  if (error) return supabaseErrorResponse(error, 'Falha ao salvar identidade da clínica')

  return NextResponse.json({ data, meta: session })
}
