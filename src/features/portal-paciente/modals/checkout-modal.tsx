'use client'

import { useState } from 'react'
import { CheckCircle, CheckCircle2, Copy, CreditCard, DollarSign, QrCode } from 'lucide-react'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { PagamentoPortalItem } from '../hooks/use-pagamentos-portal'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  paymentData: PagamentoPortalItem | null
}

const SAVED_CARDS = [
  { id: '1', number: '**** **** **** 1234', holder: 'Paciente', brand: 'Visa' },
  { id: '2', number: '**** **** **** 5678', holder: 'Paciente', brand: 'Mastercard' },
]

export function CheckoutModal({ isOpen, onClose, paymentData }: CheckoutModalProps) {
  const [method, setMethod] = useState<'credit' | 'pix' | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  if (!paymentData) return null

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setMethod(null)
      setSelectedCardId(null)
    }, 300)
  }

  const showConfirmButton = method === 'pix' || (method === 'credit' && !!selectedCardId)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent size="sm" className="w-[95vw] p-0 rounded-[24px] bg-app-card dark:bg-app-card-dark border-none shadow-2xl outline-none gap-0 overflow-hidden">
        <div className="w-full p-4 sm:p-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
          <ModalHeader
            className="mb-4"
            title="Pagamento Online"
            description="Realize o pagamento de forma rápida e segura"
          />

          <div className="bg-slate-50/50 dark:bg-app-surface-muted rounded-[12px] p-4 mb-4 space-y-2 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs sm:text-sm gap-3">
              <span className="text-slate-500">Serviço:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium text-right line-clamp-1">{paymentData.descricao}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm gap-3">
              <span className="text-slate-500">Médico:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium text-right">{paymentData.doutor || 'Especialista'}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
              <span className="text-slate-600 font-medium">Total:</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {paymentData.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Formas de Pagamento</h3>

            <div className="grid gap-2 sm:gap-3">
              <div
                className={`relative rounded-[12px] border p-3 sm:p-4 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                  method === 'credit'
                    ? 'app-status-success/50 border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-transparent border-slate-200 dark:border-slate-700 hover:border-transparent'
                }`}
                onClick={() => setMethod('credit')}
              >
                <CreditCard className={`h-4 w-4 sm:h-5 sm:w-5 ${method === 'credit' ? 'text-[var(--app-success-text)]' : 'text-slate-500'}`} />
                <span className={`text-sm font-medium ${method === 'credit' ? 'text-emerald-900 dark:text-[var(--app-success-text)]' : 'text-slate-700 dark:text-slate-300'}`}>
                  Cartão de Crédito
                </span>
              </div>

              {method === 'credit' && (
                <div className="pl-4 border-l-2 border-slate-100 ml-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">Selecione um cartão:</p>
                  {SAVED_CARDS.map((card) => (
                    <div
                      key={card.id}
                      className={`group relative p-3 rounded-[12px] border cursor-pointer flex items-center gap-3 transition-all ${
                        selectedCardId === card.id
                          ? 'app-status-success border-transparent shadow-sm'
                          : 'bg-white dark:bg-app-surface-muted border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedCardId(card.id)}
                    >
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-300 shrink-0">
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{card.number}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs sm:text-xs text-slate-500 truncate">{card.holder}</p>
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{card.brand}</span>
                        </div>
                      </div>
                      {selectedCardId === card.id && (
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--app-success-text)] absolute top-3 right-3" />
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full border-dashed text-slate-500 h-9 hover:text-[var(--app-primary)] hover:border-transparent hover:app-status-info/50 text-xs">
                    + Adicionar novo cartão
                  </Button>
                </div>
              )}

              <div
                className={`relative rounded-[12px] border p-3 sm:p-4 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                  method === 'pix'
                    ? 'app-status-success/50 border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-transparent border-slate-200 dark:border-slate-700 hover:border-transparent'
                }`}
                onClick={() => setMethod('pix')}
              >
                <DollarSign className={`h-4 w-4 sm:h-5 sm:w-5 ${method === 'pix' ? 'text-[var(--app-success-text)]' : 'text-slate-500'}`} />
                <span className={`text-sm font-medium ${method === 'pix' ? 'text-emerald-900 dark:text-[var(--app-success-text)]' : 'text-slate-700 dark:text-slate-300'}`}>
                  PIX (Instantâneo)
                </span>
              </div>

              {method === 'pix' && (
                <div className="p-4 bg-slate-50 dark:bg-app-surface-muted rounded-[12px] border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 flex flex-col items-center text-center">
                  <QrCode className="h-20 w-20 text-slate-800 dark:text-white mb-3" />
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 max-w-[240px]">
                    Escaneie o QR Code ou copie a chave abaixo para pagar
                  </p>
                  <Button variant="outline" size="sm" className="gap-2 w-full max-w-[240px] bg-white dark:bg-black/40 h-9 text-xs whitespace-nowrap flex items-center justify-center">
                    <Copy className="h-3 w-3 shrink-0" />
                    Copiar Chave PIX
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showConfirmButton && (
            <div className="mt-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <Button
                className="w-full bg-app-primary hover:bg-app-primary-hover text-white rounded-integrallys h-11 font-medium gap-2 flex items-center justify-center transition-all"
                onClick={handleClose}
              >
                {method === 'pix' ? <CheckCircle className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                Confirmar Pagamento
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
