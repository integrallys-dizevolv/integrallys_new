// Validação e formatação dos documentos brasileiros coletados no Integrallys:
// CPF, CNPJ (numérico e alfanumérico), CEP e telefone.
//
// Regra de ouro deste módulo: lógica pura, sem dependência de React, de rede ou
// do Supabase — para poder ser usada igualmente no front (máscara/feedback) e
// nas rotas de API (validação de payload).

/** Remove tudo que não é dígito. */
function digitos(valor: string): string {
  return (valor ?? '').replace(/\D/g, '')
}

/** true quando a string inteira é a repetição de um único caractere ("00000000000"). */
function caractereRepetido(valor: string): boolean {
  return valor.length > 0 && /^(.)\1*$/.test(valor)
}

/**
 * Módulo 11 usado tanto no CPF quanto no CNPJ: soma ponderada, resto da divisão
 * por 11 e, quando o resto é 0 ou 1, o dígito verificador é 0.
 */
function digitoModulo11(valores: number[], pesos: number[]): number {
  const soma = valores.reduce((acc, valor, i) => acc + valor * pesos[i], 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

// ---------------------------------------------------------------------------
// CPF
// ---------------------------------------------------------------------------

const PESOS_CPF_DV1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_CPF_DV2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]

/**
 * Valida CPF pelo cálculo real dos dois dígitos verificadores (módulo 11).
 *
 * Rejeita explicitamente os CPF de dígitos repetidos: `111.111.111-11` satisfaz
 * o módulo 11 (DV1 = 1, DV2 = 1) e passaria numa validação apenas de formato,
 * mas não é um CPF válido.
 */
export function validarCPF(valor: string): boolean {
  const cpf = digitos(valor)
  if (cpf.length !== 11) return false
  if (caractereRepetido(cpf)) return false

  const numeros = cpf.split('').map(Number)
  const dv1 = digitoModulo11(numeros.slice(0, 9), PESOS_CPF_DV1)
  if (dv1 !== numeros[9]) return false

  const dv2 = digitoModulo11(numeros.slice(0, 10), PESOS_CPF_DV2)
  return dv2 === numeros[10]
}

/** Aplica a máscara `000.000.000-00` progressivamente, conforme o usuário digita. */
export function formatarCPF(valor: string): string {
  const cpf = digitos(valor).slice(0, 11)
  let saida = cpf.slice(0, 3)
  if (cpf.length > 3) saida += `.${cpf.slice(3, 6)}`
  if (cpf.length > 6) saida += `.${cpf.slice(6, 9)}`
  if (cpf.length > 9) saida += `-${cpf.slice(9, 11)}`
  return saida
}

// ---------------------------------------------------------------------------
// CNPJ — numérico (legado) e alfanumérico (Receita Federal, a partir de 07/2026)
// ---------------------------------------------------------------------------

// Pesos conforme o documento oficial "Cálculo dos dígitos verificadores de CNPJ
// alfanumérico" (Serpro / Nota Técnica COCAD/SUARA/RFB nº 49/2024). São os
// mesmos pesos do CNPJ numérico — o que muda é só a conversão do caractere.
const PESOS_CNPJ_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_CNPJ_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

const CNPJ_BASE_TAMANHO = 12
const CNPJ_TAMANHO = 14

/**
 * Valor de um caractere do CNPJ para o cálculo do DV: código ASCII menos 48.
 * Dígitos 0-9 valem 0-9; letras valem A=17, B=18 ... Z=42.
 */
function valorCaractereCnpj(caractere: string): number {
  return caractere.charCodeAt(0) - 48
}

/** Remove máscara e converte para maiúsculas, mantendo apenas 0-9 e A-Z. */
export function normalizarCNPJ(valor: string): string {
  return (valor ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')
}

/**
 * Valida CNPJ numérico ou alfanumérico pelo cálculo real dos dígitos
 * verificadores.
 *
 * Formato: 14 caracteres, sendo os 12 primeiros alfanuméricos (0-9 ou A-Z) e os
 * 2 últimos sempre numéricos. Os dois formatos coexistem — CNPJ numérico antigo
 * continua 100% válido.
 *
 * Rejeita explicitamente os CNPJ de caractere repetido: `00.000.000/0000-00`
 * satisfaz o módulo 11 (DV1 = 0, DV2 = 0) mas não é um CNPJ válido.
 */
export function validarCNPJ(valor: string): boolean {
  const cnpj = normalizarCNPJ(valor)
  if (cnpj.length !== CNPJ_TAMANHO) return false
  if (caractereRepetido(cnpj)) return false

  // Os dígitos verificadores nunca são letras, mesmo no CNPJ alfanumérico.
  const dvInformado = cnpj.slice(CNPJ_BASE_TAMANHO)
  if (!/^\d{2}$/.test(dvInformado)) return false

  const base = cnpj.slice(0, CNPJ_BASE_TAMANHO).split('').map(valorCaractereCnpj)

  const dv1 = digitoModulo11(base, PESOS_CNPJ_DV1)
  if (dv1 !== Number(dvInformado[0])) return false

  const dv2 = digitoModulo11([...base, dv1], PESOS_CNPJ_DV2)
  return dv2 === Number(dvInformado[1])
}

/**
 * Aplica a máscara `00.000.000/0000-00` progressivamente, aceitando letra
 * maiúscula nas 12 primeiras posições e apenas dígito nas 2 últimas.
 */
export function formatarCNPJ(valor: string): string {
  const limpo = normalizarCNPJ(valor)
  const base = limpo.slice(0, CNPJ_BASE_TAMANHO)
  const dv = limpo.slice(CNPJ_BASE_TAMANHO).replace(/\D/g, '').slice(0, 2)

  let saida = base.slice(0, 2)
  if (base.length > 2) saida += `.${base.slice(2, 5)}`
  if (base.length > 5) saida += `.${base.slice(5, 8)}`
  if (base.length > 8) saida += `/${base.slice(8, 12)}`
  if (dv) saida += `-${dv}`
  return saida
}

/** true quando o CNPJ é totalmente numérico (formato legado). */
export function isCNPJNumerico(valor: string): boolean {
  const cnpj = normalizarCNPJ(valor)
  return cnpj.length === CNPJ_TAMANHO && /^\d{14}$/.test(cnpj)
}

// ---------------------------------------------------------------------------
// CEP
// ---------------------------------------------------------------------------

/**
 * Valida o formato do CEP: exatamente 8 dígitos.
 *
 * Deliberadamente só valida formato. CEP não tem dígito verificador, então não
 * existe base matemática para recusar um CEP bem formado — quem sabe se ele
 * existe é o ViaCEP. Como esta função também é usada como trava de submit,
 * recusar aqui um CEP válido impediria um cadastro legítimo; já um CEP
 * inexistente apenas volta como "não encontrado" na consulta, sem travar nada.
 */
export function validarCEP(valor: string): boolean {
  return digitos(valor).length === 8
}

/** Aplica a máscara `00000-000` progressivamente. */
export function formatarCEP(valor: string): string {
  const cep = digitos(valor).slice(0, 8)
  if (cep.length <= 5) return cep
  return `${cep.slice(0, 5)}-${cep.slice(5, 8)}`
}

// ---------------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------------

// DDD efetivamente em uso no Brasil (os não atribuídos — 20, 23, 25, 26, 29,
// 30, 36, 39, 40, 50, 52, 56..60, 70, 72, 76, 78, 80, 90 — ficam de fora).
const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
])

