'use client'

import { useEffect } from 'react'
import { useClinicaConfig } from '@/features/configuracoes/hooks/use-clinica-config'

function darkenHex(hex: string, amount = 0.15): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const r = Math.max(0, Math.floor(parseInt(normalized.slice(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.floor(parseInt(normalized.slice(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.floor(parseInt(normalized.slice(4, 6), 16) * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * RN-06 · Aplica identidade da clínica (cor primária) ao shell quando configurada.
 * Sem config salva, o tema padrão Integrallys (`:root` em globals.css) prevalece.
 */
export function ClinicaThemeProvider({ children }: { children: React.ReactNode }) {
  const { data } = useClinicaConfig()

  useEffect(() => {
    const root = document.documentElement
    if (data?.cor_primaria) {
      root.style.setProperty('--app-primary', data.cor_primaria)
      root.style.setProperty('--app-primary-hover', darkenHex(data.cor_primaria))
    } else {
      root.style.removeProperty('--app-primary')
      root.style.removeProperty('--app-primary-hover')
    }
  }, [data?.cor_primaria])

  return <>{children}</>
}
