/**
 * Tipos do cadastro de Fornecedores.
 *
 * Fornecedor é um `pacientes` com vinculo_tipo='fornecedor' acrescido dos dados
 * em `fornecedor_dados` (JSONB, migration 020) — NÃO existe tabela própria. A
 * tela é o análogo de Profissionais (079): recurso/endpoint/tela por feature
 * sobre uma tabela compartilhada filtrada por um discriminador.
 */

export interface FornecedorItem {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  status: string
  unidadeId: string | null
  razaoSocial: string | null
  cnpj: string | null
  inscricaoEstadual: string | null
  contatoNome: string | null
  contatoSetor: string | null
  categoriaDre: string | null
}

export interface FornecedorInput {
  id?: string
  nome: string
  telefone?: string | null
  email?: string | null
  status?: string
  razaoSocial?: string | null
  cnpj?: string | null
  inscricaoEstadual?: string | null
  contatoNome?: string | null
  contatoSetor?: string | null
  categoriaDre?: string | null
}
