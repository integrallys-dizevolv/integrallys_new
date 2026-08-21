import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase } from '@/lib/app-api'
import { consultarPix, getSicrediConfig } from '@/lib/gateways/sicredi.service'

/**
 * Webhook Pix Sicredi — padrão BACEN.
 * Nunca marca pago só pelo body: reconsulta a cobrança na Sicredi.
 * Em produção, termine mTLS no proxy (ver AGENTS.md).
 */
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!payload) return NextResponse.json({ ok: true })

  const pixArr = Array.isArray(payload.pix)
    ? (payload.pix as Array<Record<string, unknown>>)
    : []
  if (pixArr.length === 0) return NextResponse.json({ ok: true })

  const config = await getSicrediConfig()
  if (!config) {
    console.warn('[webhook/sicredi] configuração Sicredi ausente — ignorando payload')
    return NextResponse.json({ ok: true })
  }

  const supabase = getAppSupabase()

  for (const pix of pixArr) {
    const txid = String(pix.txid ?? '')
    if (!txid) continue

    const { data: row } = await supabase
      .from('pagamentos_online')
      .select('id,lancamento_id,status')
      .eq('gateway', 'sicredi')
      .eq('gateway_id', txid)
      .maybeSingle()
    if (!row) continue

    // Auditoria do payload bruto (sem aplicar status ainda).
    await supabase
      .from('pagamentos_online')
      .update({ webhook_payload: payload, updated_at: new Date().toISOString() })
      .eq('id', row.id)

    const resolved = await consultarPix(config, txid)
    if (!resolved?.pago) continue

    const pagoEm = resolved.pago_em ?? (pix.horario ? String(pix.horario) : new Date().toISOString())
    await supabase
      .from('pagamentos_online')
      .update({
        status: 'capturado',
        pago_em: pagoEm,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (row.lancamento_id) {
      await supabase
        .from('financeiro_lancamentos')
        .update({ status: 'Pago', updated_at: new Date().toISOString() })
        .eq('id', row.lancamento_id)
    }
  }

  return NextResponse.json({ ok: true })
}
