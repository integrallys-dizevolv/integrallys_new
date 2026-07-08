'use client'

import { Download, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DocumentoClinicoItem } from '../hooks/use-documentacao'

interface VisualizarDocumentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documento: DocumentoClinicoItem | null
}

export function VisualizarDocumentoModal({
  open,
  onOpenChange,
  documento,
}: VisualizarDocumentoModalProps) {
  if (!documento) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-page-frame flex w-full flex-col p-0 rounded-[32px] border-none bg-app-card dark:bg-app-card-dark shadow-2xl">
        <DialogHeader className="px-10 pt-10 pb-6 bg-app-bg-secondary/50 dark:bg-app-card/5 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-medium text-app-text-primary dark:text-white leading-none">
              Visualizar Modelo
            </DialogTitle>
            <p className="text-sm text-app-text-muted dark:text-app-text-muted font-normal">
              {(documento.nome ?? documento.tipo)} • {(documento.categoria ?? documento.tipo)}
            </p>
          </div>
        </DialogHeader>

        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-app-card px-6 py-6 dark:bg-app-card-dark sm:px-10 sm:py-8">
          <div className="flex min-h-[560px] w-full aspect-[1/1.4] items-center justify-center rounded-xl border border-dashed border-app-border bg-app-bg-secondary p-12 text-center dark:border-app-border-dark dark:bg-[var(--app-card-dark)]">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-20 w-20 rounded-full app-status-success dark:app-status-success0/10 flex items-center justify-center text-[var(--app-primary)] dark:text-[var(--app-success-text)]">
                <FileText size={40} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-medium text-app-text-primary dark:text-white">Pré-visualização do Documento</h4>
                <p className="text-sm text-app-text-muted dark:text-app-text-muted max-w-xs mx-auto">
                  {documento.template || documento.descricao || 'O conteúdo do documento será renderizado aqui com as variáveis preenchidas.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-6 sm:px-10 sm:py-8 bg-app-bg-secondary/50 dark:bg-app-card/5 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full sm:w-auto px-8 rounded-xl border-app-border dark:border-app-border-dark text-app-text-muted dark:text-app-text-muted font-medium hover:bg-app-bg-secondary dark:hover:bg-app-hover"
          >
            Fechar
          </Button>
          <div className="flex flex-col sm:flex-row flex-1 gap-3 sm:justify-end">
            <Button
              variant="outline"
              className="h-12 w-full sm:w-auto px-6 rounded-xl border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white font-medium flex gap-2 items-center justify-center whitespace-nowrap"
              onClick={() => toast.info('Impressão em breve')}
            >
              <Printer size={18} className="shrink-0" /> <span className="shrink-0">Imprimir</span>
            </Button>
            <Button
              className="h-12 w-full sm:w-auto px-6 rounded-xl bg-app-primary hover:bg-app-primary-hover text-white font-medium flex gap-2 items-center justify-center whitespace-nowrap shadow-sm"
              onClick={() => toast.info('Download em breve')}
            >
              <Download size={18} className="shrink-0" /> <span className="shrink-0">Baixar PDF</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
