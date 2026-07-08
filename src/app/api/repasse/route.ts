import { NextResponse, type NextRequest } from 'next/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { getAppSupabase, getEntityNameMap, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapRegraRepasseItem, mapRepasseItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

type RepasseBody = Record<string, unknown>

async function getUnidadesMap(supabase: SupabaseClient, ids: string[], scopedUnitId?: string | null) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  let query = supabase.from('unidades').select('id,nome').order('nome')
  if (scopedUnitId) {
    query = query.eq('id', scopedUnitId)
  }
  const { data, error } = await query
  if (error) {
    return { map: {} as Record<string, string>, options: [] as Array<{ id: string; nome: string }>, error }
  }

  const map = (data ?? []).reduce<Record<string, string>>((acc, row) => {
    const id = String(row.id)
    if (uniqueIds.length === 0 || uniqueIds.includes(id)) {
      acc[id] = String(row.nome ?? '')
    }
    return acc
  }, {})

  return {
    map,
    options: (data ?? []).map((row) => ({ id: String(row.id), nome: String(row.nome ?? '') })),
    error: null,
  }
}

async function getProfissionaisOptions(supabase: SupabaseClient, scopedUnitId?: string | null) {
  let query = supabase
    .from('usuarios')
    .select('id,nome')
    .eq('status', 'Ativo')
    .in('perfil', ['especialista', 'gestor', 'admin'])
    .order('nome')

  if (scopedUnitId) {
    query = query.eq('unidade_id', scopedUnitId)
  }

  const { data, error } = await query

  if (error) {
    return { options: [] as Array<{ id: string; nome: string }>, error }
  }

  return {
    options: (data ?? []).map((row) => ({ id: String(row.id), nome: String(row.nome ?? '') })),
    error: null,
  }
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim()
    return Number(normalized)
  }
  return NaN
}

async function buildRepasseResponse(supabase: SupabaseClient, session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao carregar repasses')
  }

  let repassesQuery = supabase
    .from('repasses')
    .select('id,profissional_id,unidade_id,periodo_inicio,periodo_fim,valor,status,pago_em,created_at')
    .order('created_at', { ascending: false })

  let regrasQuery = supabase
    .from('regras_repasse')
    .select('id,profissional_id,unidade_id,percentual,valor_fixo,ativo,observacoes,created_at')
    .order('created_at', { ascending: false })

  if (scopedUnit.unidadeId) {
    repassesQuery = repassesQuery.eq('unidade_id', scopedUnit.unidadeId)
    regrasQuery = regrasQuery.or(`unidade_id.eq.${scopedUnit.unidadeId},unidade_id.is.null`)
  }

  const [{ data: repasses, error: repassesError }, { data: regras, error: regrasError }] = await Promise.all([
    repassesQuery,
    regrasQuery,
  ])

  if (repassesError) {
    return supabaseErrorResponse(repassesError, 'Falha ao carregar repasses')
  }

  if (regrasError) {
    return supabaseErrorResponse(regrasError, 'Falha ao carregar regras de repasse')
  }

  const profissionalIds = [
    ...(repasses ?? []).map((row) => String(row.profissional_id ?? '')),
    ...(regras ?? []).map((row) => String(row.profissional_id ?? '')),
  ]

  const tipoVinculoMap = new Map<string, 'interno' | 'parceiro'>()
  if (profissionalIds.length > 0) {
    const uniqueIds = Array.from(new Set(profissionalIds.filter(Boolean)))
    if (uniqueIds.length > 0) {
      const { data: tipoRows } = await supabase
        .from('usuarios')
        .select('id,tipo_vinculo')
        .in('id', uniqueIds)
      for (const row of tipoRows ?? []) {
        const tipo = row.tipo_vinculo === 'parceiro' ? 'parceiro' : 'interno'
        tipoVinculoMap.set(String(row.id), tipo)
      }
    }
  }
  const unidadeIds = [
    ...(repasses ?? []).map((row) => String(row.unidade_id ?? '')),
    ...(regras ?? []).map((row) => String(row.unidade_id ?? '')),
  ]

  const [{ map: profissionaisMap, error: profissionaisError }, unidadesResult, profissionaisOptionsResult] = await Promise.all([
    getEntityNameMap(supabase, 'usuarios', profissionalIds),
    getUnidadesMap(supabase, unidadeIds, scopedUnit.unidadeId),
    getProfissionaisOptions(supabase, scopedUnit.unidadeId),
  ])

  if (profissionaisError) {
    return supabaseErrorResponse(profissionaisError, 'Falha ao carregar repasses')
  }

  if (unidadesResult.error) {
    return supabaseErrorResponse(unidadesResult.error, 'Falha ao carregar unidades de repasse')
  }

  if (profissionaisOptionsResult.error) {
    return supabaseErrorResponse(profissionaisOptionsResult.error, 'Falha ao carregar profissionais')
  }

  return NextResponse.json({
    data: (repasses ?? []).map((row) =>
      mapRepasseItem({
        ...row,
        profissional_nome: profissionaisMap[String(row.profissional_id ?? '')] ?? '',
        unidade_nome: unidadesResult.map[String(row.unidade_id ?? '')] ?? '',
        tipo_vinculo: tipoVinculoMap.get(String(row.profissional_id ?? '')) ?? 'interno',
      }),
    ),
    meta: {
      ...(session ?? {}),
      rules: (regras ?? []).map((row) =>
        mapRegraRepasseItem({
          ...row,
          profissional_nome: profissionaisMap[String(row.profissional_id ?? '')] ?? '',
          unidade_nome: unidadesResult.map[String(row.unidade_id ?? '')] ?? '',
        }),
      ),
      profissionais: profissionaisOptionsResult.options,
      unidades: unidadesResult.options,
    },
  })
}

