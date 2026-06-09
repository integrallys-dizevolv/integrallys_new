import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase } from '@/lib/app-api'

/**
 * Webhook Pix Sicredi — padrão BACEN (TAREFA-FIN-01). Sem autenticação de
 * sessão. Payload: `{ pix: [{ txid, valor, horario }] }`.
 *
 * Limitação: o BACEN exige mTLS (certificado mútuo) na entrega do webhook;
 * `fetch`/Next não valida o certificado do cliente aqui — em produção é
 * necessário terminação mTLS num proxy à frente desta rota (documentado no
 * README). Responde 200 sempre.
 */
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!payload) return NextResponse.json({ ok: true })

  const pixArr = Array.isArray(payload.pix)
    ? (payload.pix as Array<Record<string, unknown>>)
    : []
  if (pixArr.length === 0) return NextResponse.json({ ok: true })

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

    const pagoEm = pix.horario ? String(pix.horario) : new Date().toISOString()
    await supabase
      .from('pagamentos_online')
      .update({
        status: 'capturado',
        pago_em: pagoEm,
        webhook_payload: payload,
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
