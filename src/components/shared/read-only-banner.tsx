'use client'

import { Lock } from 'lucide-react'

export function ReadOnlyBanner() {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 mb-8 rounded-integrallys-lg border border-yellow-100 bg-[#fffbeb] p-6 dark:border-yellow-900/30 dark:bg-[#2a240d]">
      <div className="mb-3 flex items-center gap-3 text-[var(--app-warning-text)] dark:text-[var(--app-warning-text)]">
        <Lock className="h-6 w-6" />
        <h3 className="text-lg font-bold">Atendimento Finalizado (Modo Leitura)</h3>
      </div>
      <p className="pl-9 text-sm leading-relaxed text-amber-800 dark:text-amber-200/80">
        Este prontuário está finalizado conforme a <strong>RN-009</strong>. Alterações no corpo principal não são permitidas
        para garantir segurança jurídica. Utilize o campo de &quot;Notas/Errata&quot; para adições posteriores.
      </p>
    </div>
  )
}
