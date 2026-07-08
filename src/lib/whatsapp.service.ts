import { getAppSupabase } from '@/lib/app-api'

export interface EvolutionConfig {
  baseUrl: string
  apiKey: string
  instance: string
  lembreteAtivo: boolean
  posConsultaAtivo: boolean
  aniversarioAtivo: boolean
  lembreteHorasAntes: number
  posConsultaHorasApos: number
  templateLembrete: string
  templatePosConsulta: string
  templateAniversario: string
}

export interface SendResult {
  success: boolean
  error?: string
}

export function normalizeTelefone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length === 11 || digits.length === 10) return `55${digits}`
  if (digits.length === 13 && digits.startsWith('55')) return digits
  return `55${digits}`
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  )
}

export async function getWhatsappConfig(): Promise<EvolutionConfig | null> {
  const supabase = getAppSupabase()
  const { data, error } = await supabase
    .from('configuracoes')
    .select('chave,valor')
    .eq('categoria', 'whatsapp')

  if (error || !data?.length) return null

  const map: Record<string, string> = {}
  for (const row of data) {
    map[row.chave] = row.valor ?? ''
  }

  if (map['whatsapp.ativo'] !== 'true') return null

  const baseUrl = map['whatsapp.base_url']?.trim()
  const apiKey = map['whatsapp.api_key']?.trim()
  const instance = map['whatsapp.instance']?.trim()

  if (!baseUrl || !apiKey || !instance) return null

  return {
    baseUrl,
    apiKey,
    instance,
    lembreteAtivo: map['whatsapp.lembrete_ativo'] !== 'false',
    posConsultaAtivo: map['whatsapp.pos_consulta_ativo'] !== 'false',
    aniversarioAtivo: map['whatsapp.aniversario_ativo'] !== 'false',
    lembreteHorasAntes: Number(map['whatsapp.lembrete_horas_antes'] ?? '24'),
    posConsultaHorasApos: Number(map['whatsapp.pos_consulta_horas_apos'] ?? '2'),
    templateLembrete:
      map['whatsapp.template_lembrete'] ??
      'Olá {paciente}! Lembrando da sua consulta com {especialista} no dia {data} às {hora}. Até logo!',
    templatePosConsulta:
      map['whatsapp.template_pos_consulta'] ??
      'Olá {paciente}! Esperamos que sua consulta com {especialista} tenha sido ótima. Qualquer dúvida estamos à disposição!',
    templateAniversario:
      map['whatsapp.template_aniversario'] ??
      'Feliz aniversário, {paciente}! 🎉 Toda a equipe deseja um dia especial para você!',
  }
}

export async function sendWhatsappMessage(
  config: EvolutionConfig,
  telefone: string,
  mensagem: string,
): Promise<SendResult> {
  const number = normalizeTelefone(telefone)
  const url = `${config.baseUrl.replace(/\/$/, '')}/message/sendText/${config.instance}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.apiKey,
      },
      body: JSON.stringify({ number, text: mensagem }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { success: false, error: `HTTP ${response.status}: ${body.slice(0, 200)}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
