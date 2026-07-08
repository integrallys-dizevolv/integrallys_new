import { type NextRequest, NextResponse } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { authErrorResponse, getRequestAuth, type RequestAuth } from '@/lib/request-auth'
import type { UserRole } from '@/types/auth'

/**
 * `cargo` é READ-ONLY no front — rótulo derivado do `perfil` (role) do usuário,
 * nunca armazenado nem editável. Espelha o `ROLE_LABELS` das telas de usuários.
 */
const CARGO_LABELS: Record<UserRole, string> = {
  master: 'Master',
  admin: 'Administrador',
  gestor: 'Gestor',
  recepcao: 'Recepção',
  especialista: 'Especialista',
  paciente: 'Paciente',
}

/**
 * Lista fechada de chaves de preferência aceitas. Qualquer outra chave é
 * ignorada no PUT para a tabela não acumular lixo.
 */
const ALLOWED_PREF_KEYS = new Set([
  'assinatura',
  'notif_sistema',
  'notif_som',
  'notif_email',
  'toast_duration',
  'agenda_visualizacao',
  'agenda_horario_inicio',
  'agenda_duracao',
  'agenda_intervalo',
  'atend_imprimir',
  'atend_sms',
  'atend_email',
  'atend_lembrete_h',
  'atend_metodo',
  'atend_plataforma',
])

function pickString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Lê identidade (de `usuarios`) + preferências (de `usuario_preferencias`) do
 * próprio usuário. Reaproveitado pelo GET e pelo retorno do PUT.
 */
async function buildPerfilPayload(session: RequestAuth) {
  const supabase = getAppSupabase()
  const [usuarioResult, prefsResult] = await Promise.all([
    supabase
      .from('usuarios')
      .select('nome,email,telefone,cpf,crm')
      .eq('id', session.userId)
      .maybeSingle(),
    supabase.from('usuario_preferencias').select('chave,valor').eq('usuario_id', session.userId),
  ])

  if (usuarioResult.error) return { data: null, error: usuarioResult.error }
  if (prefsResult.error) return { data: null, error: prefsResult.error }

  const usuario = usuarioResult.data

  return {
    data: {
      identity: {
        nome: String(usuario?.nome ?? ''),
        email: String(usuario?.email ?? ''),
        telefone: String(usuario?.telefone ?? ''),
        cpf: String(usuario?.cpf ?? ''),
        crm: String(usuario?.crm ?? ''),
        cargo: CARGO_LABELS[session.role] ?? '',
      },
      prefs: (prefsResult.data ?? []).map((row) => ({
        chave: String(row.chave),
        valor: row.valor == null ? '' : String(row.valor),
      })),
    },
    error: null,
  }
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  // Dado do próprio usuário — preso a session.userId, sem checagem de permissão.

  const result = await buildPerfilPayload(session)
  if (result.error) return supabaseErrorResponse(result.error, 'Falha ao carregar perfil')

  return NextResponse.json({ data: result.data, meta: session })
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  // Dado do próprio usuário — preso a session.userId, sem checagem de permissão.

  const body = (await request.json().catch(() => null)) as {
    identity?: Record<string, unknown>
    prefs?: Array<{ chave?: unknown; valor?: unknown }>
  } | null
  if (!body) return serverErrorResponse('Perfil inválido', 'INVALID_PROFILE', 400)

  const supabase = getAppSupabase()
  const identity = body.identity ?? {}

  // Atualiza SOMENTE a própria linha — nunca email, nunca perfil, nunca outro id.
  const { error: usuarioError } = await supabase
    .from('usuarios')
    .update({
      nome: pickString(identity.nome),
      telefone: pickString(identity.telefone),
      cpf: pickString(identity.cpf),
      crm: pickString(identity.crm),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.userId)
  if (usuarioError) return supabaseErrorResponse(usuarioError, 'Falha ao salvar perfil')

  // Upsert das preferências (lista fechada), sempre presas ao próprio usuário.
  const prefRows = (Array.isArray(body.prefs) ? body.prefs : [])
    .map((item) => ({
      chave: pickString(item?.chave),
      valor: typeof item?.valor === 'string' ? item.valor : '',
    }))
    .filter((item) => ALLOWED_PREF_KEYS.has(item.chave))
    .map((item) => ({ usuario_id: session.userId, chave: item.chave, valor: item.valor }))

  if (prefRows.length > 0) {
    const { error: prefError } = await supabase
      .from('usuario_preferencias')
      .upsert(prefRows, { onConflict: 'usuario_id,chave' })
    if (prefError) return supabaseErrorResponse(prefError, 'Falha ao salvar preferências')
  }

  const result = await buildPerfilPayload(session)
  if (result.error) return supabaseErrorResponse(result.error, 'Falha ao carregar perfil')

  return NextResponse.json({ data: result.data, meta: session })
}
