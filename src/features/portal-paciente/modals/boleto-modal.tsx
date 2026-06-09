'use client'

import { FileText, Download } from 'lucide-react'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { PagamentoPortalItem } from '../hooks/use-pagamentos-portal'

interface BoletoModalProps {
  isOpen: boolean
  onClose: () => void
  paymentData: PagamentoPortalItem | null
}

export function BoletoModal({ isOpen, onClose, paymentData }: BoletoModalProps) {
  if (!paymentData) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm" className="w-[90vw] p-4 sm:p-4 rounded-[20px] sm:rounded-[24px] bg-app-card dark:bg-app-card-dark gap-0 border-none shadow-xl outline-none overflow-hidden">
        <ModalHeader
          className="mb-1"
          title="Gerar Boleto"
          description="Boleto para pagamento da consulta"
        />

        <div className="my-4 sm:my-6 rounded-[20px] border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-app-surface-muted p-5 sm:p-8 flex flex-col items-center text-center">
          <div className="mb-3 sm:mb-4 text-slate-400 dark:text-slate-500">
            <FileText strokeWidth={1.5} className="h-12 w-12 sm:h-16 sm:w-16" />
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
            Boleto Bancário
          </h3>

          <p className="text-xs sm:text-base text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 leading-tight max-w-[90%]">
            {paymentData.descricao}
            {paymentData.doutor ? ` - ${paymentData.doutor}` : ''}
          </p>

          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6 sm:mb-8">
            {paymentData.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>

          <Button
            className="bg-app-primary hover:bg-app-primary-hover text-white rounded-integrallys h-10 sm:h-11 px-6 flex items-center justify-center gap-2 w-full sm:w-auto font-medium transition-colors"
            onClick={onClose}
          >
            <Download className="h-4 w-4" />
            <span className="whitespace-nowrap">Baixar Boleto PDF</span>
          </Button>
        </div>

        <div className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed text-left">
          O boleto será gerado com vencimento de 3 dias úteis. Após o pagamento, a confirmação será processada em até 2 dias úteis.
        </div>
      </DialogContent>
    </Dialog>
  )
}