async function handleGenerateRepasse(
  supabase: SupabaseClient,
  body: RepasseBody,
  session: Awaited<ReturnType<typeof getRequestAuth>>,
) {
  const periodoInicio = String(body.periodoInicio ?? '')
  const periodoFim = String(body.periodoFim ?? '')

  if (!periodoInicio || !periodoFim) {
    return serverErrorResponse('Informe o período inicial e final para gerar o repasse', 'REPASSE_PERIOD_REQUIRED', 400)
  }

  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao gerar repasses')
  }

  let query = supabase.from('regras_repasse').select('id,profissional_id,unidade_id,percentual,valor_fixo,ativo')
  if (body.profissionalId) query = query.eq('profissional_id', String(body.profissionalId))
  if (scopedUnit.unidadeId) {
    query = query.or(`unidade_id.eq.${scopedUnit.unidadeId},unidade_id.is.null`)
  } else if (body.unidadeId) {
    query = query.eq('unidade_id', String(body.unidadeId))
  }

  const { data: regras, error: regrasError } = await query.eq('ativo', true)
  if (regrasError) {
    return supabaseErrorResponse(regrasError, 'Falha ao gerar repasses')
  }

  if (!regras || regras.length === 0) {
    return serverErrorResponse('Nenhuma regra ativa encontrada para o filtro informado', 'REPASSE_RULES_NOT_FOUND', 400)
  }

  const profissionalIds = Array.from(new Set(regras.map((row) => String(row.profissional_id))))

  // Para parceiros, usar valor bruto (valor_bruto se disponível, senão valor_total)
  // Para internos, usar valor líquido (valor_total — já com descontos aplicados)
  const { data: prescricoes, error: prescricoesError } = await supabase
    .from('prescricoes')
    .select('profissional_id,valor_total,valor_bruto,data_prescricao')
    .in('profissional_id', profissionalIds)
    .gte('data_prescricao', periodoInicio)
    .lte('data_prescricao', periodoFim)

  if (prescricoesError) {
    return supabaseErrorResponse(prescricoesError, 'Falha ao apurar valores de repasse')
  }

  // Carrega tipo_vinculo de cada profissional
  const tipoVinculoMap = new Map<string, 'interno' | 'parceiro'>()
  if (profissionalIds.length > 0) {
    const { data: tipoRows } = await supabase
      .from('usuarios')
      .select('id,tipo_vinculo')
      .in('id', profissionalIds)
    for (const row of tipoRows ?? []) {
      tipoVinculoMap.set(String(row.id), row.tipo_vinculo === 'parceiro' ? 'parceiro' : 'interno')
    }
  }

  const receitaPorProfissional = (prescricoes ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = String(row.profissional_id ?? '')
    const tipo = tipoVinculoMap.get(key) ?? 'interno'
    // Parceiro: usa valor bruto (sem deduções da clínica)
    // Interno: usa valor total/líquido
    const base =
      tipo === 'parceiro' && row.valor_bruto != null
        ? Number(row.valor_bruto)
        : Number(row.valor_total ?? 0)
    acc[key] = (acc[key] ?? 0) + base
    return acc
  }, {})

  const { data: existentes, error: existentesError } = await supabase
    .from('repasses')
    .select('id,profissional_id,unidade_id,status')
    .in('profissional_id', profissionalIds)
    .eq('periodo_inicio', periodoInicio)
    .eq('periodo_fim', periodoFim)

  if (existentesError) {
    return supabaseErrorResponse(existentesError, 'Falha ao verificar repasses existentes')
  }

  const existingMap = new Map(
    (existentes ?? []).map((row) => [
      `${String(row.profissional_id ?? '')}:${String(row.unidade_id ?? '')}:${periodoInicio}:${periodoFim}`,
      row,
    ]),
  )

  const inserts: Array<Record<string, unknown>> = []
  const updates: Array<{ id: string; valor: number }> = []

  for (const regra of regras) {
    const profissionalId = String(regra.profissional_id ?? '')
    const unidadeId = regra.unidade_id ? String(regra.unidade_id) : null
    const base = receitaPorProfissional[profissionalId] ?? 0
    const percentual = regra.percentual == null ? null : Number(regra.percentual)
    const valorFixo = regra.valor_fixo == null ? null : Number(regra.valor_fixo)
    const valor = valorFixo != null ? valorFixo : percentual != null ? Number(((base * percentual) / 100).toFixed(2)) : base
    const key = `${profissionalId}:${unidadeId ?? ''}:${periodoInicio}:${periodoFim}`
    const existente = existingMap.get(key)

    if (existente?.status === 'Pago') {
      continue
    }

    if (existente?.id) {
      updates.push({ id: String(existente.id), valor })
      continue
    }

    inserts.push({
      profissional_id: profissionalId,
      unidade_id: unidadeId,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      valor,
      status: 'Processando',
    })
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('repasses').insert(inserts)
    if (error) {
      return supabaseErrorResponse(error, 'Falha ao registrar novos repasses')
    }
  }

  for (const update of updates) {
    const { error } = await supabase.from('repasses').update({ valor: update.valor, status: 'Processando' }).eq('id', update.id)
    if (error) {
      return supabaseErrorResponse(error, 'Falha ao atualizar repasse existente')
    }
  }

  return null
}

