import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, getEntityNameMap, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

interface HistoricoPrescricaoItem {
  produto: string
  quantidade: number
  posologia: string | null
  valorUnitario: number | null
}

interface HistoricoDocumentoItem {
  id: string
  titulo: string
  geradoEm: string
  pdfUrl: string | null
}

interface HistoricoConsultaItem {
  date: string
  doctor: string
  anamneseType: 'consulta' | 'reconsulta'
  anamnese: {
    weight: string
    height: string
    queixa: string
    historicos: { label: string; value: string }[]
    diagnose: string
  }
  evolucao: string
  prescricoes: HistoricoPrescricaoItem[]
  documentos: HistoricoDocumentoItem[]
}

function formatBR(value?: string | null) {
  if (!value) return ''
  // value chega como YYYY-MM-DD; converter para DD/MM/YYYY (consistente com o resto do app)
  const parts = value.split('-')
  if (parts.length !== 3) return value
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const denied = await requirePermission(session.userId, 'prontuarios', 'read')
  if (denied) return denied

  const pacienteId = request.nextUrl.searchParams.get('pacienteId')
  if (!pacienteId) {
    return serverErrorResponse('pacienteId obrigatório', 'PACIENTE_ID_REQUIRED', 400)
  }

  const supabase = getAppSupabase()

  const [
    { data: anamneses, error: anamnesesError },
    { data: evolucoes, error: evolucoesError },
    { data: prescricoes, error: prescricoesError },
    { data: prontuarios, error: prontuariosError },
    { data: documentos, error: documentosError },
  ] = await Promise.all([
    supabase
      .from('anamneses')
      .select('id,data_anamnese,profissional_id,tipo,queixa,peso,altura')
      .eq('paciente_id', pacienteId),
    supabase
      .from('evolucoes')
      .select('id,data_evolucao,profissional_id,resumo')
      .eq('paciente_id', pacienteId),
    supabase
      .from('prescricoes')
      .select('id,data_prescricao,profissional_id,status,tipo')
      .eq('paciente_id', pacienteId)
      .neq('status', 'Cancelada'),
    supabase
      .from('prontuarios')
      .select('id,data_registro,profissional_id,conteudo')
      .eq('paciente_id', pacienteId),
    supabase
      .from('documentos_gerados')
      .select('id,gerado_em,profissional_id,pdf_url,conteudo_preenchido')
      .eq('paciente_id', pacienteId),
  ])

  if (anamnesesError) return supabaseErrorResponse(anamnesesError, 'Falha ao carregar anamneses')
  if (evolucoesError) return supabaseErrorResponse(evolucoesError, 'Falha ao carregar evoluções')
  if (prescricoesError) return supabaseErrorResponse(prescricoesError, 'Falha ao carregar prescrições')
  if (prontuariosError) return supabaseErrorResponse(prontuariosError, 'Falha ao carregar prontuários')
  if (documentosError) return supabaseErrorResponse(documentosError, 'Falha ao carregar documentos emitidos')

  const prescricaoIds = (prescricoes ?? [])
    .map((row) => String(row.id ?? ''))
    .filter(Boolean)

  let itensByPrescricao = new Map<string, HistoricoPrescricaoItem[]>()
  if (prescricaoIds.length > 0) {
    const { data: itens, error: itensError } = await supabase
      .from('prescricao_itens')
      .select('prescricao_id,descricao,quantidade,posologia,valor_unitario')
      .in('prescricao_id', prescricaoIds)

    if (itensError) return supabaseErrorResponse(itensError, 'Falha ao carregar itens das prescrições')

    for (const row of itens ?? []) {
      const key = String(row.prescricao_id ?? '')
      if (!key) continue
      const list = itensByPrescricao.get(key) ?? []
      list.push({
        produto: String(row.descricao ?? ''),
        quantidade: Number(row.quantidade ?? 0) || 0,
        posologia: row.posologia ? String(row.posologia) : null,
        valorUnitario: row.valor_unitario != null ? Number(row.valor_unitario) : null,
      })
      itensByPrescricao.set(key, list)
    }
  }

  const profissionalIds = new Set<string>()
  for (const row of anamneses ?? []) if (row.profissional_id) profissionalIds.add(String(row.profissional_id))
  for (const row of evolucoes ?? []) if (row.profissional_id) profissionalIds.add(String(row.profissional_id))
  for (const row of prescricoes ?? []) if (row.profissional_id) profissionalIds.add(String(row.profissional_id))
  for (const row of prontuarios ?? []) if (row.profissional_id) profissionalIds.add(String(row.profissional_id))

  const { map: profissionais, error: profissionalError } = await getEntityNameMap(
    supabase,
    'usuarios',
    Array.from(profissionalIds),
  )
  if (profissionalError) return supabaseErrorResponse(profissionalError, 'Falha ao carregar profissionais')

  // Agrupa por data — cada data é uma "consulta histórica"
  const byDate = new Map<string, HistoricoConsultaItem>()

  const ensureBucket = (dateRaw?: string | null, profissionalId?: string | null): HistoricoConsultaItem | null => {
    if (!dateRaw) return null
    const date = String(dateRaw)
    if (!byDate.has(date)) {
      byDate.set(date, {
        date: formatBR(date),
        doctor: profissionalId ? profissionais[String(profissionalId)] ?? '' : '',
        anamneseType: 'consulta',
        anamnese: {
          weight: '',
          height: '',
          queixa: '',
          historicos: [],
          diagnose: '',
        },
        evolucao: '',
        prescricoes: [],
        documentos: [],
      })
    }
    const bucket = byDate.get(date)!
    if (!bucket.doctor && profissionalId) {
      bucket.doctor = profissionais[String(profissionalId)] ?? bucket.doctor
    }
    return bucket
  }

  for (const row of anamneses ?? []) {
    const bucket = ensureBucket(row.data_anamnese as string, row.profissional_id as string | null)
    if (!bucket) continue
    const tipo = String(row.tipo ?? '').toLowerCase()
    bucket.anamneseType = tipo.includes('reconsulta') || tipo.includes('retorno') ? 'reconsulta' : 'consulta'
    if (row.peso != null) bucket.anamnese.weight = String(row.peso)
    if (row.altura != null) bucket.anamnese.height = String(row.altura)
    if (row.queixa) bucket.anamnese.queixa = String(row.queixa)
  }

  for (const row of prontuarios ?? []) {
    const bucket = ensureBucket(row.data_registro as string, row.profissional_id as string | null)
    if (!bucket) continue
    const conteudo = (row.conteudo ?? {}) as Record<string, unknown>
    if (typeof conteudo.diagnose === 'string' && conteudo.diagnose && !bucket.anamnese.diagnose) {
      bucket.anamnese.diagnose = conteudo.diagnose
    }
    if (Array.isArray(conteudo.historicos) && bucket.anamnese.historicos.length === 0) {
      bucket.anamnese.historicos = conteudo.historicos
        .filter((entry): entry is { label: string; value: string } => {
          if (!entry || typeof entry !== 'object') return false
          const e = entry as Record<string, unknown>
          return typeof e.label === 'string' && typeof e.value === 'string'
        })
        .map((entry) => ({ label: entry.label, value: entry.value }))
    }
  }

  for (const row of evolucoes ?? []) {
    const bucket = ensureBucket(row.data_evolucao as string, row.profissional_id as string | null)
    if (!bucket) continue
    if (row.resumo && !bucket.evolucao) bucket.evolucao = String(row.resumo)
  }

  for (const row of prescricoes ?? []) {
    const bucket = ensureBucket(row.data_prescricao as string | null, row.profissional_id as string | null)
    if (!bucket) continue
    const items = itensByPrescricao.get(String(row.id ?? '')) ?? []
    for (const item of items) bucket.prescricoes.push(item)
  }

  for (const row of documentos ?? []) {
    const geradoEm = row.gerado_em as string | null
    if (!geradoEm) continue
    const dateOnly = String(geradoEm).slice(0, 10)
    const bucket = ensureBucket(dateOnly, row.profissional_id as string | null)
    if (!bucket) continue
    const conteudo = (row.conteudo_preenchido ?? {}) as Record<string, unknown>
    const cabecalho = conteudo.cabecalho as { titulo?: string } | undefined
    bucket.documentos.push({
      id: String(row.id),
      titulo: String(cabecalho?.titulo ?? 'Documento'),
      geradoEm: String(geradoEm),
      pdfUrl: row.pdf_url ? String(row.pdf_url) : null,
    })
  }

  const data = Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([, bucket]) => bucket)

  return NextResponse.json({ data, meta: session })
}
