import { type NextRequest, NextResponse } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

// Item 9d — EXIBIÇÃO PURA: lançamentos do Financeiro vinculados a uma conta
// bancária (financeiro_lancamentos.conta_bancaria_id, preenchido a partir do 9b).
// Só leitura — NÃO soma, NÃO recalcula saldo, NÃO toca na conciliação OFX. Serve
// apenas para dar visibilidade no extrato da conta.
export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) return authErrorResponse()
  const denied = await requirePermission(session.userId, 'gestao-bancaria', 'read')
  if (denied) return denied

  const contaId = request.nextUrl.searchParams.get('contaId')
  if (!contaId) {
    return serverErrorResponse('Conta não informada', 'CONTA_ID_REQUIRED', 400)
  }

  // SEC (IDOR): aplica o MESMO escopo de unidade do /api/financeiro. Sem isso, um
  // usuário escopado (gestor/recepção) poderia passar um contaId de outra unidade
  // e ler os lançamentos dela. Escopado → só a própria unidade; master/admin
  // (unidadeId null) → tudo, coerente com o privilégio de Gestão Bancária.
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao identificar unidade')
  }

  const supabase = getAppSupabase()
  let query = supabase
    .from('financeiro_lancamentos')
    .select('id,descricao,categoria,valor,tipo,data_lancamento,metodo,status,beneficiario')
    .eq('conta_bancaria_id', contaId)
    .order('data_lancamento', { ascending: false })

  if (scopedUnit.unidadeId) {
    query = query.eq('unidade_id', scopedUnit.unidadeId)
  }

  const { data, error } = await query

  if (error) return supabaseErrorResponse(error, 'Falha ao carregar lançamentos da conta')

  return NextResponse.json({ data: data ?? [], meta: session })
}
