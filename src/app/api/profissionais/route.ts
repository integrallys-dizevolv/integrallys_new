import { hash } from 'bcryptjs'
import { type NextRequest, NextResponse } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapProfissionalItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

type ProfissionalBody = Record<string, unknown>

type NormalizedHorario = {
  diaSemana: number
  turno: 'manha' | 'tarde'
  horaInicio: string
  horaFim: string
  duracaoMin: number
  ativo: boolean
}

const HORA_RE = /^\d{2}:\d{2}$/

function normalizeHorarios(value: unknown): NormalizedHorario[] {
  if (!Array.isArray(value)) return []
  const byKey = new Map<string, NormalizedHorario>()

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const h = raw as Record<string, unknown>

    const diaSemana = Number(h.diaSemana)
    const turno = h.turno === 'tarde' ? 'tarde' : h.turno === 'manha' ? 'manha' : null
    const horaInicio = typeof h.horaInicio === 'string' ? h.horaInicio.trim() : ''
    const horaFim = typeof h.horaFim === 'string' ? h.horaFim.trim() : ''
    const duracaoMin = Number(h.duracaoMin)

    if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) continue
    if (!turno) continue
    if (!HORA_RE.test(horaInicio) || !HORA_RE.test(horaFim)) continue
    if (horaFim <= horaInicio) continue // comparação lexicográfica vale p/ HH:MM
    if (!Number.isFinite(duracaoMin) || duracaoMin <= 0) continue

    // de-dupe pela unique (profissional_id, dia_semana, turno) — mantém o último
    byKey.set(`${diaSemana}-${turno}`, {
      diaSemana,
      turno,
      horaInicio,
      horaFim,
      duracaoMin: Math.round(duracaoMin),
      ativo: h.ativo !== false,
    })
  }

  return Array.from(byKey.values())
}

function normalizeProcedimentoIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids = (value as unknown[])
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)
  return Array.from(new Set(ids))
}

function validateProfissionalBody(body: ProfissionalBody, requirePassword: boolean) {
  const nome = String(body.nome ?? '').trim()
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  const status = String(body.status ?? 'Ativo').trim()
  const senha = body.senha == null ? '' : String(body.senha).trim()

  if (!nome || !email) {
    return {
      error: serverErrorResponse(
        'Nome e e-mail são obrigatórios',
        'PROFISSIONAL_REQUIRED_FIELDS',
        400,
      ),
    }
  }

  if (requirePassword && senha.length < 6) {
    return {
      error: serverErrorResponse(
        'Informe uma senha com pelo menos 6 caracteres',
        'PROFISSIONAL_PASSWORD_REQUIRED',
        400,
      ),
    }
  }

  const tipoVinculoRaw = String(body.tipoVinculo ?? body.tipo_vinculo ?? '')
    .trim()
    .toLowerCase()
  const tipoVinculo = tipoVinculoRaw === 'parceiro' ? 'parceiro' : 'interno'

  return {
    payload: {
      nome,
      email,
      senha,
      status: status || 'Ativo',
      telefone: String(body.telefone ?? '').trim() || null,
      conselho: String(body.conselho ?? '').trim() || null,
      crm: String(body.crm ?? '').trim() || null,
      unidadeId: String(body.unidadeId ?? body.unidade_id ?? '').trim() || null,
      tipoVinculo,
      horarios: normalizeHorarios(body.horarios),
      procedimentoIds: normalizeProcedimentoIds(body.procedimentoIds),
    },
  }
}

