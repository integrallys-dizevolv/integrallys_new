import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth } from '@/lib/request-auth'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * POST /api/documentos/pdf/[id]
 *
 * Recebe o PDF renderizado pelo cliente (jsPDF + html2canvas) para um
 * documento já criado via /api/documentos/gerar. Faz upload no bucket
 * privado `documentos-pdf` e grava a signed URL em
 * `documentos_gerados.pdf_url` para que o portal do paciente possa baixá-lo.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'documentacao', 'create')
  if (denied) return denied

  const { id } = await params
  if (!id) return serverErrorResponse('id obrigatório', 'INVALID_ID', 400)

  const form = await request.formData().catch(() => null)
  if (!form) return serverErrorResponse('Upload inválido', 'INVALID_UPLOAD', 400)

  const file = form.get('file')
  if (!(file instanceof File)) {
    return serverErrorResponse('Arquivo ausente', 'MISSING_FILE', 400)
  }
  if (file.type !== 'application/pdf') {
    return serverErrorResponse('Apenas PDF', 'INVALID_MIME', 400)
  }
  if (file.size > MAX_BYTES) {
    return serverErrorResponse('PDF acima de 5 MB', 'FILE_TOO_LARGE', 400)
  }

  const supabase = getAppSupabase()

  const { data: documento, error: docError } = await supabase
    .from('documentos_gerados')
    .select('id,template_id')
    .eq('id', id)
    .maybeSingle()
  if (docError) {
    return serverErrorResponse('Falha ao localizar documento', 'QUERY_FAILED', 500)
  }
  if (!documento) return serverErrorResponse('Documento não encontrado', 'NOT_FOUND', 404)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const path = `${id}.pdf`

  const upload = await supabase.storage.from('documentos-pdf').upload(path, bytes, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (upload.error) {
    console.error('[documentos/pdf] upload', upload.error)
    return serverErrorResponse('Falha no upload', 'UPLOAD_FAILED', 500)
  }

  // Bucket é privado — geramos um signed URL de longa duração para portal
  const { data: signed, error: signedError } = await supabase.storage
    .from('documentos-pdf')
    .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 ano
  if (signedError || !signed) {
    console.error('[documentos/pdf] sign', signedError)
    return serverErrorResponse('Falha ao gerar URL', 'SIGN_FAILED', 500)
  }

  const { error: updateError } = await supabase
    .from('documentos_gerados')
    .update({ pdf_url: signed.signedUrl })
    .eq('id', id)
  if (updateError) {
    console.error('[documentos/pdf] update', updateError)
    return serverErrorResponse('Falha ao atualizar registro', 'UPDATE_FAILED', 500)
  }

  return NextResponse.json({ data: { pdf_url: signed.signedUrl } })
}