/**
 * Valida telefone brasileiro: DDD existente + quantidade de dígitos correta.
 *
 * Celular tem 9 dígitos e começa com 9 (o nono dígito já é obrigatório em todo
 * o país); fixo tem 8 dígitos e começa de 2 a 5.
 */
export function validarTelefone(valor: string): boolean {
  const telefone = digitos(valor)
  if (telefone.length !== 10 && telefone.length !== 11) return false

  if (!DDDS_VALIDOS.has(Number(telefone.slice(0, 2)))) return false

  const numero = telefone.slice(2)
  if (numero.length === 9) return numero.startsWith('9')
  return /^[2-5]/.test(numero)
}

/** Aplica a máscara `(00) 00000-0000` / `(00) 0000-0000` progressivamente. */
export function formatarTelefone(valor: string): string {
  const telefone = digitos(valor).slice(0, 11)
  if (!telefone) return ''
  if (telefone.length < 2) return `(${telefone}`
  if (telefone.length === 2) return `(${telefone})`

  const ddd = telefone.slice(0, 2)
  const numero = telefone.slice(2)
  const corte = telefone.length === 11 ? 5 : 4
  const inicio = numero.slice(0, corte)
  const fim = numero.slice(corte)

  return fim ? `(${ddd}) ${inicio}-${fim}` : `(${ddd}) ${inicio}`
}
