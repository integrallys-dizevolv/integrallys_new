import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'
import { getWhatsappConfig, normalizeTelefone, sendWhatsappMessage } from '@/lib/whatsapp.service'

// Histórico de conversa do chatbot por telefone (transcript da sessão).
export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'comunicacao', 'read')
  if (denied) return denied

  const telefone = new URL(request.url).searchParams.get('telefone')
  if (!telefone) return serverErrorResponse('Telefone obrigatório', 'TELEFONE_REQUIRED', 400)

  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('chatbot_mensagens')
    .select('id,telefone,direcao,conteudo,created_at')
    .eq('telefone', telefone)
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar a conversa')
  return NextResponse.json({ data: data ?? [], meta: session })
}

// Inicia/continua uma conversa pela plataforma: envia a mensagem via Evolution,
// grava no transcript (direcao 'out') e garante a sessão na lista do Chatbot.
export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'comunicacao', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as {
    telefone?: string
    conteudo?: string
    pacienteId?: string
  } | null
  const telefoneRaw = body?.telefone?.trim()
  const conteudo = body?.conteudo?.trim()
  if (!telefoneRaw || !conteudo) {
    return serverErrorResponse('Telefone e mensagem são obrigatórios.', 'INVALID_INPUT', 400)
  }
  const telefone = normalizeTelefone(telefoneRaw)

  const evoConfig = await getWhatsappConfig()
  if (!evoConfig) {
    return serverErrorResponse(
      'WhatsApp (Evolution API) não configurado.',
      'WHATSAPP_NOT_CONFIGURED',
      422,
    )
  }
  const envio = await sendWhatsappMessage(evoConfig, telefone, conteudo)
  if (!envio.success) {
    return serverErrorResponse(envio.error || 'Falha ao enviar a mensagem.', 'SEND_FAILED', 502)
  }

  const supabase = getAppSupabase()
  const nowIso = new Date().toISOString()
  const pacienteId = body?.pacienteId ? String(body.pacienteId) : null

  await supabase.from('chatbot_mensagens').insert({ telefone, direcao: 'out', conteudo })

  // garante a sessão: cria se nova; senão só atualiza a última interação (sem
  // sobrescrever o estado de uma conversa em andamento)
  const { data: existente } = await supabase
    .from('chatbot_sessoes')
    .select('id')
    .eq('telefone', telefone)
    .maybeSingle()
  if (existente) {
    await supabase
      .from('chatbot_sessoes')
      .update({ ultima_interacao: nowIso, ...(pacienteId ? { paciente_id: pacienteId } : {}) })
      .eq('telefone', telefone)
  } else {
    await supabase.from('chatbot_sessoes').insert({
      telefone,
      paciente_id: pacienteId,
      estado: 'inicio',
      contexto: {},
      ultima_interacao: nowIso,
    })
  }

  return NextResponse.json({ data: { telefone }, meta: session }, { status: 201 })
}
