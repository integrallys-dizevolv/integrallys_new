import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContextoVariaveis } from './types'

export interface CarregarContextoInput {
  supabase: SupabaseClient
  unidadeId: string | null
  pacienteId?: string | null
  agendamentoId?: string | null
  profissionalId?: string | null
  /**
   * Carrega ctx.repasse (regra ativa do profissional) para as variáveis
   * #REPASSE_*# — usado ao gerar um contrato de parceria (item 7c). Fica
   * desligado por padrão para não onerar a geração de documentos clínicos.
   */
  incluirRepasse?: boolean
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function combineDateTime(data: string | null, horario: string | null): string | null {
  if (!data) return null
  const time = horario && /^\d{2}:\d{2}/.test(horario) ? horario.slice(0, 5) : '00:00'
  return `${data}T${time}:00`
}

export async function carregarContexto({
  supabase,
  unidadeId,
  pacienteId,
  agendamentoId,
  profissionalId,
  incluirRepasse = false,
}: CarregarContextoInput): Promise<ContextoVariaveis> {
  const ctx: ContextoVariaveis = { agora: new Date() }

  const [clinicaRes, legacyClinicaRes, pacienteRes, agendamentoRes, profissionalRes] = await Promise.all([
    unidadeId
      ? supabase
          .from('clinica_config')
          .select('nome,cidade_uf,endereco,cep,telefone')
          .eq('unidade_id', unidadeId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    // Fallback para a estrutura legada de `public.configuracoes`
    // (categoria='clinica') enquanto nem todos os campos foram migrados
    // para `clinica_config`. O merge prefere `clinica_config` quando há
    // valor definido e cai para as chaves legadas quando vazio.
    supabase
      .from('configuracoes')
      .select('chave,valor')
      .eq('categoria', 'clinica'),
    pacienteId
      ? supabase
          .from('pacientes')
          .select('nome,cpf')
          .eq('id', pacienteId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    agendamentoId
      ? supabase
          .from('agendamentos')
          .select('data_agendamento,horario_inicio,profissional_id,paciente_id')
          .eq('id', agendamentoId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    profissionalId
      ? supabase
          .from('usuarios')
          .select('nome,conselho,cpf,rg,endereco,estado_civil')
          .eq('id', profissionalId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const legacy = new Map<string, string>(
    (legacyClinicaRes.data ?? []).map((row: { chave: string; valor: string | null }) => [
      row.chave,
      row.valor ?? '',
    ]),
  )

  const pickLegacy = (...keys: string[]) => {
    for (const key of keys) {
      const value = legacy.get(key)
      if (value && value.trim() !== '') return value
    }
    return ''
  }

  ctx.clinica = {
    nome: clinicaRes.data?.nome || pickLegacy('clinica_nome_fantasia', 'clinica_razao_social'),
    cidade_uf: clinicaRes.data?.cidade_uf || '',
    endereco: clinicaRes.data?.endereco || pickLegacy('clinica_endereco'),
    cep: clinicaRes.data?.cep || '',
    telefone: clinicaRes.data?.telefone || pickLegacy('clinica_telefone'),
  }

  if (pacienteRes.data) {
    ctx.cliente = {
      nome: pacienteRes.data.nome ?? '',
      cpf: pacienteRes.data.cpf ?? '',
    }
  }

  if (agendamentoRes.data) {
    const iso = combineDateTime(agendamentoRes.data.data_agendamento, agendamentoRes.data.horario_inicio)
    ctx.agendamento = { data_hora: iso }

    // Se não veio profissionalId explícito mas o agendamento tem um, carrega
    if (!profissionalId && agendamentoRes.data.profissional_id && !profissionalRes.data) {
      const { data: prof } = await supabase
        .from('usuarios')
        .select('nome,conselho,cpf,rg,endereco,estado_civil')
        .eq('id', agendamentoRes.data.profissional_id)
        .maybeSingle()
      if (prof) {
        ctx.profissional = {
          nome: prof.nome ?? '',
          conselho: prof.conselho ?? null,
          cpf: prof.cpf ?? null,
          rg: prof.rg ?? null,
          endereco: prof.endereco ?? null,
          estado_civil: prof.estado_civil ?? null,
        }
      }
    }
  }

  if (profissionalRes.data && !ctx.profissional) {
    ctx.profissional = {
      nome: profissionalRes.data.nome ?? '',
      conselho: profissionalRes.data.conselho ?? null,
      cpf: profissionalRes.data.cpf ?? null,
      rg: profissionalRes.data.rg ?? null,
      endereco: profissionalRes.data.endereco ?? null,
      estado_civil: profissionalRes.data.estado_civil ?? null,
    }
  }

  // Repasse (item 7c) — só quando explicitamente pedido (contrato de parceria).
  // Pega a regra ativa mais recente do profissional. rg/endereco/estado_civil do
  // profissional entram junto com a migration do item 7d (colunas ainda não existem).
  if (incluirRepasse && profissionalId) {
    const { data: regra } = await supabase
      .from('regras_repasse')
      .select('percentual,valor_fixo')
      .eq('profissional_id', profissionalId)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (regra) {
      ctx.repasse = {
        percentual: regra.percentual != null ? Number(regra.percentual) : null,
        valor_fixo: regra.valor_fixo != null ? Number(regra.valor_fixo) : null,
      }
    }
  }

  return ctx
}
