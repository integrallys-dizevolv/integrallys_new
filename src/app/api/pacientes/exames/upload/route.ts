import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse } from '@/lib/app-api'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
])
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/pacientes/exames/upload
 * FormData: file (PDF/JPG/PNG), pacienteId, nome (display name), tipo (opcional)
 *
 * Faz upload no bucket `exames-pacientes` (privado), gera signed URL anual e
 * persiste em paciente_exames via /api/pacientes/exames POST.
 */
export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()

  const form = await request.formData().catch(() => null)
  if (!form) return serverErrorResponse('Upload inválido', 'INVALID_UPLOAD', 400)

  const file = form.get('file')
  const pacienteId = String(form.get('pacienteId') ?? '').trim()
  const nome = String(form.get('nome') ?? '').trim()
  const tipo = form.get('tipo') ? String(form.get('tipo')) : null

  if (!(file instanceof File)) {
    return serverErrorResponse('Arquivo ausente', 'MISSING_FILE', 400)
  }
  if (!pacienteId) {
    return serverErrorResponse('pacienteId obrigatório', 'PACIENTE_REQUIRED', 400)
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return serverErrorResponse('Apenas PDF/JPG/PNG', 'INVALID_MIME', 400)
  }
  if (file.size > MAX_BYTES) {
    return serverErrorResponse('Arquivo acima de 10 MB', 'FILE_TOO_LARGE', 400)
  }

  const supabase = getAppSupabase()

  // Validação de acesso paciente → próprio paciente
  let uploadedPeloPaciente = false
  if (session.role === 'paciente') {
    const { data: pac } = await supabase
      .from('pacientes')
      .select('id')
      .eq('usuario_id', session.userId)
      .maybeSingle()
    if (!pac || String(pac.id) !== pacienteId) {
      return serverErrorResponse('Acesso negado', 'FORBIDDEN', 403)
    }
    uploadedPeloPaciente = true
  }

  const safeName = (nome || file.name).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80)
  const path = `${pacienteId}/${Date.now()}-${safeName}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const upload = await supabase.storage.from('exames-pacientes').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (upload.error) {
    return serverErrorResponse(upload.error.message ?? 'Falha no upload', 'UPLOAD_FAILED', 500)
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from('exames-pacientes')
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  if (signedError || !signed) {
    return serverErrorResponse('Falha ao gerar URL', 'SIGN_FAILED', 500)
  }

  const { data: inserted, error: insertError } = await supabase
    .from('paciente_exames')
    .insert({
      paciente_id: pacienteId,
      nome: nome || file.name,
      tipo,
      url: signed.signedUrl,
      uploaded_by: session.userId,
      uploaded_pelo_paciente: uploadedPeloPaciente,
    })
    .select('id,paciente_id,nome,tipo,url,uploaded_by,uploaded_pelo_paciente,created_at')
    .single()

  if (insertError) {
    return serverErrorResponse('Falha ao registrar exame', 'INSERT_FAILED', 500)
  }

  return NextResponse.json(
    {
      data: {
        id: String(inserted.id),
        url: signed.signedUrl,
        nome: inserted.nome,
        tipo: inserted.tipo,
        pacienteId: inserted.paciente_id,
      },
      meta: session,
    },
    { status: 201 },
  )
}