async function handleSaveRule(
  supabase: SupabaseClient,
  body: RepasseBody,
  session: Awaited<ReturnType<typeof getRequestAuth>>,
) {
  const profissionalId = String(body.profissionalId ?? '')
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao salvar regra de repasse')
  }

  const unidadeId = scopedUnit.unidadeId ?? (body.unidadeId ? String(body.unidadeId) : null)
  const percentual = body.percentual == null || body.percentual === '' ? null : parseNumber(body.percentual)
  const valorFixo = body.valorFixo == null || body.valorFixo === '' ? null : parseNumber(body.valorFixo)
  const ativo = body.ativo == null ? true : Boolean(body.ativo)
  const observacoes = body.observacoes ? String(body.observacoes) : null

  if (!profissionalId) {
    return serverErrorResponse('Selecione um profissional para salvar a regra', 'REPASSE_PROFESSIONAL_REQUIRED', 400)
  }

  if (percentual == null && valorFixo == null) {
    return serverErrorResponse('Informe um percentual ou valor fixo para a regra', 'REPASSE_RULE_VALUE_REQUIRED', 400)
  }

  if (percentual != null && Number.isNaN(percentual)) {
    return serverErrorResponse('Percentual inválido', 'REPASSE_PERCENTUAL_INVALID', 400)
  }

  if (valorFixo != null && Number.isNaN(valorFixo)) {
    return serverErrorResponse('Valor fixo inválido', 'REPASSE_VALOR_INVALID', 400)
  }

  const payload = {
    profissional_id: profissionalId,
    unidade_id: unidadeId,
    percentual,
    valor_fixo: valorFixo,
    ativo,
    observacoes,
  }

  if (body.id) {
    const { error } = await supabase.from('regras_repasse').update(payload).eq('id', String(body.id))
    if (error) {
      return supabaseErrorResponse(error, 'Falha ao atualizar regra de repasse')
    }
    return null
  }

  const { error } = await supabase.from('regras_repasse').insert(payload)
  if (error) {
    return supabaseErrorResponse(error, 'Falha ao criar regra de repasse')
  }

  return null
}