async function listProfissionais(session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()

  const { data: profissionais, error } = await supabase
    .from('usuarios')
    .select('id,nome,email,telefone,conselho,crm,status,tipo_vinculo,unidade_id')
    .eq('perfil', 'especialista')
    .order('nome', { ascending: true })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar profissionais')
  }

  const ids = (profissionais ?? []).map((row) => String(row.id))

  const horariosByProfissional = new Map<string, Array<Record<string, unknown>>>()
  const procedimentosByProfissional = new Map<string, string[]>()

  if (ids.length > 0) {
    const [{ data: horarios, error: horariosError }, { data: vinculos, error: vinculosError }] =
      await Promise.all([
        supabase
          .from('profissional_horarios')
          .select('id,profissional_id,dia_semana,turno,hora_inicio,hora_fim,duracao_min,ativo')
          .in('profissional_id', ids)
          .order('dia_semana', { ascending: true }),
        supabase
          .from('profissional_procedimentos')
          .select('profissional_id,procedimento_id')
          .in('profissional_id', ids),
      ])

    if (horariosError) {
      return supabaseErrorResponse(horariosError, 'Falha ao carregar horários')
    }
    if (vinculosError) {
      return supabaseErrorResponse(vinculosError, 'Falha ao carregar procedimentos do profissional')
    }

    for (const row of horarios ?? []) {
      const key = String(row.profissional_id)
      const list = horariosByProfissional.get(key) ?? []
      list.push(row)
      horariosByProfissional.set(key, list)
    }
    for (const row of vinculos ?? []) {
      const key = String(row.profissional_id)
      const list = procedimentosByProfissional.get(key) ?? []
      list.push(String(row.procedimento_id))
      procedimentosByProfissional.set(key, list)
    }
  }

  return NextResponse.json({
    data: (profissionais ?? []).map((row) =>
      mapProfissionalItem(
        row,
        horariosByProfissional.get(String(row.id)) ?? [],
        procedimentosByProfissional.get(String(row.id)) ?? [],
      ),
    ),
    meta: session,
  })
}

type Payload = Extract<ReturnType<typeof validateProfissionalBody>, { payload: unknown }>['payload']

function buildHorarioRows(profissionalId: string, payload: Payload) {
  return payload.horarios.map((horario) => ({
    profissional_id: profissionalId,
    unidade_id: payload.unidadeId,
    dia_semana: horario.diaSemana,
    turno: horario.turno,
    hora_inicio: horario.horaInicio,
    hora_fim: horario.horaFim,
    duracao_min: horario.duracaoMin,
    ativo: horario.ativo,
  }))
}

function buildProcedimentoRows(profissionalId: string, payload: Payload) {
  return payload.procedimentoIds.map((procedimentoId) => ({
    profissional_id: profissionalId,
    procedimento_id: procedimentoId,
  }))
}

/**
 * Substitui (replace-all) as linhas filhas de um profissional com segurança:
 * snapshot → delete → insert. Se o insert falhar, restaura o snapshot — evita
 * perda de dados, já que o cliente service_role não abre transação multi-statement
 * neste contexto. Retorna o erro do Supabase (ou null em sucesso).
 */
