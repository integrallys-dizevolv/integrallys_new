'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { Download, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAtendimento } from '@/contexts/atendimento-context'
import { useClinicaConfig } from '@/features/configuracoes/hooks/use-clinica-config'

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  docTitle: string
  docContent: string
}

export function DocumentPreviewModal({ isOpen, onClose, docTitle, docContent }: DocumentPreviewModalProps) {
  const { patientName, signature } = useAtendimento()
  const { data: clinicaConfig } = useClinicaConfig()
  const nomeClinica = clinicaConfig?.nome ?? 'Clínica'
  const today = new Date().toLocaleDateString('pt-BR')

  const validationId = useMemo(
    () =>
      `${docTitle}-${patientName}`
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 8)
        .toUpperCase()
        .padEnd(8, 'X'),
    [docTitle, patientName],
  )

  const qrPattern = useMemo(
    () => Array.from({ length: 9 }, (_, i) => (validationId.charCodeAt(i % validationId.length) + i) % 2 === 0),
    [validationId],
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg" className="p-0 border-none bg-app-bg dark:bg-app-card-dark">
        <div className="sticky top-0 z-10 bg-app-card dark:bg-app-card-dark border-b border-app-border dark:border-app-border-dark p-4 flex items-center justify-between">
          <DialogTitle className="text-lg font-normal text-app-text-primary dark:text-white">PRÉ-VISUALIZAÇÃO</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-12">
          <div className="bg-white text-black p-12 shadow-2xl min-h-[800px] flex flex-col justify-between border border-app-border">
            {/* Clinic Header */}
            <div className="border-b-2 border-[var(--app-primary)] pb-6 mb-8 text-center space-y-2">
              {clinicaConfig?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clinicaConfig.logo_url}
                  alt={nomeClinica}
                  className="mx-auto h-12 w-auto object-contain"
                />
              )}
              <h1 className="text-3xl font-bold text-[var(--app-primary)]">{nomeClinica.toUpperCase()}</h1>
              {clinicaConfig?.cidade_uf && (
                <p className="text-sm text-gray-500 uppercase tracking-widest">{clinicaConfig.cidade_uf}</p>
              )}
              {(clinicaConfig?.endereco || clinicaConfig?.telefone) && (
                <div className="text-xs text-gray-400 pt-2 font-mono">
                  {[clinicaConfig?.endereco, clinicaConfig?.telefone]
                    .filter((value) => value && value.trim().length > 0)
                    .join(' | ')
                    .toUpperCase()}
                </div>
              )}
            </div>

            {/* Document Content */}
            <div className="flex-1 space-y-10">
              <div className="text-center">
                <h2 className="text-xl font-bold decoration-2 underline underline-offset-8 uppercase tracking-wider">
                  {docTitle}
                </h2>
              </div>

              <div className="space-y-1 text-sm">
                <p><strong>Paciente:</strong> {patientName}</p>
                <p><strong>Data de Emissão:</strong> {today}</p>
              </div>

              <div className="text-sm leading-loose whitespace-pre-wrap font-serif text-gray-800 pt-4">
                {docContent}
              </div>
            </div>

            {/* Signature Section */}
            <div className="mt-20 pt-10 border-t border-gray-200 flex flex-col items-center gap-4">
              {signature ? (
                <div className="flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signature} alt="Assinatura" className="max-h-24 grayscale brightness-125 contrast-125" />
                  <div className="w-64 h-px bg-black mt-2" />
                  <p className="text-xs font-bold mt-2 uppercase tracking-tighter">Dr. Especialista Responsável</p>
                  <p className="text-xs text-gray-400">CRM: 123456-SP</p>
                </div>
              ) : (
                <div className="w-64 h-px bg-black mt-16" />
              )}

              <div className="flex items-center gap-3 mt-4">
                <div className="h-10 w-10 border border-black p-1">
                  <div className="w-full h-full bg-black grid grid-cols-3 gap-0.5 p-0.5">
                    {qrPattern.map((filled, i) => (
                      <div key={i} className={`bg-white ${filled ? 'opacity-100' : 'opacity-0'}`} />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-400 font-mono leading-none">
                  <p>VALIDAÇÃO ELETRÔNICA</p>
                  <p>ID: {validationId}</p>
                  <p>{nomeClinica.toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 bg-app-card dark:bg-app-card-dark border-t border-app-border dark:border-app-border-dark p-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => toast.info('Download disponível em breve.')}
            className="h-12 px-8 rounded-full border-app-border dark:border-app-border-dark font-normal"
          >
            <Download className="h-4 w-4 mr-2" /> Baixar PDF
          </Button>
          <Button
            onClick={() => window.print()}
            className="h-12 px-10 rounded-full bg-app-primary hover:bg-app-primary-hover text-white font-normal flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Imprimir Documento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
