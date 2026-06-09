import { NextResponse, type NextRequest } from 'next/server'
import { getAppSupabase, serverErrorResponse, supabaseErrorResponse } from '@/lib/app-api'
import { requirePermission } from '@/lib/authz'
import { mapEstoqueItem } from '@/lib/domain-mappers'
import { authErrorResponse, getRequestAuth, getScopedUnitId } from '@/lib/request-auth'

// SCOPED UNIT — `getScopedUnitId` agora vem centralizado de `request-auth.ts`
// (Agente 20, 2026-05-21). Substitui a convenção anterior "helper por rota"
// registrada em CR-ESTQ-01 (2026-05-19): após o CR-AUTH-01 embarcar
// `unidadeId` no JWT, o helper local virou pura duplicação. A versão
// centralizada usa caminho rápido via JWT + fallback à query para tokens
// antigos. Outros endpoints (`getScopedAgendaContext` em agenda/route.ts)
// continuam locais porque retornam mais que `unidadeId`.

async function listEstoque(request: NextRequest, session: Awaited<ReturnType<typeof getRequestAuth>>) {
  const supabase = getAppSupabase()
  const scopedUnit = await getScopedUnitId(session)
  if (scopedUnit.error) {
    return supabaseErrorResponse(scopedUnit.error, 'Falha ao carregar estoque')
  }

  let query = supabase
    .from('produtos_estoque')
    .select('id,nome,categoria,quantidade,estoque_minimo,lote,validade,preco_custo,preco_venda,status,unidade_id')
    .order('nome', { ascending: true })

  if (scopedUnit.unidadeId) {
    query = query.eq('unidade_id', scopedUnit.unidadeId)
  } else if (session && ['master', 'admin'].includes(session.role)) {
    const filtroUnidade = new URL(request.url).searchParams.get('unidade_id')
    if (filtroUnidade && filtroUnidade.trim() !== '') {
      query = query.eq('unidade_id', filtroUnidade.trim())
    }
  }

  const { data, error } = await query

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar estoque')
  }

  return NextResponse.json({
    data: (data ?? []).map((row) => mapEstoqueItem(row)),
    meta: session,
  })
}

// PostgREST devolve a relação embarcada ora como objeto (FK 1:1 com unique)
// ora como array (multi-row). `pickJoinedName` cobre os dois — `JoinedName`
// é o alias usado nos campos joinados pra não duplicar o union em cada row.
type JoinedName = { nome: string | null } | { nome: string | null }[] | null

type MovimentacaoRow = {
  id: string
  produto_id: string
  usuario_id: string | null
  tipo: string
  tipo_movimentacao: string | null
  quantidade: number | null
  observacoes: string | null
  vinculo_tipo: string | null
  vinculo_nome: string | null
  created_at: string | null
  estornada: boolean | null
  produtos_estoque?: JoinedName
  usuarios?: JoinedName
}

function pickJoinedName(value: unknown): string {
  if (!value) return ''
  if (Array.isArray(value)) {
    const first = value[0] as { nome?: string | null } | undefined
    return first?.nome ? String(first.nome) : ''
  }
  const obj = value as { nome?: string | null }
  return obj?.nome ? String(obj.nome) : ''
}

