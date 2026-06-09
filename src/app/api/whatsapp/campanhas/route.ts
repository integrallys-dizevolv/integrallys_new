import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

// CR-WPP-03 · item 6.3: CRUD de campanhas WhatsApp agendadas. O cron
// (`/api/whatsapp/cron`) lê esta tabela e dispara via `processarCampanhas`
// quando data+hora atingem o presente.

function mapCampanha(row: Record<string, unknown>) {
  const horaRaw = String(row.hora_disparo ?? '')
  return {
    id: String(row.id ?? ''),
    nome: String(row.nome ?? ''),
    tipo: String(row.tipo ?? 'manual'),
    mensagemTemplate: String(row.mensagem_template ?? ''),
    dataDisparo: String(row.data_disparo ?? ''),
    horaDisparo: horaRaw.slice(0, 5),
    status: String(row.status ?? 'agendada'),
    totalEnviados: Number(row.total_enviados ?? 0),
    totalErros: Number(row.total_erros ?? 0),
    filtroEstagio: row.filtro_estagio ? String(row.filtro_estagio) : null,
    criadoEm: String(row.created_at ?? ''),
  }
}

async function listCampanhas() {
  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('whatsapp_campanhas')
    .select(
      'id,nome,tipo,mensagem_template,data_disparo,hora_disparo,status,total_enviados,total_erros,filtro_estagio,created_at',
    )
    .order('data_disparo', { ascending: false })
    .order('hora_disparo', { ascending: false })

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar campanhas')

  return NextResponse.json({
    data: (data ?? []).map((row) => mapCampanha(row as Record<string, unknown>)),
  })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'comunicacao', 'read')
  if (denied) return denied
  return listCampanhas()
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'comunicacao', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
  const mensagemTemplate =
    typeof body?.mensagemTemplate === 'string' ? body.mensagemTemplate.trim() : ''
  const dataDisparo = typeof body?.dataDisparo === 'string' ? body.dataDisparo : ''
  const horaDisparo =
    typeof body?.horaDisparo === 'string' && body.horaDisparo.trim() !== ''
      ? body.horaDisparo
      : '09:00'
  const tipo = typeof body?.tipo === 'string' && body.tipo.trim() !== '' ? body.tipo : 'manual'
  const filtroEstagio =
    typeof body?.filtroEstagio === 'string' && body.filtroEstagio.trim() !== ''
      ? body.filtroEstagio.trim()
      : null

  if (!nome || !mensagemTemplate || !dataDisparo) {
    return NextResponse.json(
      { error: 'nome, mensagemTemplate e dataDisparo são obrigatórios', code: 'INVALID_PAYLOAD' },
      { status: 400 },
    )
  }

  const supabase = getAppSupabase()
  const { error } = await supabase.from('whatsapp_campanhas').insert({
    nome,
    tipo,
    mensagem_template: mensagemTemplate,
    data_disparo: dataDisparo,
    hora_disparo: horaDisparo,
    status: 'agendada',
    filtro_estagio: filtroEstagio,
  })

  if (error) return supabaseErrorResponse(error, 'Falha ao criar campanha')

  return listCampanhas()
}

// "Cancelar" é soft-delete (mantém histórico): muda status para 'cancelada'.
// Mesma convenção do DELETE de prescrições — body com {id}.
export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'comunicacao', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const id = typeof body?.id === 'string' ? body.id : ''

  if (!id) {
    return NextResponse.json({ error: 'id obrigatório', code: 'INVALID_PAYLOAD' }, { status: 400 })
  }

  const supabase = getAppSupabase()
  // Só cancela quando ainda está agendada — proteção contra cancelar campanha
  // já em execução pelo cron (status 'processando') ou concluída.
  const { error } = await supabase
    .from('whatsapp_campanhas')
    .update({ status: 'cancelada' })
    .eq('id', id)
    .eq('status', 'agendada')

  if (error) return supabaseErrorResponse(error, 'Falha ao cancelar campanha')

  return listCampanhas()
}
