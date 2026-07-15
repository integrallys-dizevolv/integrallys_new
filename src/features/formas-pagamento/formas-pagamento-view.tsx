'use client'

import { CreditCard, Edit2, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type FormaPagamentoItem, useFormasPagamento } from './hooks/use-formas-pagamento'

type ModalType = 'create' | 'edit' | 'delete' | null

const TIPO_OPCOES: Array<{ value: string; label: string }> = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
]

const tipoLabel = (tipo: string) => TIPO_OPCOES.find((opt) => opt.value === tipo)?.label ?? tipo

type FormState = { nome: string; tipo: string; ativo: boolean }
const initialFormState: FormState = { nome: '', tipo: 'dinheiro', ativo: true }

export function FormasPagamentoView() {
  const { data, isLoading, error, createForma, updateForma, deleteForma } = useFormasPagamento()
  const [searchFilter, setSearchFilter] = useState('')
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selected, setSelected] = useState<FormaPagamentoItem | null>(null)
  const [formData, setFormData] = useState<FormState>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filtered = useMemo(() => {
    const term = searchFilter.trim().toLowerCase()
    return data.filter((item) => {
      if (!term) return true
      return (
        item.nome.toLowerCase().includes(term) || tipoLabel(item.tipo).toLowerCase().includes(term)
      )
    })
  }, [data, searchFilter])

  const handleOpen = (type: ModalType, item?: FormaPagamentoItem) => {
    setModalType(type)
    if (item) {
      setSelected(item)
      setFormData({ nome: item.nome, tipo: item.tipo, ativo: item.ativo })
      return
    }
    setSelected(null)
    setFormData(initialFormState)
  }

  const handleClose = () => {
    setModalType(null)
    setSelected(null)
    setFormData(initialFormState)
  }

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Informe o nome da forma de pagamento.')
      return
    }
    setIsSubmitting(true)
    try {
      if (modalType === 'edit' && selected) {
        await updateForma({
          id: selected.id,
          nome: formData.nome.trim(),
          tipo: formData.tipo,
          ativo: formData.ativo,
        })
        toast.success('Forma de pagamento atualizada.')
      } else {
        await createForma({
          nome: formData.nome.trim(),
          tipo: formData.tipo,
          ativo: formData.ativo,
        })
        toast.success('Forma de pagamento criada.')
      }
      handleClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Não foi possível salvar a forma de pagamento.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsSubmitting(true)
    try {
      await deleteForma(selected.id)
      toast.success('Forma de pagamento desativada.')
      handleClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Não foi possível remover a forma de pagamento.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-page app-page-loose app-page-frame pb-10">
      <PageHeader
        title="Formas de pagamento"
        description="Catálogo compartilhado por Financeiro, Caixa e Gestão Bancária. Cartões cadastrados geram sua própria forma automaticamente."
        actions={
          <Button
            onClick={() => handleOpen('create')}
            className="h-11 shrink-0 rounded-xl bg-app-primary px-6 font-normal text-white shadow-sm"
          >
            <Plus className="h-5 w-5" />
            <span>Nova forma</span>
          </Button>
        }
      />

      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-app-text-muted" />
        <Input
          placeholder="Buscar por nome ou tipo..."
          value={searchFilter}
          onChange={(event) => setSearchFilter(event.target.value)}
          className="h-11 rounded-xl border-app-border bg-app-card pl-11 text-sm font-normal shadow-sm dark:bg-app-card-dark dark:text-white"
        />
      </div>

      <Card className="overflow-hidden rounded-2xl border-app-border/60 shadow-sm dark:border-app-border-dark">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-card/5">
                <TableRow className="border-app-border hover:bg-transparent dark:border-app-border-dark">
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">
                    Nome
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">
                    Tipo
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">
                    Origem
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">
                    Status
                  </TableHead>
                  <TableHead className="px-6 py-4 text-center text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <p className="text-base font-normal text-[#6a7282] dark:text-app-text-muted">
                        Carregando formas de pagamento...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <EmptyState
                        icon={CreditCard}
                        title="Nenhuma forma cadastrada."
                        description="Adicione a primeira forma de pagamento (ex.: Dinheiro, PIX)."
                        className="border-0 bg-transparent dark:bg-transparent"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow
                      key={item.id}
                      className="group border-app-border transition-colors hover:bg-app-bg-secondary dark:border-app-border-dark dark:hover:bg-app-hover"
                    >
                      <TableCell className="px-6 py-4 font-normal text-app-text-primary dark:text-white">
                        {item.nome}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-[#6a7282] dark:text-app-text-muted">
                        {tipoLabel(item.tipo)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-[#6a7282] dark:text-app-text-muted">
                        {item.cartaoId ? 'Cartão' : 'Manual'}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          className={
                            item.ativo
                              ? 'app-status-success border-none shadow-sm font-normal'
                              : 'app-status-neutral border-none shadow-sm font-normal'
                          }
                        >
                          {item.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg border border-transparent text-[#6a7282] hover:border-app-border hover:bg-app-bg-secondary dark:text-app-text-muted dark:hover:border-app-border-dark dark:hover:bg-app-hover"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl border-app-border shadow-lg dark:border-app-border-dark"
                            >
                              <DropdownMenuItem
                                onClick={() => handleOpen('edit', item)}
                                className="rounded-lg py-2.5"
                              >
                                <Edit2 className="mr-3 h-4 w-4 text-app-text-muted" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpen('delete', item)}
                                className="rounded-lg py-2.5 text-[var(--app-danger-text)]"
                              >
                                <Trash2 className="mr-3 h-4 w-4 text-red-400" />
                                Desativar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-[var(--app-danger-text)]">{error}</p> : null}

      <Dialog
        open={modalType === 'create' || modalType === 'edit'}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent className="rounded-[24px] border border-app-border bg-app-card p-0 shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
          <div className="p-8 space-y-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-normal text-app-text-primary dark:text-white">
                {modalType === 'create' ? 'Nova forma de pagamento' : 'Editar forma de pagamento'}
              </DialogTitle>
              <DialogDescription className="font-normal text-app-text-secondary dark:text-white/60">
                Formas ficam disponíveis nos formulários de Financeiro e Caixa.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5">
              <div className="space-y-2">
                <Label className="font-normal text-app-text-primary dark:text-white/80">Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, nome: event.target.value }))
                  }
                  placeholder="Ex.: Dinheiro, PIX, Boleto"
                  className="h-12 rounded-2xl border-app-border bg-app-bg-secondary font-normal dark:border-app-border-dark dark:bg-app-hover"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-normal text-app-text-primary dark:text-white/80">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData((current) => ({ ...current, tipo: value }))}
                >
                  <SelectTrigger className="h-12 rounded-2xl border-app-border bg-app-bg-secondary font-normal dark:border-app-border-dark dark:bg-app-hover">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPCOES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-app-border px-4 py-3 dark:border-app-border-dark">
                <div>
                  <p className="font-normal text-app-text-primary dark:text-white">Ativa</p>
                  <p className="text-sm text-app-text-secondary dark:text-white/60 font-normal">
                    Formas inativas deixam de aparecer nos formulários.
                  </p>
                </div>
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(value) =>
                    setFormData((current) => ({ ...current, ativo: value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="rounded-xl border-app-border font-normal dark:border-app-border-dark"
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-app-primary font-normal text-white shadow-sm hover:bg-app-primary-hover"
                onClick={() => void handleSave()}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalType === 'delete'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          size="sm"
          className="rounded-[24px] border border-app-border bg-app-card p-8 shadow-lg dark:border-app-border-dark dark:bg-app-card-dark"
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-normal text-app-text-primary dark:text-white">
              Desativar forma
            </DialogTitle>
            <DialogDescription className="font-normal text-app-text-secondary dark:text-white/60">
              A forma <strong>{selected?.nome ?? ''}</strong> será marcada como inativa (não é
              apagada — lançamentos históricos continuam válidos).
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              className="rounded-xl border-app-border font-normal dark:border-app-border-dark"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[var(--app-danger-text)] font-normal text-white hover:opacity-90"
              onClick={() => void handleDelete()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Desativando...' : 'Desativar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