async function listMovimentacoes(
  request: NextRequest,
  session: Awaited<ReturnType<typeof getRequestAuth>>,
) {
  const url = new URL(request.url)
  const tipo = url.searchParams.get('tipo')
  const produtoId = url.searchParams.get('produto_id')
  const de = url.searchParams.get('de')
  const ate = url.searchParams.get('ate')
  const limitParam = Number(url.searchParams.get('limit') ?? '100')
  const offsetParam = Number(url.searchParams.get('offset') ?? '0')
  const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 500 ? Math.floor(limitParam) : 100
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? Math.floor(offsetParam) : 0

  const supabase = getAppSupabase()

  let countQuery = supabase
    .from('movimentacoes_estoque')
    .select('id', { count: 'exact', head: true })
  if (tipo === 'entrada' || tipo === 'saida') countQuery = countQuery.eq('tipo', tipo)
  if (tipo === 'consumo_interno') countQuery = countQuery.eq('tipo_movimentacao', 'consumo_interno')
  if (produtoId) countQuery = countQuery.eq('produto_id', produtoId)
  if (de) countQuery = countQuery.gte('created_at', de)
  if (ate) countQuery = countQuery.lte('created_at', `${ate}T23:59:59.999Z`)
  const countResult = await countQuery

  if (countResult.error) {
    return supabaseErrorResponse(countResult.error, 'Falha ao contar movimentações')
  }

  let query = supabase
    .from('movimentacoes_estoque')
    .select(
      'id,produto_id,usuario_id,tipo,tipo_movimentacao,quantidade,observacoes,vinculo_tipo,vinculo_nome,created_at,estornada,produtos_estoque(nome),usuarios!usuario_id(nome)',
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tipo === 'entrada' || tipo === 'saida') query = query.eq('tipo', tipo)
  if (tipo === 'consumo_interno') query = query.eq('tipo_movimentacao', 'consumo_interno')
  if (produtoId) query = query.eq('produto_id', produtoId)
  if (de) query = query.gte('created_at', de)
  if (ate) query = query.lte('created_at', `${ate}T23:59:59.999Z`)

  const { data, error } = await query

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao carregar movimentações')
  }

  const items = ((data ?? []) as MovimentacaoRow[]).map((row) => ({
    id: String(row.id),
    produtoId: String(row.produto_id ?? ''),
    produtoNome: pickJoinedName(row.produtos_estoque),
    operadorNome: pickJoinedName(row.usuarios),
    tipo: row.tipo === 'entrada' ? 'entrada' : 'saida',
    tipoMovimentacao: String(row.tipo_movimentacao ?? row.tipo ?? 'saida'),
    quantidade: Number(row.quantidade ?? 0),
    observacoes: row.observacoes ? String(row.observacoes) : null,
    vinculoTipo: row.vinculo_tipo ? String(row.vinculo_tipo) : null,
    vinculoNome: row.vinculo_nome ? String(row.vinculo_nome) : null,
    criadoEm: row.created_at ? String(row.created_at) : '',
    estornada: Boolean(row.estornada),
  }))

  return NextResponse.json({
    data: items,
    meta: {
      total: countResult.count ?? 0,
      limit,
      offset,
      filtros: { tipo, produtoId, de, ate },
    },
  })
}

export async function GET(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'estoque', 'read')
  if (denied) return denied

  const url = new URL(request.url)
  if (url.searchParams.get('view') === 'movimentacoes') {
    return listMovimentacoes(request, session)
  }

  return listEstoque(request, session)
}

