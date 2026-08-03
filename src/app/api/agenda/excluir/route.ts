import { randomUUID } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

// Item 11c — exclusão em lote da agenda GERADA (slots livres) de um profissional
// num período/dias, com justificativa obrigatória e notificação ao gestor/admin da
// unidade. Espelha o formulário de "Gerar agenda", mas para o caminho inverso.

interface ExcluirBody {
  especialistaId?: unknown
  dataInicio?: unknown
  dataFim?: unknown
  diasSemana?: unknown
  justificativa?: unknown
}

function parseDateLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return null
  return date
}

// Datas YYYY-MM-DD do período que casam com o filtro de dias da semana (null = todos).
function enumerarDatas(
  dataInicio: Date,
  dataFim: Date,
  diasSemanaFiltro: number[] | null,
): string[] {
  const filtro = diasSemanaFiltro && diasSemanaFiltro.length > 0 ? new Set(diasSemanaFiltro) : null
  const datas: string[] = []
  const cursor = new Date(dataInicio.getTime())
  while (cursor.getTime() <= dataFim.getTime()) {
    if (!filtro || filtro.has(cursor.getDay())) {
      const y = cursor.getFullYear()
      const m = String(cursor.getMonth() + 1).padStart(2, '0')
      const d = String(cursor.getDate()).padStart(2, '0')
      datas.push(`${y}-${m}-${d}`)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return datas
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'agenda', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as ExcluirBody | null
  if (!body) return serverErrorResponse('Corpo inválido', 'INVALID_BODY', 400)

  const especialistaId = typeof body.especialistaId === 'string' ? body.especialistaId.trim() : ''
  const dataInicioStr = typeof body.dataInicio === 'string' ? body.dataInicio : ''
  const dataFimStr = typeof body.dataFim === 'string' ? body.dataFim : ''
  const diasSemanaRaw = Array.isArray(body.diasSemana) ? body.diasSemana : []
  const justificativa = typeof body.justificativa === 'string' ? body.justificativa.trim() : ''

  if (!especialistaId) {
    return serverErrorResponse('Especialista é obrigatório', 'INVALID_PARAMS', 400)
  }
  // Justificativa obrigatória validada TAMBÉM no backend (não só no front).
  if (!justificativa) {
    return serverErrorResponse('Justificativa é obrigatória', 'JUSTIFICATIVA_REQUIRED', 400)
  }

  const dataInicio = parseDateLocal(dataInicioStr)
  const dataFim = parseDateLocal(dataFimStr)
  if (!dataInicio || !dataFim) {
    return serverErrorResponse('Datas inválidas', 'INVALID_PARAMS', 400)
  }
  if (dataFim < dataInicio) {
    return serverErrorResponse('Data final anterior à inicial', 'INVALID_PARAMS', 400)
  }

  const diasSemana = diasSemanaRaw
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
  const diasSemanaFiltro = diasSemana.length > 0 ? diasSemana : null

  const supabase = getAppSupabase()

  const { data: especialistaRow, error: especialistaError } = await supabase
    .from('usuarios')
    .select('id,nome,unidade_id,perfil')
    .eq('id', especialistaId)
    .maybeSingle()

  if (especialistaError) {
    return supabaseErrorResponse(especialistaError, 'Falha ao localizar especialista')
  }
  if (especialistaRow?.perfil !== 'especialista') {
    return serverErrorResponse('Especialista não encontrado', 'INVALID_PARAMS', 400)
  }

  const unidadeId = especialistaRow.unidade_id ? String(especialistaRow.unidade_id) : null
  const especialistaNome = String(especialistaRow.nome ?? 'profissional')

  // SEC — o chamador escopado (gestor/recepção/especialista) só pode excluir agenda
  // da PRÓPRIA unidade. Sem esta checagem, um gestor da Unidade A poderia excluir a
  // agenda de um profissional da Unidade B sabendo apenas o especialistaId (mesmo
  // IDOR de gerar-contrato / gestão bancária). master/admin têm scopedUnit null →
  // sem restrição. Como o delete atua na unidade PRINCIPAL do profissional, a
  // unidade do chamador precisa ser exatamente essa.
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao identificar unidade do usuário')
  }
  if (scopedUnit.unidadeId && scopedUnit.unidadeId !== unidadeId) {
    return serverErrorResponse('Profissional de outra unidade', 'UNIT_MISMATCH', 403)
  }

  const datas = enumerarDatas(dataInicio, dataFim, diasSemanaFiltro)
  if (datas.length === 0) {
    return NextResponse.json({ excluidos: 0 })
  }

  // Exclui APENAS slots livres (status='Disponível' E paciente_id null), escopados à
  // unidade do profissional — nunca toca em agendamento com paciente. Hard-delete:
  // são só disponibilidade, sem histórico; o rastro fica na notificação abaixo.
  const deleteQuery = supabase
    .from('agendamentos')
    .delete()
    .eq('profissional_id', especialistaId)
    .in('data_agendamento', datas)
    .eq('status', 'Disponível')
    .is('paciente_id', null)
  const { data: deletados, error: deleteError } = await (unidadeId
    ? deleteQuery.eq('unidade_id', unidadeId)
    : deleteQuery.is('unidade_id', null)
  ).select('id')

  if (deleteError) {
    return supabaseErrorResponse(deleteError, 'Falha ao excluir agenda')
  }

  const excluidos = deletados?.length ?? 0

  // Notifica gestor(es)/admin(s) da unidade do profissional. Uma linha por
  // destinatário, com a justificativa na descrição. source_key único por evento →
  // não colide com as notificações derivadas (reconstruídas por upsert a cada GET).
  if (excluidos > 0) {
    let destinatariosQuery = supabase.from('usuarios').select('id').in('perfil', ['gestor', 'admin'])
    if (unidadeId) destinatariosQuery = destinatariosQuery.eq('unidade_id', unidadeId)
    const { data: destinatarios } = await destinatariosQuery

    const eventoId = randomUUID()
    const ocorridoEm = new Date().toISOString()
    const rows = (destinatarios ?? [])
      .map((row) => String(row.id))
      .filter((id) => id && id !== session.userId)
      .map((destinatarioId) => ({
        usuario_id: destinatarioId,
        titulo: 'Agenda excluída',
        descricao: `${excluidos} horário(s) livre(s) de ${especialistaNome} (${dataInicioStr} a ${dataFimStr}) excluído(s). Motivo: ${justificativa}`,
        href: '/agenda',
        kind: 'agenda',
        ocorrido_em: ocorridoEm,
        source_key: `agenda_exclusao:${eventoId}:${destinatarioId}`,
        source_table: 'agendamentos',
        source_id: null,
      }))

    if (rows.length > 0) {
      const { error: notifError } = await supabase.from('notificacoes').insert(rows)
      // Uma falha ao notificar não deve reverter a exclusão já efetivada.
      if (notifError) {
        console.error('[agenda/excluir] falha ao notificar gestores', notifError)
      }
    }
  }

  return NextResponse.json({ excluidos })
}
