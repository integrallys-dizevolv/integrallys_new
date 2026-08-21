import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

/**
 * Pacientes com lançamentos financeiros vencidos (visão CRM de inadimplência).
 */
export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'pacientes', 'read')
  if (denied) return denied

  const supabase = getAppSupabase()
  const scoped = await getScopedUnitId(session)
  if (scoped.error) return supabaseErrorResponse(scoped.error, 'Falha ao carregar inadimplência')

  const today = new Date().toISOString().slice(0, 10)

  let query = supabase
    .from('financeiro_lancamentos')
    .select('id,descricao,valor,vencimento,status,unidade_id,paciente_id,beneficiario')
    .eq('tipo', 'receita')
    .neq('status', 'Pago')
    .lt('vencimento', today)
    .order('vencimento', { ascending: true })
    .limit(200)

  if (scoped.unidadeId) {
    query = query.eq('unidade_id', scoped.unidadeId)
  }

  const { data, error } = await query
  if (error) {
    // Coluna paciente_id pode não existir em todos os ambientes — fallback sem ela.
    if (String(error.message ?? '').includes('paciente_id')) {
      let fallback = supabase
        .from('financeiro_lancamentos')
        .select('id,descricao,valor,vencimento,status,unidade_id,beneficiario')
        .eq('tipo', 'receita')
        .neq('status', 'Pago')
        .lt('vencimento', today)
        .order('vencimento', { ascending: true })
        .limit(200)
      if (scoped.unidadeId) fallback = fallback.eq('unidade_id', scoped.unidadeId)
      const fb = await fallback
      if (fb.error) return supabaseErrorResponse(fb.error, 'Falha ao carregar inadimplência')
      return NextResponse.json({
        data: (fb.data ?? []).map((row) => ({
          id: String(row.id),
          descricao: String(row.descricao ?? ''),
          valor: Number(row.valor ?? 0),
          vencimento: row.vencimento ? String(row.vencimento) : null,
          status: String(row.status ?? ''),
          pacienteId: null as string | null,
          pacienteNome: row.beneficiario ? String(row.beneficiario) : '—',
          linkFinanceiro: '/financeiro?status=pendente&vencido=true',
        })),
        meta: session,
      })
    }
    return supabaseErrorResponse(error, 'Falha ao carregar inadimplência')
  }

  const pacienteIds = Array.from(
    new Set((data ?? []).map((r) => (r.paciente_id ? String(r.paciente_id) : '')).filter(Boolean)),
  )
  const nomeById = new Map<string, string>()
  if (pacienteIds.length > 0) {
    const { data: pacientes } = await supabase.from('pacientes').select('id,nome').in('id', pacienteIds)
    for (const p of pacientes ?? []) nomeById.set(String(p.id), String(p.nome ?? ''))
  }

  return NextResponse.json({
    data: (data ?? []).map((row) => {
      const pacienteId = row.paciente_id ? String(row.paciente_id) : null
      return {
        id: String(row.id),
        descricao: String(row.descricao ?? ''),
        valor: Number(row.valor ?? 0),
        vencimento: row.vencimento ? String(row.vencimento) : null,
        status: String(row.status ?? ''),
        pacienteId,
        pacienteNome:
          (pacienteId ? nomeById.get(pacienteId) : null) ||
          (row.beneficiario ? String(row.beneficiario) : '—'),
        linkFinanceiro: '/financeiro?status=pendente&vencido=true',
      }
    }),
    meta: session,
  })
}