export async function POST(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'estoque', 'create')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const action = body?.action ? String(body.action) : null
  const supabase = getAppSupabase()

  if (action === 'estornar') {
    const movimentacaoId = typeof body?.movimentacaoId === 'string' ? body.movimentacaoId : null
    const motivo = typeof body?.motivo === 'string' ? body.motivo.trim() : ''
    if (!movimentacaoId) {
      return serverErrorResponse('Movimentação inválida', 'INVALID_MOV_ID', 400)
    }
    if (motivo.length < 10) {
      return serverErrorResponse('Motivo do estorno deve ter ao menos 10 caracteres', 'INVALID_ESTORNO_MOTIVO', 400)
    }

    const { data: original, error: origError } = await supabase
      .from('movimentacoes_estoque')
      .select('id,produto_id,tipo,quantidade,estornada')
      .eq('id', movimentacaoId)
      .maybeSingle()

    if (origError) return supabaseErrorResponse(origError, 'Falha ao localizar movimentação')
    if (!original) return serverErrorResponse('Movimentação não encontrada', 'MOV_NOT_FOUND', 404)
    if (original.estornada) {
      return serverErrorResponse('Movimentação já foi estornada', 'MOV_ALREADY_REVERSED', 409)
    }

    const quantidade = Number(original.quantidade ?? 0)
    const tipoOriginal = original.tipo === 'entrada' ? 'entrada' : 'saida'
    const tipoCompensatorio = tipoOriginal === 'entrada' ? 'saida' : 'entrada'

    const { data: produtoRow, error: produtoError } = await supabase
      .from('produtos_estoque')
      .select('quantidade,unidade_id')
      .eq('id', String(original.produto_id))
      .maybeSingle()
    if (produtoError) return supabaseErrorResponse(produtoError, 'Falha ao carregar produto')
    const quantidadeAtual = Number(produtoRow?.quantidade ?? 0)
    const unidadeIdEstorno = produtoRow?.unidade_id ? String(produtoRow.unidade_id) : null
    const novaQuantidade =
      tipoCompensatorio === 'entrada' ? quantidadeAtual + quantidade : quantidadeAtual - quantidade

    if (novaQuantidade < 0) {
      return serverErrorResponse('Estoque insuficiente para estornar a movimentação', 'INSUFFICIENT_STOCK_FOR_REVERSAL', 400)
    }

    const nowIso = new Date().toISOString()

    const { error: updOrigError } = await supabase
      .from('movimentacoes_estoque')
      .update({
        estornada: true,
        estorno_motivo: motivo,
        estornada_em: nowIso,
        estorno_por: session.userId,
      })
      .eq('id', movimentacaoId)
    if (updOrigError) return supabaseErrorResponse(updOrigError, 'Falha ao marcar estorno')

    const { error: compError } = await supabase.from('movimentacoes_estoque').insert({
      produto_id: String(original.produto_id),
      usuario_id: session.userId,
      tipo: tipoCompensatorio,
      tipo_movimentacao: tipoCompensatorio,
      quantidade,
      observacoes: `Estorno: ${motivo}`,
      movimentacao_origem_id: movimentacaoId,
      unidade_id: unidadeIdEstorno,
    })
    if (compError) return supabaseErrorResponse(compError, 'Falha ao registrar movimentação compensatória')

    const { error: prodUpdError } = await supabase
      .from('produtos_estoque')
      .update({ quantidade: novaQuantidade, updated_at: nowIso })
      .eq('id', String(original.produto_id))
    if (prodUpdError) return supabaseErrorResponse(prodUpdError, 'Falha ao ajustar estoque')

    return listEstoque(request, session)
  }

  if (action === 'entrada' || action === 'saida') {
    if (!body?.produtoId || !body?.quantidade) {
      return serverErrorResponse('Movimentação inválida', 'INVALID_STOCK_MOVEMENT', 400)
    }

    const quantidade = Number(body.quantidade)
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return serverErrorResponse('Quantidade inválida', 'INVALID_STOCK_MOVEMENT', 400)
    }

    const { data: produtoAtual, error: produtoError } = await supabase
      .from('produtos_estoque')
      .select('quantidade,unidade_id')
      .eq('id', String(body.produtoId))
      .maybeSingle()

    if (produtoError) {
      return supabaseErrorResponse(produtoError, 'Falha ao carregar produto')
    }

    const quantidadeAtual = Number(produtoAtual?.quantidade ?? 0)
    const unidadeIdMov = produtoAtual?.unidade_id ? String(produtoAtual.unidade_id) : null
    const novaQuantidade = action === 'entrada' ? quantidadeAtual + quantidade : quantidadeAtual - quantidade

    if (novaQuantidade < 0) {
      return serverErrorResponse('Quantidade indisponível para saída', 'INVALID_STOCK_MOVEMENT', 400)
    }

    const allowedVinculoTipos = ['cliente', 'especialista', 'fornecedor'] as const
    const vinculoTipoRaw = typeof body.vinculoTipo === 'string' ? body.vinculoTipo : null
    const vinculoTipo = allowedVinculoTipos.includes(vinculoTipoRaw as (typeof allowedVinculoTipos)[number])
      ? vinculoTipoRaw
      : null
    const vinculoId =
      vinculoTipo && vinculoTipo !== 'fornecedor' && typeof body.vinculoId === 'string' && body.vinculoId.trim().length > 0
        ? body.vinculoId.trim()
        : null
    const vinculoNome =
      vinculoTipo && typeof body.vinculoNome === 'string' && body.vinculoNome.trim().length > 0
        ? body.vinculoNome.trim()
        : null

    const tipoMovimentacaoRaw =
      typeof body.tipoMovimentacao === 'string' ? body.tipoMovimentacao : null
    const tipoMovimentacao =
      action === 'entrada'
        ? 'entrada'
        : tipoMovimentacaoRaw === 'consumo_interno'
          ? 'consumo_interno'
          : 'saida'

    const numeroNf =
      action === 'entrada' && typeof body.numeroNf === 'string' ? body.numeroNf.trim() || null : null
    const cnpjEmitente =
      action === 'entrada' && typeof body.cnpjEmitente === 'string'
        ? body.cnpjEmitente.replace(/\D/g, '') || null
        : null
    const force = body.force === true

    if (action === 'entrada' && numeroNf && cnpjEmitente && !force) {
      const { data: existente, error: existenteError } = await supabase
        .from('movimentacoes_estoque')
        .select('id, created_at')
        .eq('numero_nf', numeroNf)
        .eq('cnpj_emitente', cnpjEmitente)
        .maybeSingle()

      if (existenteError && existenteError.code !== 'PGRST116') {
        return supabaseErrorResponse(existenteError, 'Falha ao verificar duplicidade de NF')
      }

      if (existente) {
        const importadaEm = existente.created_at
          ? new Date(existente.created_at).toLocaleDateString('pt-BR')
          : 'data desconhecida'
        return serverErrorResponse(
          `NF ${numeroNf} deste fornecedor já foi importada em ${importadaEm}`,
          'NF_DUPLICADA',
          409,
        )
      }
    }

    const { error: movimentoError } = await supabase.from('movimentacoes_estoque').insert({
      produto_id: String(body.produtoId),
      usuario_id: session.userId,
      tipo: action === 'entrada' ? 'entrada' : 'saida',
      tipo_movimentacao: tipoMovimentacao,
      quantidade,
      observacoes: body.observacoes ?? null,
      vinculo_tipo: vinculoTipo,
      vinculo_id: vinculoId,
      vinculo_nome: vinculoNome,
      numero_nf: numeroNf,
      cnpj_emitente: cnpjEmitente,
      unidade_id: unidadeIdMov,
    })

    if (movimentoError) {
      return supabaseErrorResponse(movimentoError, 'Falha ao registrar movimentação de estoque')
    }

    const { error: updateError } = await supabase
      .from('produtos_estoque')
      .update({
        quantidade: novaQuantidade,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(body.produtoId))

    if (updateError) {
      return supabaseErrorResponse(updateError, 'Falha ao atualizar estoque')
    }

    return listEstoque(request, session)
  }

  if (!body?.produto || !body?.categoria) {
    return serverErrorResponse('Produto inválido', 'INVALID_STOCK_ITEM', 400)
  }

  const scopedUnitCreate = await getScopedUnitId(session)
  if (scopedUnitCreate.error) {
    return supabaseErrorResponse(scopedUnitCreate.error, 'Falha ao cadastrar produto')
  }

  const { error } = await supabase.from('produtos_estoque').insert({
    nome: body.produto,
    categoria: body.categoria,
    quantidade: Number(body.quantidade ?? 0),
    status: body.status ?? 'Disponível',
    unidade_id: scopedUnitCreate.unidadeId ?? body.unidadeId ?? null,
  })

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao cadastrar produto')
  }

  return listEstoque(request, session)
}

