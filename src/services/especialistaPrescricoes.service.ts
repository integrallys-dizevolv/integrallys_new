interface ApiListResponse<T> {
  data: T[]
}

interface ApiErrorResponse {
  error?: string
}

interface PrescricaoApiItem {
  id: string
  pacienteId?: string
  numero?: string
  paciente: string
  valorTotal: number
  status: string
  data?: string
  tipo?: string
  validade?: string
  observacoes?: string
}

interface PacienteApiItem {
  id: string
  nome: string
}

export interface PrescricaoProduto {
  id: string
  nome: string
  quantidade: number
  posologia?: string
}

export interface PrescricaoAtiva {
  id: string
  paciente: string
  data?: string
  tipo?: 'normal' | 'complementar'
  observacao?: string
  produtos: PrescricaoProduto[]
}

interface PrescricaoComplementarItem {
  nome: string
  quantidade: number
  valorUnitario: number
  posologia: string
}

function formatApiError(status: number, fallback: string) {
  return async (response: Response) => {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse
    throw new Error(payload.error ?? `${fallback} (${status}).`)
  }
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
  })

  if (!response.ok) {
    await formatApiError(response.status, 'Falha ao processar requisição')(response)
  }

  return response.json() as Promise<T>
}

function toApiDate(value?: string) {
  if (!value) return undefined
  const parts = value.split('/')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return value
}

async function getPrescricaoById(prescricaoId: string) {
  const payload = await fetchJson<ApiListResponse<PrescricaoApiItem>>('/api/prescricoes', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  const prescricao = payload.data.find((item) => item.id === prescricaoId)
  if (!prescricao?.pacienteId) {
    throw new Error('Não foi possível localizar os dados da prescrição selecionada.')
  }

  return prescricao
}

async function getPacienteIdByName(nomePaciente: string) {
  const payload = await fetchJson<ApiListResponse<PacienteApiItem>>('/api/pacientes', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  const normalized = nomePaciente.trim().toLowerCase()
  const paciente = payload.data.find((item) => item.nome.trim().toLowerCase() === normalized)

  if (!paciente?.id) {
    throw new Error('Não foi possível localizar o paciente para criar a prescrição complementar.')
  }

  return paciente.id
}

/**
 * Salva o ajuste de posologia de uma prescrição existente.
 * Chama PUT /api/prescricoes com os produtos atualizados.
 */
export async function salvarAjustePosologia(
  prescricaoId: string,
  produtos: PrescricaoProduto[],
  observacao: string,
): Promise<{ ok: boolean }> {
  const prescricaoAtual = await getPrescricaoById(prescricaoId)

  const response = await fetch('/api/prescricoes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      id: prescricaoId,
      pacienteId: prescricaoAtual.pacienteId,
      numero: prescricaoAtual.numero,
      valorTotal: prescricaoAtual.valorTotal,
      status: prescricaoAtual.status,
      tipo: prescricaoAtual.tipo,
      data: toApiDate(prescricaoAtual.data),
      validade: toApiDate(prescricaoAtual.validade),
      observacoes: observacao,
      produtos,
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse
    throw new Error(payload.error ?? `Falha ao salvar ajuste de posologia (${response.status}).`)
  }

  return { ok: true }
}

/**
 * Cria uma prescrição complementar para um paciente.
 * Chama POST /api/prescricoes com os itens e forma de pagamento.
 */
export async function salvarPrescricaoComplementar(
  paciente: string,
  itens: PrescricaoComplementarItem[],
  formaPagamento: string,
): Promise<{ ok: boolean }> {
  const pacienteId = await getPacienteIdByName(paciente)
  const valorTotal = itens.reduce((total, item) => total + (item.quantidade * item.valorUnitario), 0)

  const response = await fetch('/api/prescricoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      pacienteId,
      valorTotal,
      status: formaPagamento === 'consumo' ? 'Quitado' : 'Pendente',
      tipo: 'complementar',
      observacoes: `Forma de pagamento: ${formaPagamento}`,
      itens,
      formaPagamento,
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse
    throw new Error(payload.error ?? `Falha ao salvar prescrição complementar (${response.status}).`)
  }

  return { ok: true }
}
