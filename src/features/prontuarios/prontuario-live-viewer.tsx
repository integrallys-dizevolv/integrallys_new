'use client'

import { useSearchParams } from 'next/navigation'
import { FileText } from 'lucide-react'
import { useProntuarioLiveSubscribe } from '@/hooks/use-prontuario-live-sync'
import { usePacientes } from '@/hooks/use-pacientes'

function formatAge(updatedAt: string | null): string {
  if (!updatedAt) return ''
  const ms = Date.now() - new Date(updatedAt).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'agora'
  if (ms < 1500) return 'agora'
  if (ms < 60_000) return `há ${Math.floor(ms / 1000)}s`
  return `há ${Math.floor(ms / 60_000)} min`
}

/**
 * Viewer read-only da tela grande (?hardware=1&paciente_id=).
 * Consome BroadcastChannel + poll do draft ao vivo.
 */
export function ProntuarioLiveViewer({ pacienteId }: { pacienteId: string }) {
  const { texto, updatedAt, pacienteNome: nomeDraft } = useProntuarioLiveSubscribe(pacienteId)
  const { data: pacientes } = usePacientes()
  const nomeLista = pacientes.find((p) => String(p.id) === String(pacienteId))?.nome
  const nome = nomeDraft || nomeLista || 'Paciente'

  return (
    <div className="min-h-screen bg-app-bg px-6 py-8 dark:bg-app-bg-dark md:px-12 md:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-app-border pb-4 dark:border-app-border-dark">
          <div>
            <p className="text-sm font-normal uppercase tracking-wider text-app-text-muted">
              Prontuário ao vivo
            </p>
            <h1 className="mt-1 text-3xl font-normal text-app-text-primary dark:text-white md:text-4xl">
              {nome}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-app-text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--app-success-text)]" />
            Ao vivo{updatedAt ? ` · ${formatAge(updatedAt)}` : ''}
          </div>
        </div>

        <div className="rounded-integrallys-lg border border-app-border bg-app-card p-8 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark md:p-10">
          <div className="mb-4 flex items-center gap-2 text-app-text-muted">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-normal tracking-wide">Evolução / anotações</span>
          </div>
          {texto.trim() ? (
            <p className="whitespace-pre-wrap text-xl leading-relaxed text-app-text-primary dark:text-white md:text-2xl">
              {texto}
            </p>
          ) : (
            <p className="text-lg text-app-text-muted">Aguardando registro…</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProntuarioHardwareGate({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const hardware = searchParams?.get('hardware') === '1'
  const pacienteId = searchParams?.get('paciente_id')?.trim() ?? ''

  if (hardware && pacienteId) {
    return <ProntuarioLiveViewer pacienteId={pacienteId} />
  }

  return <>{children}</>
}
