import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getPacienteIdByUserId, supabaseErrorResponse } from '@/lib/app-api'
import { authErrorResponse, getRequestAuth, requirePatientRole } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = requirePatientRole(session)
  if (denied) return denied

  const supabase = getAppSupabase()
  const { pacienteId, error: pacienteError } = await getPacienteIdByUserId(
    supabase,
    session.userId,
  )
  if (pacienteError) return supabaseErrorResponse(pacienteError, 'Falha ao carregar documentos')
  if (!pacienteId) {
    return NextResponse.json({ data: [], meta: session })
  }

  const { data, error } = await supabase
    .from('documentos_gerados')
    .select('id,template_id,gerado_em,pdf_url')
    .eq('paciente_id', pacienteId)
    .eq('disponivel_no_portal', true)
    .order('gerado_em', { ascending: false })

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar documentos')

  // Traz o nome do template para exibir no portal
  const templateIds = Array.from(new Set((data ?? []).map((row) => row.template_id).filter(Boolean)))
  const nomesPorTemplate = new Map<string, string>()
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from('documento_templates')
      .select('id,nome,tipo')
      .in('id', templateIds)
    for (const row of templates ?? []) {
      nomesPorTemplate.set(String(row.id), String(row.nome ?? row.tipo ?? 'Documento'))
    }
  }

  const payload = (data ?? []).map((row) => ({
    id: row.id,
    template_id: row.template_id,
    template_nome: nomesPorTemplate.get(String(row.template_id)) ?? 'Documento',
    gerado_em: row.gerado_em,
    pdf_url: row.pdf_url,
  }))

  return NextResponse.json({ data: payload, meta: session })
}
