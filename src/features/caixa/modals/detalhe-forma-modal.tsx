'use client'

import { useEffect, useMemo, useState } from 'react'
import { Banknote, Search, X } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SegmentedControl } from '@/components/shared/segmented-control'
import type { CaixaItem } from '@/hooks/use-caixa'

const FORMA_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão crédito',
  cartao_debito: 'Cartão débito',
}

type CartaoSubFilter = 'todos' | 'cartao_credito' | 'cartao_debito'

interface DetalheFormaModalProps {
  open: boolean
  onClose: () => void
  forma: string | null
  items: CaixaItem[]
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formaLabel(forma: string | null | undefined) {
  if (!forma) return 'Dinheiro'
  return FORMA_LABELS[forma] ?? forma
}

function isCartaoForma(forma: string | null) {
  return forma === 'cartao_credito' || forma === 'cartao_debito'
}

export function DetalheFormaModal({ open, onClose, forma, items }: DetalheFormaModalProps) {
  const [search, setSearch] = useState('')
  const [subFilter, setSubFilter] = useState<CartaoSubFilter>('todos')

  const cartaoMode = isCartaoForma(forma)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSubFilter('todos')
  }, [open, forma])

  const filtered = useMemo(() => {
    if (!forma) return []
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      if (item.tipo !== 'entrada') return false

      if (forma === 'dinheiro') {
        if (item.forma !== 'dinheiro' && item.forma) return false
      } else if (cartaoMode) {
        if (subFilter === 'todos') {
          if (item.forma !== 'cartao_credito' && item.forma !== 'cartao_debito') return false
        } else if (item.forma !== subFilter) {
          return false
        }
      } else if (item.forma !== forma) {
        return false
      }

      if (!term) return true
      const haystack = [item.descricao, item.operador, item.bandeira, formaLabel(item.forma)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [items, forma, cartaoMode, subFilter, search])

  const total = useMemo(
    () => filtered.reduce((sum, item) => sum + item.valor, 0),
    [filtered],
  )

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent size="xl" className="gap-0 overflow-hidden rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
        <div className="relative bg-app-card p-8 dark:bg-app-card-dark">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 text-app-text-muted hover:text-app-text-primary dark:hover:text-white"
          >
            <X size={20} />
          </Button>

          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-normal text-app-text-primary dark:text-white">
              <Banknote className="h-5 w-5 text-[var(--app-primary)]" />
              Transações — {formaLabel(forma)}
            </DialogTitle>
            <DialogDescription className="text-sm text-app-text-muted">
              Detalhamento individual das entradas registradas nesta forma de pagamento.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por descrição..."
                  className="h-10 rounded-integrallys pl-9"
                />
              </div>
              {cartaoMode && (
                <SegmentedControl
                  options={[
                    { value: 'todos', label: 'Todos' },
                    { value: 'cartao_credito', label: 'Crédito' },
                    { value: 'cartao_debito', label: 'Débito' },
                  ]}
                  value={subFilter}
                  onChange={(value) => setSubFilter(value as CartaoSubFilter)}
                  className="min-w-[280px]"
                  fullWidth={false}
                />
              )}
            </div>

            <div className="max-h-[420px] overflow-auto rounded-integrallys-lg border border-app-border dark:border-app-border-dark">
              <Table>
                <TableHeader>
                  <TableRow className="bg-app-bg-secondary/50 dark:bg-app-hover/20 border-none">
                    <TableHead className="text-xs font-normal text-app-text-secondary dark:text-white/60">
                      Data/Hora
                    </TableHead>
                    <TableHead className="text-xs font-normal text-app-text-secondary dark:text-white/60">
                      Descrição
                    </TableHead>
                    <TableHead className="text-xs font-normal text-app-text-secondary dark:text-white/60">
                      Forma
                    </TableHead>
                    <TableHead className="text-right text-xs font-normal text-app-text-secondary dark:text-white/60">
                      Valor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-10 text-sm text-app-text-secondary dark:text-white/60"
                      >
                        Nenhuma transação encontrada nesta forma de pagamento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
                      const dataHora = `${item.data ?? ''} ${item.hora ?? ''}`.trim() || '—'
                      const formaParts: string[] = [formaLabel(item.forma)]
                      if (item.bandeira) formaParts.push(item.bandeira)
                      if (item.parcelas && item.parcelas > 1) {
                        formaParts.push(`${item.parcelas}×`)
                      }
                      return (
                        <TableRow
                          key={item.id}
                          className="border-app-border dark:border-app-border-dark"
                        >
                          <TableCell className="text-app-text-secondary dark:text-white/70 whitespace-nowrap">
                            {dataHora}
                          </TableCell>
                          <TableCell className="text-app-text-primary dark:text-white">
                            <div className="flex flex-col">
                              <span>{item.descricao}</span>
                              {item.operador && (
                                <span className="text-xs text-app-text-secondary dark:text-white/60">
                                  por {item.operador}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-app-text-secondary dark:text-white/70">
                            {formaParts.join(' · ')}
                          </TableCell>
                          <TableCell className="text-right font-normal text-[var(--app-success-text)]">
                            R$ {formatBRL(item.valor)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-1 rounded-[12px] border border-app-border bg-app-bg-secondary/40 px-4 py-3 dark:border-app-border-dark dark:bg-app-hover/20 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-app-text-secondary dark:text-white/60">
                {filtered.length} {filtered.length === 1 ? 'transação' : 'transações'}
              </span>
              <span className="text-base font-medium text-app-text-primary dark:text-white">
                Total: R$ {formatBRL(total)}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
              onClick={onClose}
            >
              Fechar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
