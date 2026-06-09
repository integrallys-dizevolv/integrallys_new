'use client'

import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { usePortalDocumentos } from './hooks/use-portal-documentos'
import { ExamesPacienteCard } from '@/features/gestao-pacientes/components/exames-paciente-card'

interface MeResponse {
  data: { pacienteId: string }
}

function formatarData(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function DocumentosPortalView() {
  const { data, isLoading, error } = usePortalDocumentos()
  const [pacienteId, setPacienteId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/portal/me', { credentials: 'include' })
        if (!res.ok) return
        const json = (await res.json()) as MeResponse
        if (mounted) setPacienteId(json.data.pacienteId)
      } catch {
        // silencioso — seção de exames não aparece se falhar
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="app-page app-page-loose app-page-frame pb-10">
      <PageHeader
        title="Meus Documentos"
        description="Declarações, laudos e orientações emitidos pela sua clínica."
      />

      <div className="rounded-[24px] border border-app-border bg-app-card p-6 dark:border-app-border-dark dark:bg-app-card-dark shadow-sm">
        {error && <p className="mb-4 text-sm text-[var(--app-danger-text)]">{error}</p>}
        {isLoading && (
          <p className="text-sm text-app-text-secondary dark:text-white/60">Carregando documentos...</p>
        )}

        {!isLoading && data.length === 0 && !error && (
          <div className="text-center py-14 text-sm text-app-text-secondary dark:text-white/60">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            Nenhum documento disponível no portal.
          </div>
        )}

        {data.length > 0 && (
          <ul className="divide-y divide-app-border dark:divide-app-border-dark">
            {data.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 py-4">
                <div className="h-12 w-12 rounded-xl bg-app-bg-secondary dark:bg-app-hover flex items-center justify-center">
                  <FileText className="h-5 w-5 text-app-text-secondary dark:text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-app-text-primary dark:text-white truncate">
                    {doc.template_nome}
                  </div>
                  <div className="text-xs text-app-text-muted mt-0.5">
                    Emitido em {formatarData(doc.gerado_em)}
                  </div>
                </div>
                {doc.pdf_url ? (
                  <Button asChild variant="outline" className="rounded-xl border-app-border dark:border-app-border-dark">
                    <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-app-text-muted italic">PDF em preparação</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pacienteId && (
        <div className="rounded-[24px] border border-app-border bg-app-card p-6 dark:border-app-border-dark dark:bg-app-card-dark shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-normal text-app-text-primary dark:text-white">Meus exames</h2>
            <p className="text-sm text-app-text-secondary dark:text-white/60">
              Envie resultados de exames para sua clínica visualizar durante o atendimento.
            </p>
          </div>
          <ExamesPacienteCard pacienteId={pacienteId} />
        </div>
      )}
    </div>
  )
}
