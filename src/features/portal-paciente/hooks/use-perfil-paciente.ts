'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface PatientPerfilData {
  nome: string
  cpf: string
  rg: string
  inscricaoEstadual: string
  dataNascimento: string
  sexo: string
  status: string
  telefone: string
  email: string
  zipCode: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  notificacoesEmail: boolean
  notificacoesSms: boolean
  lembretesConsultas: boolean
  avisosPagamento: boolean
  promocoesNovidades: boolean
}

export interface ChangePatientPasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function usePerfilPaciente() {
  const api = useApi()
  const [data, setData] = useState<PatientPerfilData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<{ data: PatientPerfilData }>('/api/portal/perfil')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<{ data: PatientPerfilData }>('/api/portal/perfil')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [api])

  const savePerfil = async (payload: PatientPerfilData) => {
    const response = await api.put<{ data: PatientPerfilData }>('/api/portal/perfil', payload)
    setData(response.data)
    return response.data
  }

  const changePassword = async (payload: ChangePatientPasswordPayload) => {
    const response = await api.put<{ data: { success: boolean } }>('/api/auth/password', payload)
    return response.data
  }

  return { data, isLoading, error, savePerfil, changePassword, reload: load }
}
