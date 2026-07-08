'use client'

import { FileText, User, Stethoscope, Calendar, CreditCard, Globe, Monitor, Video } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AgendaItem } from '@/hooks/use-agenda'

interface VisualizarConsultaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: AgendaItem | null
}

function calcDuracao(inicio: string, fim?: string): string {
  if (!fim) return '--'
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fim.split(':').map(Number)
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (diff <= 0) return '--'
  if (diff < 60) return `${diff}min`
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

function formatCurrency(value?: number): string {
  if (value == null) return 'Não informado'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function VisualizarConsultaModal({ open, onOpenChange, item }: VisualizarConsultaModalProps) {
  if (!item) return null

  const duracao = calcDuracao(item.horario, item.horarioFim)
  const isOnline = item.modalidade?.toLowerCase() === 'online'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-app-card dark:bg-app-card-dark">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-normal">
            <FileText className="h-5 w-5 text-[var(--app-primary)]" />
            Detalhes da consulta
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre o agendamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6 pt-0">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--app-primary)]" />
              <h3 className="text-sm font-normal uppercase tracking-wider text-app-text-primary dark:text-white">Paciente</h3>
            </div>
            <div className="space-y-1 pl-6">
              <p className="text-sm font-normal text-app-text-primary dark:text-white">{item.paciente}</p>
            </div>
          </div>

          <div className="h-px bg-app-bg-secondary dark:bg-app-bg-dark" />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-[var(--app-primary)]" />
              <h3 className="text-sm font-normal uppercase tracking-wider text-app-text-primary dark:text-white">Consulta</h3>
            </div>
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between text-xs">
                <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Profissional:</p>
                <p className="font-normal text-app-text-primary dark:text-white">{item.profissional}</p>
              </div>
              {item.tipo && (
                <div className="flex items-center justify-between text-xs">
                  <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Tipo:</p>
                  <span className="rounded border border-app-border bg-app-bg-secondary px-2 py-0.5 text-xs font-normal text-app-text-primary dark:border-app-border-dark dark:bg-app-bg-dark dark:text-white/80">
                    {item.tipo}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Status:</p>
                <span className="app-status-info rounded px-2 py-0.5 text-xs font-normal">
                  {item.status}
                </span>
              </div>
              {item.modalidade && (
                <div className="flex items-center justify-between text-xs">
                  <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Modalidade:</p>
                  <p className="font-normal text-app-text-primary dark:text-white">{item.modalidade}</p>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-app-bg-secondary dark:bg-app-bg-dark" />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--app-primary)]" />
              <h3 className="text-sm font-normal uppercase tracking-wider text-app-text-primary dark:text-white">Agendamento</h3>
            </div>
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between text-xs">
                <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Data:</p>
                <p className="font-normal text-app-text-primary dark:text-white">{item.data ?? 'Conforme agenda'}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Horário:</p>
                <p className="font-normal text-app-text-primary dark:text-white">
                  {item.horario}{item.horarioFim ? ` - ${item.horarioFim}` : ''}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Duração:</p>
                <p className="font-normal text-app-text-primary dark:text-white">{duracao}</p>
              </div>
            </div>
          </div>

          {isOnline && (
            <>
              <div className="h-px bg-app-bg-secondary dark:bg-app-bg-dark" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-[var(--app-primary)]" />
                  <h3 className="text-sm font-normal uppercase tracking-wider text-app-text-primary dark:text-white">Atendimento Online</h3>
                </div>
                <div className="space-y-2 pl-6">
                  {item.plataformaOnline && (
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Plataforma:</p>
                      <p className="font-normal text-app-text-primary dark:text-white">{item.plataformaOnline}</p>
                    </div>
                  )}
                  {item.urlOnline && (
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Link:</p>
                      <a
                        href={item.urlOnline}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-normal text-app-primary hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        Acessar sala
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-app-bg-secondary dark:bg-app-bg-dark" />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[var(--app-primary)]" />
              <h3 className="text-sm font-normal uppercase tracking-wider text-app-text-primary dark:text-white">Pagamento</h3>
            </div>
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between text-xs">
                <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Situação:</p>
                <p className="font-normal text-app-text-primary dark:text-white">{item.pagamento ?? 'Não informado'}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Valor:</p>
                <p className="font-normal text-app-text-primary dark:text-white">{formatCurrency(item.valorProcedimento)}</p>
              </div>
              {item.totalPago != null && (
                <div className="flex items-center justify-between text-xs">
                  <p className="font-normal text-app-text-secondary dark:text-app-text-muted">Total pago:</p>
                  <p className="font-normal text-app-text-primary dark:text-white">{formatCurrency(item.totalPago)}</p>
                </div>
              )}
            </div>
          </div>

          {item.observacoes && (
            <>
              <div className="h-px bg-app-bg-secondary dark:bg-app-bg-dark" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[var(--app-primary)]" />
                  <h3 className="text-sm font-normal uppercase tracking-wider text-app-text-primary dark:text-white">Observações</h3>
                </div>
                <div className="pl-6">
                  <p className="text-xs font-normal leading-relaxed text-app-text-secondary dark:text-app-text-muted">
                    {item.observacoes}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          {item.pacienteId && (
            <Button
              variant="outline"
              onClick={() => {
                // CR-HW-01 (item 1.4): abre o prontuário em nova janela em
                // modo tela grande (chrome escondido via ?hardware=1 lido
                // pelo (app)/layout). Usa noopener para isolar a janela.
                // Capturado em local para o TS narrow chegar dentro do closure.
                const pid = item.pacienteId
                if (!pid) return
                window.open(
                  `/prontuarios?paciente_id=${encodeURIComponent(pid)}&hardware=1`,
                  '_blank',
                  'noopener',
                )
              }}
              className="h-11 w-full rounded-integrallys border-app-border px-8 font-normal text-app-text-primary shadow-sm transition-all hover:bg-app-bg-secondary dark:border-app-border-dark dark:text-white sm:w-auto"
            >
              <Monitor className="mr-2 h-4 w-4" />
              Tela Grande
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            className="h-11 w-full rounded-integrallys bg-app-primary px-8 font-normal text-white shadow-sm transition-all hover:bg-app-primary-hover active:scale-[0.98]"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
