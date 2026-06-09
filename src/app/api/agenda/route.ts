import { NextResponse, type NextRequest } from 'next/server'
import type { PostgrestError } from '@supabase/supabase-js'
import { getAppSupabase, getEntityNameMap, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapAgendaItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'
import { agendarLembrete } from '@/app/api/whatsapp/disparar/route'

type ScopedAgendaContext =
  | {
      unidadeId: string | null
      profissionalId: string | null
      especialistasPermitidos: string[] | null
      error: null
    }
  | {
      unidadeId: null
      profissionalId: null
      especialistasPermitidos: null
      error: PostgrestError
    }

async function getScopedAgendaContext(session: Awaited<ReturnType<typeof getRequestAuth>>) {
  if (!session) {
    return {
      unidadeId: null,
      profissionalId: null,
      especialistasPermitidos: null,
      error: null,
    } satisfies ScopedAgendaContext
  }

  if (session.role === 'especialista') {
    return {
      unidadeId: null,
      profissionalId: session.userId,
      especialistasPermitidos: null,
      error: null,
    } satisfies ScopedAgendaContext
  }

  if (!['gestor', 'recepcao'].includes(session.role)) {
    return {
      unidadeId: null,
      profissionalId: null,
      especialistasPermitidos: null,
      error: null,
    } satisfies ScopedAgendaContext
  }

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('usuarios')
    .select('unidade_id, especialistas_permitidos')
    .eq('id', session.userId)
    .maybeSingle()

  if (error) {
    return {
      unidadeId: null,
      profissionalId: null,
      especialistasPermitidos: null,
      error,
    } satisfies ScopedAgendaContext
  }

  const especialistasPermitidos =
    session.role === 'recepcao' && Array.isArray(data?.especialistas_permitidos)
      ? (data?.especialistas_permitidos as unknown[])
          .map((value) => String(value))
          .filter((value) => value.length > 0)
      : null

  return {
    unidadeId: data?.unidade_id ? String(data.unidade_id) : null,
    profissionalId: null,
    especialistasPermitidos: especialistasPermitidos && especialistasPermitidos.length > 0 ? especialistasPermitidos : null,
    error: null,
  } satisfies ScopedAgendaContext
}

async function listAgenda(session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()
  const scopedContext = await getScopedAgendaContext(session)
  if (scopedContext.error) {
    return supabaseErrorResponse(scopedContext.error, 'Falha ao carregar agenda')
  }

  let query = supabase
    .from('agendamentos')
    .select('id,paciente_id,profissional_id,horario_inicio,horario_fim,status,data_agendamento,tipo,titulo,local,participantes,modalidade_atendimento,plataforma_online,url_online,valor_procedimento,observacoes,tipo_encaixe,fora_janela,motivo_encaixe')
    .order('data_agendamento', { ascending: true })
    .order('horario_inicio', { ascending: true })

  if (scopedContext.profissionalId) {
    query = query.eq('profissional_id', scopedContext.profissionalId)
  } else if (scopedContext.unidadeId) {
    query = query.eq('unidade_id', scopedContext.unidadeId)
  }

  if (scopedContext.especialistasPermitidos?.length) {
    query = query.in('profissional_id', scopedContext.especialistasPermitidos)
  }

  const { data, error } = await query

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar agenda')
  }

  const agendaIds = (data ?? []).map((row) => String(row.id ?? ''))

  const [pacientesResult, profissionaisResult, pagamentosResult] = await Promise.all([
    getEntityNameMap(supabase, 'pacientes', (data ?? []).map((row) => String(row.paciente_id ?? ''))),
    getEntityNameMap(supabase, 'usuarios', (data ?? []).map((row) => String(row.profissional_id ?? ''))),
    agendaIds.length > 0
      ? supabase.from('v_agendamento_pagamento_resumo').select('agendamento_id,total_pago,valor_devido,situacao,data_ultimo_pagamento').in('agendamento_id', agendaIds)
      : Promise.resolve({ data: [] as Array<{ agendamento_id: string; total_pago: number; valor_devido: number; situacao: string }>, error: null }),
  ])

  if (pacientesResult.error) return supabaseErrorResponse(pacientesResult.error, 'Falha ao carregar agenda')
  if (profissionaisResult.error) return supabaseErrorResponse(profissionaisResult.error, 'Falha ao carregar agenda')

  const pagamentoMap: Record<string, { situacao: string; total_pago: number; data_ultimo_pagamento?: string }> = {}
  if (pagamentosResult.data && !pagamentosResult.error) {
    for (const row of pagamentosResult.data) {
      const r = row as { agendamento_id: string; total_pago: number; situacao: string; data_ultimo_pagamento?: string }
      pagamentoMap[r.agendamento_id] = {
        situacao: r.situacao,
        total_pago: Number(r.total_pago ?? 0),
        data_ultimo_pagamento: r.data_ultimo_pagamento ?? undefined,
      }
    }
  }

  let patientOptionsQuery = supabase
    .from('pacientes')
    .select('id,nome,unidade_id')
    .order('nome', { ascending: true })

  let professionalOptionsQuery = supabase
    .from('usuarios')
    .select('id,nome,unidade_id')
    .eq('perfil', 'especialista')
    .eq('status', 'Ativo')
    .order('nome', { ascending: true })

  if (scopedContext.unidadeId) {
    patientOptionsQuery = patientOptionsQuery.eq('unidade_id', scopedContext.unidadeId)
    professionalOptionsQuery = professionalOptionsQuery.eq('unidade_id', scopedContext.unidadeId)
  }

  if (scopedContext.especialistasPermitidos?.length) {
    professionalOptionsQuery = professionalOptionsQuery.in('id', scopedContext.especialistasPermitidos)
  }

  const [{ data: patientOptionsData, error: patientOptionsError }, { data: professionalOptionsData, error: professionalOptionsError }] = await Promise.all([
    patientOptionsQuery,
    professionalOptionsQuery,
  ])

  if (patientOptionsError) return supabaseErrorResponse(patientOptionsError, 'Falha ao carregar agenda')
  if (professionalOptionsError) return supabaseErrorResponse(professionalOptionsError, 'Falha ao carregar agenda')

  return NextResponse.json({
    data: (data ?? []).map((row) => {
      const pag = pagamentoMap[String(row.id ?? '')]
      return mapAgendaItem({
        ...row,
        paciente_nome: pacientesResult.map[String(row.paciente_id ?? '')] ?? '',
        profissional_nome: profissionaisResult.map[String(row.profissional_id ?? '')] ?? '',
        horario: String(row.horario_inicio ?? ''),
        pagamento_situacao: pag?.situacao,
        total_pago: pag?.total_pago,
        data_ultimo_pagamento: pag?.data_ultimo_pagamento,
      })
    }),
    meta: {
      ...session,
      patients: (patientOptionsData ?? []).map((row) => ({
        id: String(row.id ?? ''),
        nome: String(row.nome ?? ''),
      })),
      professionals: (professionalOptionsData ?? []).map((row) => ({
        id: String(row.id ?? ''),
        nome: String(row.nome ?? ''),
      })),
    },
  })
}