export async function PUT(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'estoque', 'update')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id || !body?.produto || !body?.categoria) {
    return serverErrorResponse('Produto inválido', 'INVALID_STOCK_ITEM', 400)
  }

  const supabase = getAppSupabase()
  const scopedUnitUpdate = await getScopedUnitId(session)
  if (scopedUnitUpdate.error) {
    return supabaseErrorResponse(scopedUnitUpdate.error, 'Falha ao atualizar produto')
  }

  const { error } = await supabase
    .from('produtos_estoque')
    .update({
      nome: body.produto,
      categoria: body.categoria,
      quantidade: Number(body.quantidade ?? 0),
      status: body.status ?? 'Disponível',
      unidade_id: scopedUnitUpdate.unidadeId ?? body.unidadeId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(body.id))

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao atualizar produto')
  }

  return listEstoque(request, session)
}

export async function DELETE(request: NextRequest) {
  const session = await getRequestAuth(request)
  if (!session) {
    return authErrorResponse()
  }
  const denied = await requirePermission(session.userId, 'estoque', 'delete')
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.id) {
    return serverErrorResponse('Produto inválido', 'INVALID_STOCK_ITEM', 400)
  }

  const supabase = getAppSupabase()
  const { error } = await supabase.from('produtos_estoque').delete().eq('id', String(body.id))

  if (error) {
    return supabaseErrorResponse(error, 'Falha ao excluir produto')
  }

  return listEstoque(request, session)
}
