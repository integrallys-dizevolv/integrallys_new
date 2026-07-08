import type { TemplateConteudo } from '@/lib/documentos'

/**
 * Valores preenchidos pelo usuário, indexados por posição da seção.
 * Cada valor varia conforme o tipo da seção correspondente:
 * - campo_data / campo_texto / campo_texto_longo / campo_numero → string
 * - checklist → Record<itemIndex, { sim: boolean; obs: string }>
 * - checkbox_lista → number[]  (índices dos itens marcados)
 * - checkbox_grupo → number[]  (índices das opções selecionadas — suporta múltipla)
 * - paragrafo → não recebe valor do usuário
 */
export type ValorCampoSimples = string
export type ValorChecklist = Record<number, { sim: boolean; obs: string }>
export type ValorCheckboxLista = number[]
export type ValorCheckboxGrupo = number[]

export type ValorSecao =
  | ValorCampoSimples
  | ValorChecklist
  | ValorCheckboxLista
  | ValorCheckboxGrupo

export type ValoresForm = Record<number, ValorSecao>

export interface PreenchimentoContexto {
  cliente?: { nome?: string; cpf?: string }
  agendamento?: { data_hora?: string | Date | null }
  profissional?: { nome?: string; conselho?: string | null }
  clinica?: {
    nome?: string
    cidade_uf?: string
    endereco?: string
    cep?: string
    telefone?: string
    logo_url?: string | null
    cor_primaria?: string
  }
}

/**
 * Serialização do conteúdo preenchido para persistência:
 * cada seção do template recebe o campo `valor` correspondente.
 */
export interface SecaoPreenchida {
  // preserva todas as chaves originais da seção do template
  [key: string]: unknown
  valor?: unknown
}

export interface ConteudoPreenchido extends Omit<TemplateConteudo, 'secoes'> {
  secoes: SecaoPreenchida[]
}
