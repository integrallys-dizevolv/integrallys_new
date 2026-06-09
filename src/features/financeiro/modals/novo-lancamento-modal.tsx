'use client'

import { CalendarDays } from 'lucide-react'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { NewLancamentoState } from '../hooks/use-lancamento-form'

interface Props {
  open: boolean
  onClose: () => void
  form: NewLancamentoState
  onChange: (form: NewLancamentoState) => void
  onSave: () => void
}

export function NovoLancamentoModal({ open, onClose, form, onChange, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent size="lg" className="gap-0 rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
        <div className="flex flex-col bg-app-card dark:bg-app-card-dark">
          <ModalHeader
            className="px-8 pb-6 pt-8"
            title="Novo lançamento"
            description="Preencha as informações principais do lançamento financeiro para revisão."
          />

          <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2 custom-scrollbar">
          <div className="rounded-[18px] border border-app-border bg-app-bg-secondary/35 p-5 dark:border-app-border-dark dark:bg-app-hover/40">
            <p className="text-xs uppercase tracking-[0.16em] text-app-text-muted">Natureza do lançamento</p>
            <div className="mt-3 flex gap-2 rounded-integrallys-lg bg-app-card p-1.5 dark:bg-app-card-dark">
              <button
                type="button"
                onClick={() => onChange({ ...form, tipo: 'receita' })}
                className={`flex-1 rounded-[12px] px-4 py-2.5 text-sm transition-all ${
                  form.tipo === 'receita'
                    ? 'bg-app-primary text-white shadow-sm'
                    : 'text-app-text-secondary hover:bg-app-bg-secondary dark:text-app-text-muted dark:hover:bg-app-hover'
                }`}
              >
                Receita
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...form, tipo: 'despesa' })}
                className={`flex-1 rounded-[12px] px-4 py-2.5 text-sm transition-all ${
                  form.tipo === 'despesa'
                    ? 'bg-app-primary text-white shadow-sm'
                    : 'text-app-text-secondary hover:bg-app-bg-secondary dark:text-app-text-muted dark:hover:bg-app-hover'
                }`}
              >
                Despesa
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3 md:col-span-2">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(event) => onChange({ ...form, descricao: event.target.value })} placeholder="Descreva o lançamento" className="h-12 rounded-[12px]" />
            </div>
            <div className="space-y-3">
              <Label>Categoria</Label>
              <Input value={form.categoria} onChange={(event) => onChange({ ...form, categoria: event.target.value })} placeholder="Categoria financeira" className="h-12 rounded-[12px]" />
            </div>
            <div className="space-y-3">
              <Label>Valor</Label>
              <Input value={form.valor} onChange={(event) => onChange({ ...form, valor: event.target.value })} placeholder="R$ 0,00" className="h-12 rounded-[12px]" />
            </div>
            <div className="space-y-3">
              <Label>Data</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
                <Input value={form.data} onChange={(event) => onChange({ ...form, data: event.target.value })} placeholder="dd/mm/aaaa" className="h-12 rounded-[12px] pl-10" />
              </div>
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(event) => onChange({ ...form, observacoes: event.target.value })} placeholder="Informações adicionais sobre o lançamento" className="min-h-[110px] rounded-[12px]" />
            </div>
          </div>
          </div>
          <DialogFooter className="border-t border-app-border bg-app-bg-secondary/35 px-8 py-6 dark:border-app-border-dark dark:bg-app-hover/30">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-[12px] px-6">
              Cancelar
            </Button>
            <Button type="button" className="h-11 rounded-[12px] px-6 text-white" onClick={onSave}>
              Revisar lançamento
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