async function replaceProfissionalChildren(
  supabase: ReturnType<typeof getAppSupabase>,
  table: 'profissional_horarios' | 'profissional_procedimentos',
  profissionalId: string,
  snapshotColumns: string,
  newRows: Array<Record<string, unknown>>,
) {
  const { data: snapshot, error: snapshotError } = await supabase
    .from(table)
    .select(snapshotColumns)
    .eq('profissional_id', profissionalId)
  if (snapshotError) return snapshotError

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('profissional_id', profissionalId)
  if (deleteError) return deleteError

  if (newRows.length === 0) return null

  const { error: insertError } = await supabase.from(table).insert(newRows)
  if (insertError) {
    // Restaura o estado anterior para não deixar o profissional sem dados.
    if (snapshot && snapshot.length > 0) {
      await supabase.from(table).insert(snapshot)
    }
    return insertError
  }
  return null
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'profissionais', 'read')
  if (denied) return denied

  return listProfissionais(session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'profissionais', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as ProfissionalBody | null
  if (!body) return serverErrorResponse('Payload inválido', 'INVALID_PAYLOAD', 400)

  const validated = validateProfissionalBody(body, true)
  if ('error' in validated) return validated.error
  const { payload } = validated

  const senhaHash = await hash(payload.senha, 10)
  const supabase = getAppSupabase()

  const { data: created, error } = await supabase
    .from('usuarios')
    .insert({
      nome: payload.nome,
      email: payload.email,
      perfil: 'especialista',
      status: payload.status,
      senha_hash: senhaHash,
      telefone: payload.telefone,
      conselho: payload.conselho,
      crm: payload.crm,
      unidade_id: payload.unidadeId,
      tipo_vinculo: payload.tipoVinculo,
    })
    .select('id')
    .single()

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao criar profissional')
  }
  if (!created?.id) {
    return serverErrorResponse('Falha ao criar profissional', 'PROFISSIONAL_CREATE_FAILED', 500)
  }

  const profissionalId = String(created.id)

  const horarioRows = buildHorarioRows(profissionalId, payload)
  if (horarioRows.length > 0) {
    const { error: horariosError } = await supabase
      .from('profissional_horarios')
      .insert(horarioRows)
    if (horariosError) {
      await supabase.from('usuarios').delete().eq('id', profissionalId)
      return supabaseErrorResponse(horariosError, 'Falha ao salvar horários do profissional')
    }
  }

  const procedimentoRows = buildProcedimentoRows(profissionalId, payload)
  if (procedimentoRows.length > 0) {
    const { error: procedimentosError } = await supabase
      .from('profissional_procedimentos')
      .insert(procedimentoRows)
    if (procedimentosError) {
      await supabase.from('profissional_horarios').delete().eq('profissional_id', profissionalId)
      await supabase.from('usuarios').delete().eq('id', profissionalId)
      return supabaseErrorResponse(
        procedimentosError,
        'Falha ao salvar procedimentos do profissional',
      )
    }
  }

  return listProfissionais(session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'profissionais', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as ProfissionalBody | null
  if (!body) return serverErrorResponse('Payload inválido', 'INVALID_PAYLOAD', 400)

  const id = String(body.id ?? '').trim()
  if (!id) {
    return serverErrorResponse('Profissional não informado', 'PROFISSIONAL_ID_REQUIRED', 400)
  }

  const validated = validateProfissionalBody(body, false)
  if ('error' in validated) return validated.error
  const { payload } = validated

  const supabase = getAppSupabase()

  const updatePayload: Record<string, unknown> = {
    nome: payload.nome,
    email: payload.email,
    status: payload.status,
    telefone: payload.telefone,
    conselho: payload.conselho,
    crm: payload.crm,
    unidade_id: payload.unidadeId,
    tipo_vinculo: payload.tipoVinculo,
  }
  if (payload.senha) {
    updatePayload.senha_hash = await hash(payload.senha, 10)
  }

  // Confirma que o alvo existe e é especialista — evita no-op silencioso (200)
  // e deletes de filhos para um id inexistente/de outro perfil.
  const { data: existing, error: lookupError } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', id)
    .eq('perfil', 'especialista')
    .maybeSingle()
  if (lookupError) {
    return supabaseErrorResponse(lookupError, 'Falha ao verificar profissional')
  }
  if (!existing) {
    return serverErrorResponse('Profissional não encontrado', 'PROFISSIONAL_NOT_FOUND', 404)
  }

  // Escopo a perfil='especialista': este endpoint não edita outros perfis.
  const { error: updateError } = await supabase
    .from('usuarios')
    .update(updatePayload)
    .eq('id', id)
    .eq('perfil', 'especialista')

  if (updateError) {
    return supabaseErrorResponse(updateError, 'Falha ao atualizar profissional')
  }

  // Substitui grade semanal e procedimentos (replace-all com rollback do snapshot).
  const horariosError = await replaceProfissionalChildren(
    supabase,
    'profissional_horarios',
    id,
    'profissional_id,unidade_id,dia_semana,turno,hora_inicio,hora_fim,duracao_min,ativo',
    buildHorarioRows(id, payload),
  )
  if (horariosError) {
    return supabaseErrorResponse(horariosError, 'Falha ao atualizar horários')
  }

  const procedimentosError = await replaceProfissionalChildren(
    supabase,
    'profissional_procedimentos',
    id,
    'profissional_id,procedimento_id',
    buildProcedimentoRows(id, payload),
  )
  if (procedimentosError) {
    return supabaseErrorResponse(procedimentosError, 'Falha ao atualizar procedimentos')
  }

  return listProfissionais(session)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'profissionais', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as ProfissionalBody | null
  const id = String(body?.id ?? '').trim()
  if (!id) {
    return serverErrorResponse('Profissional não informado', 'PROFISSIONAL_ID_REQUIRED', 400)
  }

  const supabase = getAppSupabase()
  // Horários e vínculos caem por ON DELETE CASCADE (migration 079).
  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq('id', id)
    .eq('perfil', 'especialista')

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao excluir profissional')
  }

  return listProfissionais(session)
}
