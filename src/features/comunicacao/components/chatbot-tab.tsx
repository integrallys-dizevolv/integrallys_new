'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, MessageSquare, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { StatCard } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSessoes } from '@/features/comunicacao/hooks/use-sessoes'
import { ConversaModal } from './conversa-modal'
import { NovaConversaModal } from './nova-conversa-modal'
import { Pill, humanize } from './pill'

const HEAD =
  'px-6 py-4 text-xs font-medium uppercase tracking-wider text-app-text-secondary dark:text-white/60 whitespace-nowrap'

function estadoPill(estado: string) {
  if (estado === 'concluido') return <Pill tone="success">Concluído</Pill>
  if (estado === 'encerrado') return <Pill tone="neutral">Encerrado</Pill>
  return <Pill tone="info">{humanize(estado)}</Pill>
}

export function ChatbotTab() {
  const {
    data: sessoes,
    meta,
    isLoading,
    error,
    encerrarSessao,
    load: reloadSessoes,
  } = useSessoes()
  const [conversa, setConversa] = useState<{ telefone: string; paciente: string | null } | null>(
    null,
  )
  const [isNovaOpen, setIsNovaOpen] = useState(false)

  const handleEncerrar = async (telefone: string) => {
    try {
      await encerrarSessao(telefone)
      toast.success('Sessão encerrada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao encerrar sessão')
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Sessões ativas"
          value={meta.sessoesAtivas}
          sub="Interação < 30 min"
          icon={MessageSquare}
          iconTone="primary"
        />
        <StatCard
          label="Agendamentos hoje"
          value={meta.agendamentosHoje}
          sub="Via chatbot"
          icon={CheckCircle2}
          iconTone="success"
        />
        <StatCard
          label="Agendamentos (7 dias)"
          value={meta.agendamentosSemana}
          sub="Via chatbot"
          icon={Clock}
          iconTone="primary"
        />
      </div>

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}

      <div className="overflow-hidden rounded-integrallys-lg border border-app-border bg-app-card shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
        <div className="flex flex-col gap-3 border-b border-app-border px-6 py-4 dark:border-app-border-dark sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-normal text-app-text-primary dark:text-white">
              Sessões do chatbot
            </h3>
            <p className="text-sm text-app-text-secondary dark:text-white/60">
              Conversas de agendamento em andamento ou concluídas.
            </p>
          </div>
          <Button
            onClick={() => setIsNovaOpen(true)}
            className="h-10 gap-2 rounded-xl bg-app-primary px-4 font-normal text-white hover:bg-app-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-app-border bg-transparent hover:bg-transparent dark:border-app-border-dark">
                <TableHead className={HEAD}>Telefone</TableHead>
                <TableHead className={HEAD}>Paciente</TableHead>
                <TableHead className={HEAD}>Estado</TableHead>
                <TableHead className={HEAD}>Última interação</TableHead>
                <TableHead className={HEAD}>Contexto</TableHead>
                <TableHead className={`${HEAD} text-right`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-app-text-secondary dark:text-white/60"
                  >
                    Carregando sessões...
                  </TableCell>
                </TableRow>
              ) : sessoes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-app-text-secondary dark:text-white/60"
                  >
                    Nenhuma sessão registrada.
                  </TableCell>
                </TableRow>
              ) : (
                sessoes.map((s) => (
                  <TableRow
                    key={s.id}
                    className="border-b border-app-border/50 transition-colors hover:bg-app-bg-secondary/50 dark:border-app-border-dark dark:hover:bg-app-hover"
                  >
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap text-sm font-normal text-app-text-primary dark:text-white">
                        {s.telefone}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap text-sm font-normal text-app-text-secondary dark:text-white/80">
                        {s.paciente || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">{estadoPill(s.estado)}</TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap text-sm font-normal text-app-text-secondary dark:text-white/60">
                        {s.ultimaInteracao}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="inline-block max-w-[280px] text-xs text-app-text-secondary dark:text-white/60">
                        {s.contextoResumo || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setConversa({ telefone: s.telefone, paciente: s.paciente || null })
                          }
                          className="h-8 gap-1.5 rounded-lg text-xs font-normal text-app-text-secondary dark:text-white/70"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Ver conversa
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => void handleEncerrar(s.telefone)}
                          disabled={s.estado === 'encerrado'}
                          className="h-8 rounded-lg text-xs font-normal text-[var(--app-danger-text)]"
                        >
                          Encerrar sessão
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConversaModal
        telefone={conversa?.telefone ?? null}
        paciente={conversa?.paciente}
        onClose={() => setConversa(null)}
      />

      <NovaConversaModal
        open={isNovaOpen}
        onClose={() => setIsNovaOpen(false)}
        onSent={(telefone, paciente) => {
          setIsNovaOpen(false)
          void reloadSessoes()
          setConversa({ telefone, paciente })
        }}
      />
    </>
  )
}
