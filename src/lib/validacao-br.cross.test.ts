import { describe, expect, it } from 'vitest'
import { validarCNPJ, validarCPF } from './validacao-br'

// Verificação cruzada (adversarial) da lógica de dígito verificador.
//
// `validacao-br.ts` usa arrays de pesos literais, transcritos do documento
// oficial. Aqui as mesmas regras são reimplementadas de forma independente —
// varrendo da direita para a esquerda com peso ciclando de 2 a 9 — e as duas
// implementações são comparadas sobre amostra pseudoaleatória determinística.
// Se um dos dois lados estiver errado, elas divergem.

const ALFANUMERICO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** PRNG determinístico (mulberry32) para a amostra ser reprodutível no CI. */
function prng(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Módulo 11 varrendo da direita para a esquerda, peso ciclando 2..9. */
function dvCiclico(valores: number[], maxPeso: number): number {
  let soma = 0
  let peso = 2
  for (let i = valores.length - 1; i >= 0; i--) {
    soma += valores[i] * peso
    peso = peso === maxPeso ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

function cnpjIndependente(valor: string): boolean {
  const s = valor.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (s.length !== 14) return false
  if (/^(.)\1{13}$/.test(s)) return false
  if (!/^\d{2}$/.test(s.slice(12))) return false
  const val = (c: string) => c.charCodeAt(0) - 48
  const dv1 = dvCiclico(s.slice(0, 12).split('').map(val), 9)
  if (dv1 !== Number(s[12])) return false
  const dv2 = dvCiclico(s.slice(0, 13).split('').map(val), 9)
  return dv2 === Number(s[13])
}

function cpfIndependente(valor: string): boolean {
  const s = valor.replace(/\D/g, '')
  if (s.length !== 11) return false
  if (/^(\d)\1{10}$/.test(s)) return false
  const num = s.split('').map(Number)
  const dv1 = dvCiclico(num.slice(0, 9), 10)
  if (dv1 !== num[9]) return false
  const dv2 = dvCiclico(num.slice(0, 10), 11)
  return dv2 === num[10]
}

/** Gera um CNPJ válido a partir de uma base, usando a implementação independente. */
function gerarCnpjValido(base: string): string {
  const val = (c: string) => c.charCodeAt(0) - 48
  const dv1 = dvCiclico(base.split('').map(val), 9)
  const dv2 = dvCiclico(`${base}${dv1}`.split('').map(val), 9)
  return `${base}${dv1}${dv2}`
}

describe('validarCNPJ — verificação cruzada', () => {
  it('aceita 2000 CNPJ alfanuméricos gerados e rejeita cada DV corrompido', () => {
    const rand = prng(20260731)
    const reprovados: string[] = []

    for (let i = 0; i < 2000; i++) {
      const alfanumerico = i % 2 === 0
      let base = ''
      for (let k = 0; k < 12; k++) {
        base += alfanumerico
          ? ALFANUMERICO[Math.floor(rand() * ALFANUMERICO.length)]
          : String(Math.floor(rand() * 10))
      }
      const cnpj = gerarCnpjValido(base)

      if (!validarCNPJ(cnpj)) reprovados.push(`aceitar ${cnpj}`)

      // trocar qualquer um dos dois DV por outro dígito deve invalidar
      for (const pos of [12, 13]) {
        const trocado = String((Number(cnpj[pos]) + 1) % 10)
        const corrompido = cnpj.slice(0, pos) + trocado + cnpj.slice(pos + 1)
        if (validarCNPJ(corrompido)) reprovados.push(`rejeitar ${corrompido}`)
      }
    }

    expect(reprovados).toEqual([])
  })

  it('concorda com a implementação independente em 20000 strings aleatórias', () => {
    const rand = prng(49)
    const divergencias: string[] = []

    for (let i = 0; i < 20000; i++) {
      const tamanho = 12 + Math.floor(rand() * 5)
      let s = ''
      for (let k = 0; k < tamanho; k++) {
        s += ALFANUMERICO[Math.floor(rand() * ALFANUMERICO.length)]
      }
      if (validarCNPJ(s) !== cnpjIndependente(s)) divergencias.push(s)
    }

    expect(divergencias).toEqual([])
  })

  it('aceita CNPJ numéricos reais de empresas conhecidas', () => {
    // Conferidos contra o CNPJ público de cada empresa.
    expect(validarCNPJ('00.000.000/0001-91')).toBe(true) // Banco do Brasil
    expect(validarCNPJ('33.000.167/0001-01')).toBe(true) // Petrobras
    expect(validarCNPJ('60.746.948/0001-12')).toBe(true) // Bradesco
    expect(validarCNPJ('47.960.950/0001-21')).toBe(true) // Magazine Luiza
  })
})

describe('validarCPF — verificação cruzada', () => {
  it('concorda com a implementação independente em 20000 CPF aleatórios', () => {
    const rand = prng(11144477)
    const divergencias: string[] = []

    for (let i = 0; i < 20000; i++) {
      let s = ''
      for (let k = 0; k < 11; k++) s += String(Math.floor(rand() * 10))
      if (validarCPF(s) !== cpfIndependente(s)) divergencias.push(s)
    }

    expect(divergencias).toEqual([])
  })

  it('aceita todo CPF cujo DV foi calculado pela implementação independente', () => {
    const rand = prng(777)
    const reprovados: string[] = []

    for (let i = 0; i < 2000; i++) {
      let base = ''
      for (let k = 0; k < 9; k++) base += String(Math.floor(rand() * 10))
      const num = base.split('').map(Number)
      const dv1 = dvCiclico(num, 10)
      const dv2 = dvCiclico([...num, dv1], 11)
      const cpf = `${base}${dv1}${dv2}`
      // dígitos repetidos são rejeitados por regra, não por DV
      if (/^(\d)\1{10}$/.test(cpf)) continue
      if (!validarCPF(cpf)) reprovados.push(cpf)
    }

    expect(reprovados).toEqual([])
  })
})
