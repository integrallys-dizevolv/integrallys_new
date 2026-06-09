import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getEntityNameMap, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapChatbotSessaoItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

const SESSAO_ATIVA_MS = 30 * 60 * 1000

async function listSessoes(session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()

  const { data, error } = await supabase
    .from('chatbot_sessoes')
    .select('id,telefone,paciente_id,estado,contexto,ultima_interacao,created_at')
    .order('ultima_interacao', { ascending: false })
    .limit(500)

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar sessões')

  const { map: pacienteMap, error: nameError } = await getEntityNameMap(
    supabase,
    'pacientes',
    (data ?? []).map((row) => String(row.paciente_id ?? '')),
  )
  if (nameError) return supabaseErrorResponse(nameError, 'Falha ao carregar sessões')

  // KPI: agendamentos criados via chatbot (hoje / últimos 7 dias).
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const semana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const { data: viaChatbot } = await supabase
    .from('agendamentos')
    .select('created_at')
    .ilike('observacoes', '%Agendado via WhatsApp%')
    .gte('created_at', semana.toISOString())

  let agendamentosHoje = 0
  let agendamentosSemana = 0
  for (const row of viaChatbot ?? []) {
    const ts = new Date(String(row.created_at ?? '')).getTime()
    if (Number.isNaN(ts)) continue
    agendamentosSemana += 1
    if (ts >= hoje.getTime()) agendamentosHoje += 1
  }

  const agora = Date.now()
  const sessoesAtivas = (data ?? []).filter((row) => {
    const idadeMs = agora - new Date(String(row.ultima_interacao ?? '')).getTime()
    return (
      idadeMs <= SESSAO_ATIVA_MS &&
      row.estado !== 'encerrado' &&
      row.estado !== 'concluido'
    )
  }).length

  return NextResponse.json({
    data: (data ?? []).map((row) =>
      mapChatbotSessaoItem({
        ...row,
        paciente_nome: pacienteMap[String(row.paciente_id ?? '')] ?? '',
      }),
    ),
    meta: {
      ...session,
      sessoesAtivas,
      agendamentosHoje,
      agendamentosSemana,
    },
  })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'comunicacao', 'read')
  if (denied) return denied

  return listSessoes(session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'comunicacao', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body?.action !== 'encerrar_sessao' || typeof body.telefone !== 'string') {
    return NextResponse.json({ error: 'Payload inválido', code: 'INVALID_PAYLOAD' }, { status: 400 })
  }

  const supabase = getAppSupabase()
  const { error } = await supabase
    .from('chatbot_sessoes')
    .update({ estado: 'encerrado', contexto: {}, ultima_interacao: new Date().toISOString() })
    .eq('telefone', body.telefone)

  if (error) return supabaseErrorResponse(error, 'Falha ao encerrar sessão')

  return listSessoes(session)
}
