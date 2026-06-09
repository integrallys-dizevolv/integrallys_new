import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

const FERIADOS_NACIONAIS_FIXOS = new Set([
  '01-01',
  '04-21',
  '05-01',
  '09-07',
  '10-12',
  '11-02',
  '11-15',
  '12-25',
])

interface GerarBody {
  especialistaId?: unknown
  dataInicio?: unknown
  dataFim?: unknown
  horarioInicio?: unknown
  horarioFim?: unknown
  intervalos?: unknown
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

function isoDateLocal(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isFeriadoFixo(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return FERIADOS_NACIONAIS_FIXOS.has(`${month}-${day}`)
}

function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

function minutesToTime(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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
  const horarioInicioStr = typeof body.horarioInicio === 'string' ? body.horarioInicio : ''
  const horarioFimStr = typeof body.horarioFim === 'string' ? body.horarioFim : ''
  const intervalos = typeof body.intervalos === 'number' ? body.intervalos : Number(body.intervalos)
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

  const inicioMin = parseTimeToMinutes(horarioInicioStr)
  const fimMin = parseTimeToMinutes(horarioFimStr)
  if (inicioMin == null || fimMin == null || fimMin <= inicioMin) {
    return serverErrorResponse('Horários inválidos', 'INVALID_PARAMS', 400)
  }

  if (!Number.isFinite(intervalos) || intervalos <= 0 || intervalos > 24 * 60) {
    return serverErrorResponse('Intervalo inválido', 'INVALID_PARAMS', 400)
  }

  const diasSemana = new Set(
    diasSemanaRaw
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
  )
  if (diasSemana.size === 0) {
    return serverErrorResponse('Selecione pelo menos um dia da semana', 'INVALID_PARAMS', 400)
  }

  const supabase = getAppSupabase()

  const { data: especialistaRow, error: especialistaError } = await supabase
    .from('usuarios')
    .select('id,unidade_id,perfil')
    .eq('id', especialistaId)
    .maybeSingle()

  if (especialistaError) {
    return supabaseErrorResponse(especialistaError, 'Falha ao localizar especialista')
  }
  if (!especialistaRow) {
    return serverErrorResponse('Especialista não encontrado', 'INVALID_PARAMS', 400)
  }

  const unidadeId = especialistaRow.unidade_id ? String(especialistaRow.unidade_id) : null

  const candidatos: Array<{ data: string; horario_inicio: string; horario_fim: string }> = []
  let pulados = 0

  const cursor = new Date(dataInicio.getTime())
  while (cursor.getTime() <= dataFim.getTime()) {
    // getDay(): 0=Dom, 1=Seg, ..., 6=Sáb. diasSemana usa 1=Seg..6=Sáb (sem domingo).
    const dow = cursor.getDay()
    if (!diasSemana.has(dow)) {
      cursor.setDate(cursor.getDate() + 1)
      continue
    }
    if (considerarFeriados && isFeriadoFixo(cursor)) {
      pulados += Math.floor((fimMin - inicioMin) / intervalos)
      cursor.setDate(cursor.getDate() + 1)
      continue
    }

    const isoData = isoDateLocal(cursor)
    for (let slot = inicioMin; slot + intervalos <= fimMin; slot += intervalos) {
      candidatos.push({
        data: isoData,
        horario_inicio: minutesToTime(slot),
        horario_fim: minutesToTime(slot + intervalos),
      })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  if (candidatos.length === 0) {
    return NextResponse.json({ gerados: 0, pulados })
  }

  const datasUnicas = Array.from(new Set(candidatos.map((c) => c.data)))
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
      (row) => `${String(row.data_agendamento ?? '')}|${String(row.horario_inicio ?? '').slice(0, 5)}`,
    ),
  )

  const novos: Array<Record<string, unknown>> = []
  for (const c of candidatos) {
    const key = `${c.data}|${c.horario_inicio}`
    if (existentesSet.has(key)) {
      pulados += 1
      continue
    }
    existentesSet.add(key)
    novos.push({
      profissional_id: especialistaId,
      data_agendamento: c.data,
      horario_inicio: c.horario_inicio,
      horario_fim: c.horario_fim,
      status: 'Disponível',
      unidade_id: unidadeId,
      paciente_id: null,
      criado_por_id: session.userId,
      tipo: null,
      titulo: null,
    })
  }

  if (novos.length === 0) {
    return NextResponse.json({ gerados: 0, pulados })
  }

  const { error: insertError } = await supabase.from('agendamentos').insert(novos)
  if (insertError) {
    return supabaseErrorResponse(insertError, 'Falha ao gerar agenda')
  }

  return NextResponse.json({ gerados: novos.length, pulados })
}