async function handleDeleteRule(
  supabase: SupabaseClient,
  body: RepasseBody,
  session: Awaited<ReturnType<typeof getRequestAuth>>,
) {
  const id = String(body.id ?? '')
  if (!id) {
    return serverErrorResponse('Regra de repasse não informada', 'REPASSE_RULE_ID_REQUIRED', 400)
  }

  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao excluir regra de repasse')
  }

  let query = supabase.from('regras_repasse').delete().eq('id', id)
  if (scopedUnit.unidadeId) {
    query = query.eq('unidade_id', scopedUnit.unidadeId)
  }

  const { error } = await query
  if (error) {
    return supabaseErrorResponse(error, 'Falha ao excluir regra de repasse')
  }

  return null
}

async function handleStatusUpdate(
  supabase: SupabaseClient,
  body: RepasseBody,
  status: 'Pago' | 'Cancelado',
  session: Awaited<ReturnType<typeof getRequestAuth>>,
) {
  const id = String(body.id ?? '')
  if (!id) {
    return serverErrorResponse('Repasse não informado', 'REPASSE_ID_REQUIRED', 400)
  }

  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, status === 'Pago' ? 'Falha ao registrar pagamento' : 'Falha ao cancelar repasse')
  }

  const payload: Record<string, unknown> = { status }
  if (status === 'Pago') {
    payload.pago_em = new Date().toISOString()
  }

  let query = supabase.from('repasses').update(payload).eq('id', id)
  if (scopedUnit.unidadeId) {
    query = query.eq('unidade_id', scopedUnit.unidadeId)
  }

  const { error } = await query
  if (error) {
    return supabaseErrorResponse(error, status === 'Pago' ? 'Falha ao registrar pagamento' : 'Falha ao cancelar repasse')
  }

  return null
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'repasse', 'read')
  if (denied) return denied

  const supabase = getAppSupabase()
  return buildRepasseResponse(supabase, session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'repasse', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => ({}))) as RepasseBody
  const action = String(body.action ?? '')
  const supabase = getAppSupabase()

  let errorResponse: NextResponse | null = null

  if (action === 'generate') {
    errorResponse = await handleGenerateRepasse(supabase, body, session)
  } else if (action === 'saveRule') {
    errorResponse = await handleSaveRule(supabase, body, session)
  } else if (action === 'deleteRule') {
    errorResponse = await handleDeleteRule(supabase, body, session)
  } else if (action === 'pay') {
    errorResponse = await handleStatusUpdate(supabase, body, 'Pago', session)
  } else if (action === 'cancel') {
    errorResponse = await handleStatusUpdate(supabase, body, 'Cancelado', session)
  } else {
    return serverErrorResponse('Ação de repasse inválida', 'REPASSE_ACTION_INVALID', 400)
  }

  if (errorResponse) return errorResponse
  return buildRepasseResponse(supabase, session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'repasse', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => ({}))) as RepasseBody
  const id = String(body.id ?? '')
  const status = String(body.status ?? '')

  if (!id || !status) {
    return serverErrorResponse('Repasse inválido', 'REPASSE_INVALID', 400)
  }

  const supabase = getAppSupabase()
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao atualizar repasse')
  }

  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (body.pagoEm) {
    payload.pago_em = String(body.pagoEm)
  }

  let query = supabase.from('repasses').update(payload).eq('id', id)
  if (scopedUnit.unidadeId) {
    query = query.eq('unidade_id', scopedUnit.unidadeId)
  }

  const { error } = await query
  if (error) {
    return supabaseErrorResponse(error, 'Falha ao atualizar repasse')
  }

  return buildRepasseResponse(supabase, session)
}
