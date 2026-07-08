'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CreditCard,
  Download,
  Edit,
  Eye,
  RotateCcw,
  X,
} from 'lucide-react'
import { InfoField } from '@/components/shared/info-field'
import { CobrarOnlineModal } from '@/features/financeiro/modals/cobrar-online-modal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { CreateFinanceiroPayload, FinanceiroItem } from '@/hooks/use-financeiro'
import { formatCurrency } from '../financeiro.utils'
import type { NewLancamentoState } from '../hooks/use-lancamento-form'

interface LancamentoViewModalProps {
  open: boolean
  onClose: () => void
  item: FinanceiroItem | null
}

export function LancamentoViewModal({ open, onClose, item }: LancamentoViewModalProps) {
  const [cobrarOpen, setCobrarOpen] = useState(false)
  const podeCobrarOnline =
    !!item && item.tipo === 'receita' && !/pago|quitado|liquidado/i.test(item.status || '')

  return (
    <>
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[95%] rounded-[24px] border border-app-border p-0 overflow-hidden dark:border-app-border-dark">
        <div className="relative bg-app-card dark:bg-app-card-dark">
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4 z-10 text-app-text-muted hover:text-app-text-primary dark:hover:text-white">
            <X size={20} />
          </Button>
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-app-bg-secondary dark:bg-app-card/5 flex items-center justify-center shrink-0">
                <Eye className="h-5 w-5 text-app-text-secondary dark:text-white/60" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">Detalhes</DialogTitle>
                <DialogDescription className="text-sm font-normal text-app-text-secondary dark:text-white/60">
                  Informações da movimentação
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {item && (
            <div className="px-6 pb-6 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <InfoField label="Descrição" value={item.descricao} />
                <InfoField label="Valor total">
                  <p className={`text-lg font-normal ${item.tipo === 'receita' ? 'text-[var(--app-success-text)]' : 'text-[var(--app-danger-text)]'}`}>
                    {formatCurrency(item.valor)}
                  </p>
                </InfoField>
                <InfoField label="Data e hora" value={item.data || '-'} />
                <InfoField label="Categoria" value={item.categoria} />
                <InfoField label="Forma" value={item.metodo || '-'} />
                <InfoField label="Status" value={item.status || 'Pendente'} />
              </div>
              <div className="overflow-hidden rounded-xl border border-dashed border-app-border dark:border-app-border-dark p-3 flex items-center gap-3 bg-app-bg-secondary/30 dark:bg-transparent">
                <AlertTriangle className="h-4 w-4 text-[var(--app-primary)] shrink-0" />
                <p className="text-xs text-app-text-secondary dark:text-white/60 leading-relaxed italic font-normal">
                  Registro financeiro exibido conforme os dados retornados pela API administrativa.
                </p>
              </div>
              <DialogFooter className="border-t border-app-border pt-5 dark:border-app-border-dark">
                <Button variant="outline" className="w-full sm:flex-1 h-11 rounded-xl font-normal border-app-border dark:border-app-border-dark">
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
                {podeCobrarOnline && (
                  <Button
                    variant="outline"
                    onClick={() => setCobrarOpen(true)}
                    className="w-full sm:flex-1 h-11 rounded-xl font-normal border-app-border dark:border-app-border-dark"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Cobrar online
                  </Button>
                )}
                <Button className="w-full sm:flex-1 h-11 bg-app-primary hover:bg-app-primary-hover text-white font-normal rounded-xl">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    {item && (
      <CobrarOnlineModal
        isOpen={cobrarOpen}
        onClose={(open) => setCobrarOpen(open)}
        lancamentoId={item.id}
        valor={item.valor}
        descricao={item.descricao}
      />
    )}
    </>
  )
}

interface LancamentoEditModalProps {
  open: boolean
  onClose: () => void
  form: NewLancamentoState
  onChange: (form: NewLancamentoState) => void
  onSave: () => void
}

export function LancamentoEditModal({ open, onClose, form, onChange, onSave }: LancamentoEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[95%] rounded-[24px] border border-app-border p-0 overflow-hidden dark:border-app-border-dark">
        <div className="relative bg-app-card dark:bg-app-card-dark">
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4 z-10 text-app-text-muted hover:text-app-text-primary dark:hover:text-white">
            <X size={20} />
          </Button>
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-app-bg-secondary dark:bg-app-card/5 flex items-center justify-center shrink-0">
                <Edit className="h-5 w-5 text-app-text-secondary dark:text-white/60" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">Editar</DialogTitle>
                <DialogDescription className="text-sm font-normal text-app-text-secondary dark:text-white/60">
                  Ajuste os dados principais do lançamento selecionado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="rounded-xl border border-app-border bg-app-bg-secondary/35 p-4 dark:border-app-border-dark dark:bg-app-card/5">
              <p className="text-xs uppercase tracking-[0.16em] text-app-text-muted">Lançamento em edição</p>
              <p className="mt-2 text-base font-normal text-app-text-primary dark:text-white">{form.descricao || 'Sem descrição'}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(value) => onChange({ ...form, tipo: value as CreateFinanceiroPayload['tipo'] })}>
                  <SelectTrigger className="h-11 rounded-xl border-app-border dark:border-app-border-dark bg-app-bg-secondary/50 dark:bg-app-card/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(event) => onChange({ ...form, data: event.target.value })} className="h-11 rounded-xl border-app-border dark:border-app-border-dark bg-app-bg-secondary/50 dark:bg-app-card/5" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={(event) => onChange({ ...form, descricao: event.target.value })} className="h-11 rounded-xl border-app-border dark:border-app-border-dark bg-app-bg-secondary/50 dark:bg-app-card/5" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={(event) => onChange({ ...form, categoria: event.target.value })} className="h-11 rounded-xl border-app-border dark:border-app-border-dark bg-app-bg-secondary/50 dark:bg-app-card/5" />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input value={form.valor} onChange={(event) => onChange({ ...form, valor: event.target.value })} className="h-11 rounded-xl border-app-border dark:border-app-border-dark bg-app-bg-secondary/50 dark:bg-app-card/5" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(event) => onChange({ ...form, observacoes: event.target.value })} className="min-h-[110px] rounded-xl border-app-border dark:border-app-border-dark bg-app-bg-secondary/50 dark:bg-app-card/5" />
              </div>
            </div>
            <DialogFooter className="border-t border-app-border pt-5 dark:border-app-border-dark">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:flex-1 h-11 rounded-xl font-normal border-app-border dark:border-app-border-dark">
                Cancelar
              </Button>
              <Button type="button" className="w-full sm:flex-1 h-11 rounded-xl text-white font-normal" onClick={onSave}>
                Salvar alterações
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface LancamentoDeleteModalProps {
  open: boolean
  onClose: () => void
  item: FinanceiroItem | null
  onConfirm: () => void
}

export function LancamentoDeleteModal({ open, onClose, item, onConfirm }: LancamentoDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[95%] rounded-[24px] border border-app-border p-0 overflow-hidden dark:border-app-border-dark">
        <div className="relative bg-app-card dark:bg-app-bg-dark">
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4 z-10 text-app-text-muted hover:text-app-text-primary dark:hover:text-white">
            <X size={20} />
          </Button>
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl app-status-danger flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-[var(--app-danger-text)]" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-xl font-normal text-[var(--app-danger-text)] tracking-tight">Excluir</DialogTitle>
                <DialogDescription className="text-sm font-normal text-app-text-secondary dark:text-white/60">
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <p className="text-sm text-app-text-secondary dark:text-white/80 leading-relaxed font-normal mt-2">
              Deseja realmente excluir o lançamento <span className="font-normal text-app-text-primary dark:text-white underline underline-offset-4 decoration-red-500/30">{item?.descricao}</span>?
            </p>
            <div className="p-4 bg-app-bg-secondary/50 dark:bg-app-card/[0.02] rounded-xl border border-app-border dark:border-app-border-dark space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-app-text-secondary dark:text-white/60 font-normal">Valor:</span>
                <span className="font-normal text-[var(--app-danger-text)]">{item ? formatCurrency(item.valor) : ''}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-app-text-secondary dark:text-white/60 font-normal">Data:</span>
                <span className="font-normal text-app-text-primary dark:text-white">{item?.data || '-'}</span>
              </div>
            </div>
            <DialogFooter className="border-t border-app-border pt-5 dark:border-app-border-dark">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:flex-1 h-11 rounded-xl font-normal border-app-border dark:border-app-border-dark">
                Cancelar
              </Button>
              <Button type="button" className="w-full sm:flex-1 h-11 bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white font-normal rounded-xl" onClick={onConfirm}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
