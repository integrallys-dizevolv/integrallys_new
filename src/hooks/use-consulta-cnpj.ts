'use client'

import { useCallback, useRef, useState } from 'react'
import { normalizarCNPJ, validarCNPJ } from '@/lib/validacao-br'
import { consultarCnpj, type EmpresaCnpj } from '@/services/cnpj.service'
import type { StatusConsulta } from './use-consulta-cep'

/**
 * Auto-preenchimento de cadastro a partir do CNPJ.
 *
 * Fluxo: valida o dígito verificador na hora (instantâneo, sem rede) e só então
 * consulta a base da Receita Federal (BrasilAPI, com fallback na minhaReceita).
 * Nunca bloqueia o cadastro — o serviço só devolve 'nao-encontrado' quando as
 * duas fontes confirmam a ausência; se alguma consulta não completou, vem
 * 'erro' e o usuário segue cadastrando à mão.
 */
export function useConsultaCnpj(aoEncontrar: (empresa: EmpresaCnpj) => void) {
  const [status, setStatus] = useState<StatusConsulta>('inativo')
  const ultimoConsultado = useRef('')

  const aoEncontrarRef = useRef(aoEncontrar)
  aoEncontrarRef.current = aoEncontrar

  const consultar = useCallback(async (valor: string) => {
    const cnpj = normalizarCNPJ(valor ?? '')

    // Enquanto o usuário ainda está digitando não há o que sinalizar.
    if (cnpj.length < 14) {
      ultimoConsultado.current = ''
      setStatus('inativo')
      return
    }

    if (!validarCNPJ(cnpj)) {
      ultimoConsultado.current = ''
      setStatus('invalido')
      return
    }

    if (ultimoConsultado.current === cnpj) return
    ultimoConsultado.current = cnpj

    setStatus('buscando')
    const resultado = await consultarCnpj(cnpj)

    if (resultado.status === 'encontrado') {
      aoEncontrarRef.current(resultado.empresa)
      setStatus('encontrado')
      return
    }

    setStatus(resultado.status === 'nao-encontrado' ? 'nao-encontrado' : 'erro')
  }, [])

  const reiniciar = useCallback(() => {
    ultimoConsultado.current = ''
    setStatus('inativo')
  }, [])

  return { status, consultar, reiniciar }
}
