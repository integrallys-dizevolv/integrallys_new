'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { PrescricaoPortalItem } from '../hooks/use-prescricoes-portal'

interface PrescricaoModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDoc: PrescricaoPortalItem | null
}

export function PrescricaoModal({ isOpen, onClose, selectedDoc }: PrescricaoModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 3

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(100)
      setCurrentPage(1)
    }
  }, [isOpen, selectedDoc])

  if (!selectedDoc) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] md:w-full md:max-w-[90vw] p-0 gap-0 bg-white md:bg-slate-100/50 dark:bg-black md:dark:bg-slate-900/50 flex flex-col outline-none border-none shadow-2xl rounded-[20px] md:rounded-integrallys-lg">
        <div className="flex flex-col md:flex-row items-center justify-between p-2 md:px-6 md:h-16 bg-app-card dark:bg-app-card-dark border-b border-app-border dark:border-app-border-dark z-10 shadow-sm shrink-0 gap-2 md:gap-4">
          <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-2">
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-app-text-primary dark:text-white text-sm md:text-lg leading-tight truncate max-w-[120px] md:max-w-none">{selectedDoc.id}</span>
              <span className="text-xs md:text-xs text-app-text-secondary dark:text-white/60">Página {currentPage} de {totalPages}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden text-app-text-muted hover:text-app-text-secondary dark:hover:text-gray-200 rounded-full" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-1 md:gap-2 bg-app-bg-secondary dark:bg-[var(--app-card-dark)] rounded-lg p-1 w-full md:w-auto">
            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8 rounded-[8px] text-app-text-muted hover:text-gray-900 dark:text-app-text-muted dark:hover:text-white flex items-center justify-center flex-1 md:flex-none" onClick={() => setZoomLevel((prev) => Math.max(prev - 25, 50))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center text-app-text-secondary dark:text-white/70 select-none hidden xs:block">{zoomLevel}%</span>
            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8 rounded-[8px] text-app-text-muted hover:text-gray-900 dark:text-app-text-muted dark:hover:text-white flex items-center justify-center flex-1 md:flex-none" onClick={() => setZoomLevel((prev) => Math.min(prev + 25, 200))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-gray-300 dark:bg-app-hover mx-1 hidden sm:block" />
            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8 rounded-[8px] text-app-text-muted hover:text-gray-900 dark:text-app-text-muted dark:hover:text-white flex items-center justify-center flex-1 md:flex-none" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8 rounded-[8px] text-app-text-muted hover:text-gray-900 dark:text-app-text-muted dark:hover:text-white flex items-center justify-center flex-1 md:flex-none" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button className="flex flex-1 md:flex-initial flex-row items-center justify-center gap-2 h-10 px-4 whitespace-nowrap bg-app-primary hover:bg-app-primary-hover text-white rounded-integrallys shadow-sm transition-colors">
              <Download className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline">Download</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 hidden md:flex text-app-text-muted hover:text-app-text-secondary dark:hover:text-gray-200 rounded-full justify-center items-center" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-0 md:p-8 bg-white md:bg-slate-100/50 dark:bg-black md:dark:bg-app-surface-muted flex items-start justify-center">
          <div className="bg-app-card dark:bg-app-card-dark md:shadow-xl max-w-[800px] min-h-[100dvh] md:min-h-[1000px] w-full p-4 md:p-12 md:rounded-sm transition-transform duration-200 origin-top" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
            <div className="flex justify-between items-start mb-6 md:mb-12">
              <div className="h-10 w-10 md:h-12 md:w-12 bg-app-primary rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white text-xl md:text-2xl font-bold">I</span>
              </div>
              <div className="text-right space-y-0.5 md:space-y-1">
                <p className="text-xs md:text-sm text-app-text-muted font-medium">Data: {selectedDoc.data}</p>
                <p className="text-xs md:text-sm text-app-text-muted">Código: {selectedDoc.id}</p>
              </div>
            </div>
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-app-text-primary dark:text-white mb-1 md:mb-2 leading-tight">
                {selectedDoc.tipo === 'Atestado' ? 'Atestado Médico' : selectedDoc.tipo === 'Exame' ? 'Pedido de Exame' : 'Prescrição Médica'}
              </h1>
              <p className="text-base md:text-lg text-app-text-secondary dark:text-white/70 font-medium">{selectedDoc.profissional}</p>
            </div>
            <hr className="border-app-border dark:border-app-border-dark mb-6 md:mb-8" />
            <div className="mb-8 md:mb-10">
              <p className="text-app-text-muted mb-1 text-xs md:text-sm uppercase tracking-wide font-semibold">Documento</p>
              <p className="text-lg md:text-xl text-app-text-primary dark:text-white font-medium">{selectedDoc.tipo}</p>
              <p className="text-sm md:text-base text-app-text-muted">Validade: {selectedDoc.validade}</p>
            </div>
            <div className="bg-app-bg-secondary dark:bg-[var(--app-card-dark)] border border-app-border dark:border-[var(--app-primary)]/20 rounded-xl p-4 md:p-8 mb-8">
              <p className="text-app-text-muted mb-4 text-xs md:text-sm uppercase tracking-wide font-semibold">Conteúdo do documento</p>
              <p className="leading-relaxed text-base md:text-lg text-app-text-primary dark:text-white/80">
                Documento clínico emitido por {selectedDoc.profissional}. Esta visualização segue o mesmo fluxo do portal do paciente no sistema original.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