async function resolveProfessionalId(supabase: ReturnType<typeof getAppSupabase>, profissional: unknown) {
  if (!profissional) return null
  const candidate = String(profissional)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidPattern.test(candidate)) return candidate

  const { data } = await supabase.from('usuarios').select('id').eq('nome', candidate).maybeSingle()
  return data?.id ?? null
}

async function resolvePatientUnitId(supabase: ReturnType<typeof getAppSupabase>, pacienteId: string) {
  const { data } = await supabase.from('pacientes').select('unidade_id').eq('id', pacienteId).maybeSingle()
  return data?.unidade_id ?? null
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'agenda', 'read')
  if (denied) return denied

  return listAgenda(session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'agenda', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.data || !body?.horario) {
    return serverErrorResponse('Agendamento inválido', 'INVALID_APPOINTMENT', 400)
  }

  const isCompromissoPessoal = !body.pacienteId
  if (!isCompromissoPessoal && !body.pacienteId) {
    return serverErrorResponse('Agendamento inválido', 'INVALID_APPOINTMENT', 400)
  }
  if (isCompromissoPessoal && !body.titulo) {
    return serverErrorResponse('Título é obrigatório para compromisso pessoal', 'INVALID_APPOINTMENT', 400)
  }

  const supabase = getAppSupabase()
  const profissionalId = await resolveProfessionalId(supabase, body.profissional) ?? session.userId
  const pacienteId = body.pacienteId ? String(body.pacienteId) : null
  const scopedContext = await getScopedAgendaContext(session)
  if (scopedContext.error) {
    return supabaseErrorResponse(scopedContext.error, 'Falha ao criar agendamento')
  }

  const patientUnitId = pacienteId ? await resolvePatientUnitId(supabase, pacienteId) : null
  const unidadeId = scopedContext.unidadeId ?? patientUnitId

  const foraJanela = body.foraJanela === true
  const motivoEncaixe =
    typeof body.motivoEncaixe === 'string' && body.motivoEncaixe.trim().length > 0
      ? body.motivoEncaixe.trim()
      : null

  const { data: inserted, error } = await supabase
    .from('agendamentos')
    .insert({
      unidade_id: unidadeId,
      paciente_id: pacienteId,
      profissional_id: profissionalId,
      criado_por_id: session.userId,
      data_agendamento: body.data,
      horario_inicio: body.horario,
      horario_fim: body.horarioFim ?? null,
      status: body.status ?? 'Agendado',
      tipo: body.tipo ?? null,
      titulo: body.titulo ?? null,
      local: body.local ?? null,
      participantes: body.participantes ?? null,
      modalidade_atendimento: body.modalidade ?? (isCompromissoPessoal ? null : 'Presencial'),
      plataforma_online: body.plataformaOnline ?? null,
      url_online: body.urlOnline ?? null,
      valor_procedimento: body.valorProcedimento ?? null,
      observacoes: body.observacoes ?? null,
      tipo_encaixe: foraJanela ? 'manual' : 'normal',
      fora_janela: foraJanela,
      motivo_encaixe: motivoEncaixe,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao criar agendamento')
  }

  // Agenda o lembrete de WhatsApp de forma não-bloqueante — uma falha aqui
  // nunca deve impedir a criação do agendamento.
  if (pacienteId && inserted?.id) {
    void agendarLembrete(String(inserted.id)).catch((err) =>
      console.error('[whatsapp] agendar_lembrete', err),
    )
  }

  return listAgenda(session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'agenda', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id || !body?.data || !body?.horario) {
    return serverErrorResponse('Agendamento inválido', 'INVALID_APPOINTMENT', 400)
  }

  const supabase = getAppSupabase()
  const profissionalId = await resolveProfessionalId(supabase, body.profissional)
  const pacienteId = body.pacienteId ? String(body.pacienteId) : null
  const scopedContext = await getScopedAgendaContext(session)
  if (scopedContext.error) {
    return supabaseErrorResponse(scopedContext.error, 'Falha ao atualizar agendamento')
  }

  const patientUnitId = pacienteId ? await resolvePatientUnitId(supabase, pacienteId) : null
  const unidadeId = scopedContext.unidadeId ?? patientUnitId

  let query = supabase
    .from('agendamentos')
    .update({
      unidade_id: unidadeId,
      paciente_id: pacienteId,
      profissional_id: profissionalId,
      data_agendamento: body.data,
      horario_inicio: body.horario,
      horario_fim: body.horarioFim ?? null,
      status: body.status ?? 'Agendado',
      tipo: body.tipo ?? null,
      titulo: body.titulo ?? null,
      local: body.local ?? null,
      participantes: body.participantes ?? null,
      modalidade_atendimento: body.modalidade ?? (pacienteId ? 'Presencial' : null),
      plataforma_online: body.plataformaOnline ?? null,
      url_online: body.urlOnline ?? null,
      valor_procedimento: body.valorProcedimento ?? null,
      observacoes: body.observacoes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(body.id))

  if (scopedContext.profissionalId) {
    query = query.eq('profissional_id', scopedContext.profissionalId)
  } else if (scopedContext.unidadeId) {
    query = query.eq('unidade_id', scopedContext.unidadeId)
  }
  if (scopedContext.especialistasPermitidos?.length) {
    query = query.in('profissional_id', scopedContext.especialistasPermitidos)
  }

  const { error } = await query

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao atualizar agendamento')
  }

  return listAgenda(session)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'agenda', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id) {
    return serverErrorResponse('Agendamento inválido', 'INVALID_APPOINTMENT', 400)
  }

  const supabase = getAppSupabase()
  const scopedContext = await getScopedAgendaContext(session)
  if (scopedContext.error) {
    return supabaseErrorResponse(scopedContext.error, 'Falha ao cancelar agendamento')
  }

  let query = supabase
    .from('agendamentos')
    .update({
      status: 'Cancelado',
      observacoes: body.reason ? String(body.reason) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(body.id))

  if (scopedContext.profissionalId) {
    query = query.eq('profissional_id', scopedContext.profissionalId)
  } else if (scopedContext.unidadeId) {
    query = query.eq('unidade_id', scopedContext.unidadeId)
  }
  if (scopedContext.especialistasPermitidos?.length) {
    query = query.in('profissional_id', scopedContext.especialistasPermitidos)
  }

  const { error } = await query

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao cancelar agendamento')
  }

  return listAgenda(session)
}
