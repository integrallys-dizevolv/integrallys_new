'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { PrescricaoItem } from '@/hooks/use-prescricoes'
import { Download, FileText, Printer, X } from 'lucide-react'
import { toast } from 'sonner'

interface VisualizarPrescricaoModalProps {
  isOpen: boolean
  onClose: () => void
  prescricao: PrescricaoItem | null
}

function splitObservacoes(value?: string) {
  return (value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function VisualizarPrescricaoModal({
  isOpen,
  onClose,
  prescricao,
}: VisualizarPrescricaoModalProps) {
  if (!prescricao) return null

  const instrucoes = splitObservacoes(prescricao.observacoes)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[650px] p-0 rounded-[24px] border border-app-border dark:border-app-border-dark shadow-lg bg-app-card dark:bg-app-card-dark custom-scrollbar"
      >
        <DialogTitle className="sr-only">Visualizar prescrição</DialogTitle>

        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-app-bg-secondary dark:bg-app-table-header-dark flex items-center justify-center">
                <FileText className="h-5 w-5 text-app-text-primary dark:text-white" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-normal text-app-text-primary dark:text-white">
                  Prescrição médica {prescricao.numero}
                </h2>
                <p className="text-base text-app-text-muted dark:text-app-text-muted font-normal">
                  Visualização completa da prescrição
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-app-bg-secondary dark:hover:bg-app-hover rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-app-text-muted" />
            </button>
          </div>

          <div className="bg-app-bg-secondary/50 dark:bg-app-table-header-dark rounded-[20px] p-8 border border-app-border dark:border-app-border-dark mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-12">
              <div className="space-y-2">
                <span className="text-sm font-normal text-app-text-muted dark:text-app-text-muted">Paciente</span>
                <p className="text-lg font-normal text-app-text-primary dark:text-white">{prescricao.paciente}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-normal text-app-text-muted dark:text-app-text-muted">Data de emissão</span>
                <p className="text-lg font-normal text-app-text-primary dark:text-white">{prescricao.data ?? '--'}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-normal text-app-text-muted dark:text-app-text-muted">Tipo</span>
                <div>
                  <Badge variant="outline" className="rounded-full border-app-border bg-app-card dark:bg-app-surface-muted text-app-text-secondary dark:text-white/80 px-4 py-1 font-normal shadow-sm">
                    {prescricao.tipo ?? '--'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-normal text-app-text-muted dark:text-app-text-muted">Número</span>
                <p className="text-lg font-normal text-app-text-primary dark:text-white">{prescricao.numero}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-normal text-app-text-muted dark:text-app-text-muted">Validade</span>
                <p className="text-lg font-normal text-app-text-primary dark:text-white">{prescricao.validade ?? '--'}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-normal text-app-text-muted dark:text-app-text-muted">Status</span>
                <p className="text-lg font-normal text-app-text-primary dark:text-white">{prescricao.status}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-normal text-app-text-primary dark:text-white tracking-tight">
              Instruções e detalhes
            </h3>
            <div className="flex min-h-[560px] w-full aspect-[1/1.4] items-center justify-center rounded-xl border border-app-border dark:border-app-border-dark bg-white dark:bg-app-bg-dark p-6">
              {instrucoes.length > 0 ? (
                <ul className="w-full space-y-3 self-start">
                  {instrucoes.map((item, index) => (
                    <li key={`${prescricao.id}-${index}`} className="text-base text-app-text-primary dark:text-white flex gap-3">
                      <span className="font-normal text-app-text-muted dark:text-app-text-muted">{index + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-app-bg-secondary dark:bg-app-hover flex items-center justify-center">
                    <FileText className="h-8 w-8 text-app-text-muted" />
                  </div>
                  <p className="text-sm text-app-text-muted dark:text-app-text-muted">
                    Nenhum detalhe adicional registrado para esta prescrição.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-app-bg-secondary/50 dark:bg-app-table-header-dark rounded-[18px] p-4 flex items-center justify-between border border-app-border dark:border-app-border-dark mb-8">
            <Badge
              className={`rounded-[8px] text-xs font-normal tracking-wider px-4 py-2 border-0 shadow-sm ${
                prescricao.status === 'Ativa'
                  ? 'app-status-success text-white'
                  : prescricao.status === 'Expirada'
                    ? 'app-status-warning text-white'
                    : 'app-status-danger text-white'
              }`}
            >
              {prescricao.status}
            </Badge>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => toast.info('Em breve')}
                className="h-10 px-6 rounded-xl bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white font-normal shadow-sm transition-all hover:bg-app-bg-secondary dark:hover:bg-app-hover flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info('Em breve')}
                className="h-10 px-6 rounded-xl bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white font-normal shadow-sm transition-all hover:bg-app-bg-secondary dark:hover:bg-app-hover flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="h-11 px-8 rounded-xl bg-app-primary hover:bg-app-primary-hover text-white font-normal shadow-sm transition-all"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
