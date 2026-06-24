import { type NextRequest, NextResponse } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'
import { gerarSlots, type HorarioRegra } from './gerar-slots'

interface GerarBody {
  especialistaId?: unknown
  dataInicio?: unknown
  dataFim?: unknown
  // diasSemana agora é FILTRO opcional (interseção com a grade do profissional);
  // horarioInicio/horarioFim/intervalos do formulário não são mais usados — a
  // janela e a duração vêm de profissional_horarios (migration 079).
  diasSemana?: unknown
  considerarFeriados?: unknown
}

function parseDateLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return null
  return date
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'agenda', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as GerarBody | null
  if (!body) return serverErrorResponse('Corpo inválido', 'INVALID_BODY', 400)

  const especialistaId = typeof body.especialistaId === 'string' ? body.especialistaId.trim() : ''
  const dataInicioStr = typeof body.dataInicio === 'string' ? body.dataInicio : ''
  const dataFimStr = typeof body.dataFim === 'string' ? body.dataFim : ''
  const diasSemanaRaw = Array.isArray(body.diasSemana) ? body.diasSemana : []
  const considerarFeriados = body.considerarFeriados !== false

  if (!especialistaId) {
    return serverErrorResponse('Especialista é obrigatório', 'INVALID_PARAMS', 400)
  }

  const dataInicio = parseDateLocal(dataInicioStr)
  const dataFim = parseDateLocal(dataFimStr)
  if (!dataInicio || !dataFim) {
    return serverErrorResponse('Datas inválidas', 'INVALID_PARAMS', 400)
  }
  if (dataFim < dataInicio) {
    return serverErrorResponse('Data final anterior à inicial', 'INVALID_PARAMS', 400)
  }

  // diasSemana é apenas FILTRO (interseção). Vazio = sem restrição (toda a grade).
  const diasSemana = diasSemanaRaw
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
  const diasSemanaFiltro = diasSemana.length > 0 ? diasSemana : null

  const supabase = getAppSupabase()

  const { data: especialistaRow, error: especialistaError } = await supabase
    .from('usuarios')
    .select('id,unidade_id,perfil')
    .eq('id', especialistaId)
    .maybeSingle()

  if (especialistaError) {
    return supabaseErrorResponse(especialistaError, 'Falha ao localizar especialista')
  }
  if (especialistaRow?.perfil !== 'especialista') {
    return serverErrorResponse('Especialista não encontrado', 'INVALID_PARAMS', 400)
  }

  const unidadeId = especialistaRow.unidade_id ? String(especialistaRow.unidade_id) : null

  // Grade do profissional (migration 079) — fonte dos dias/janelas/duração.
  const { data: horariosRows, error: horariosError } = await supabase
    .from('profissional_horarios')
    .select('dia_semana,turno,hora_inicio,hora_fim,duracao_min,ativo')
    .eq('profissional_id', especialistaId)
    .eq('ativo', true)

  if (horariosError) {
    return supabaseErrorResponse(horariosError, 'Falha ao carregar horários do profissional')
  }

  const horarios: HorarioRegra[] = (horariosRows ?? []).map((row) => ({
    dia_semana: Number(row.dia_semana),
    turno: row.turno === 'tarde' ? 'tarde' : 'manha',
    hora_inicio: String(row.hora_inicio ?? ''),
    hora_fim: String(row.hora_fim ?? ''),
    duracao_min: Number(row.duracao_min),
    ativo: row.ativo !== false,
  }))

  if (horarios.length === 0) {
    return serverErrorResponse(
      'Nenhum horário cadastrado para este profissional. Cadastre a grade de horários em Profissionais antes de gerar a agenda.',
      'SEM_HORARIO_CADASTRADO',
      422,
    )
  }

  const { slots, puladosFeriado, alertas } = gerarSlots({
    horarios,
    dataInicio,
    dataFim,
    diasSemanaFiltro,
    considerarFeriados,
  })

  let pulados = puladosFeriado

  if (slots.length === 0) {
    return NextResponse.json({ gerados: 0, pulados, alertas })
  }

  const datasUnicas = Array.from(new Set(slots.map((s) => s.data)))
  const { data: existentes, error: existentesError } = await supabase
    .from('agendamentos')
    .select('data_agendamento,horario_inicio')
    .eq('profissional_id', especialistaId)
    .in('data_agendamento', datasUnicas)

  if (existentesError) {
    return supabaseErrorResponse(existentesError, 'Falha ao verificar agendamentos existentes')
  }

  const existentesSet = new Set(
    (existentes ?? []).map(
      (row) =>
        `${String(row.data_agendamento ?? '')}|${String(row.horario_inicio ?? '').slice(0, 5)}`,
    ),
  )

  const novos: Array<Record<string, unknown>> = []
  for (const s of slots) {
    const key = `${s.data}|${s.horario_inicio}`
    if (existentesSet.has(key)) {
      pulados += 1
      continue
    }
    existentesSet.add(key)
    novos.push({
      profissional_id: especialistaId,
      data_agendamento: s.data,
      horario_inicio: s.horario_inicio,
      horario_fim: s.horario_fim,
      status: 'Disponível',
      unidade_id: unidadeId,
      paciente_id: null,
      criado_por_id: session.userId,
      tipo: null,
      titulo: null,
    })
  }

  if (novos.length === 0) {
    return NextResponse.json({ gerados: 0, pulados, alertas })
  }

  const { error: insertError } = await supabase.from('agendamentos').insert(novos)
  if (insertError) {
    return supabaseErrorResponse(insertError, 'Falha ao gerar agenda')
  }

  return NextResponse.json({ gerados: novos.length, pulados, alertas })
}
