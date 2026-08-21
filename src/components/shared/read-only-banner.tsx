'use client'

import { Pencil } from 'lucide-react'

/** Banner pós-opção 2: prontuário permanece editável com auditoria. */
export function ReadOnlyBanner() {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 mb-8 rounded-integrallys-lg border border-sky-100 bg-sky-50 p-6 dark:border-sky-900/30 dark:bg-sky-950/40">
      <div className="mb-3 flex items-center gap-3 text-sky-800 dark:text-sky-200">
        <Pencil className="h-6 w-6" />
        <h3 className="text-lg font-bold">Prontuário editável</h3>
      </div>
      <p className="pl-9 text-sm leading-relaxed text-sky-900/80 dark:text-sky-100/80">
        Este atendimento pode ser alterado após a finalização. Cada gravação gera um snapshot de auditoria
        (<code>prontuario_versoes</code>) com autor e horário.
      </p>
    </div>
  )
}
