'use client'

import { Boxes, Edit2, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FornecedorInput, FornecedorItem } from '@/types/fornecedor'
import { useFornecedores } from './hooks/use-fornecedores'
import { FornecedorModal } from './modals/fornecedor-modal'

type ModalType = 'create' | 'edit' | 'delete' | null

export function FornecedoresView() {
  const { data, isLoading, error, createFornecedor, updateFornecedor, deleteFornecedor } =
    useFornecedores()
  const [searchFilter, setSearchFilter] = useState('')
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selected, setSelected] = useState<FornecedorItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filtered = useMemo(() => {
    const term = searchFilter.trim().toLowerCase()
    return data.filter((item) => {
      if (!term) return true
      return (
        item.nome.toLowerCase().includes(term) ||
        (item.razaoSocial ?? '').toLowerCase().includes(term) ||
        (item.cnpj ?? '').toLowerCase().includes(term) ||
        (item.contatoNome ?? '').toLowerCase().includes(term)
      )
    })
  }, [data, searchFilter])

  const stats = useMemo(() => {
    const total = data.length
    const ativos = data.filter((item) => item.status === 'Ativo').length
    const comCnpj = data.filter((item) => !!item.cnpj).length
    return { total, ativos, comCnpj }
  }, [data])

  const handleOpenCreate = () => {
    setSelected(null)
    setModalType('create')
  }

  const handleOpenEdit = (item: FornecedorItem) => {
    setSelected(item)
    setModalType('edit')
  }

  const handleOpenDelete = (item: FornecedorItem) => {
    setSelected(item)
    setModalType('delete')
  }

  const handleCloseModal = () => {
    setModalType(null)
    setSelected(null)
  }

  const handleSave = async (payload: FornecedorInput) => {
    if (modalType === 'edit' && selected) {
      await updateFornecedor({ ...payload, id: selected.id })
      toast.success('Fornecedor atualizado.')
    } else {
      await createFornecedor(payload)
      toast.success('Fornecedor cadastrado.')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsSubmitting(true)
    try {
      await deleteFornecedor(selected.id)
      toast.success('Fornecedor inativado.')
      handleCloseModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível inativar o fornecedor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-page app-page-loose app-page-frame pb-10">
      <PageHeader
        title="Fornecedores"
        description="Cadastre fornecedores com razão social, CNPJ e contato comercial."
        actions={
          <Button
            onClick={handleOpenCreate}
            className="h-11 shrink-0 rounded-xl bg-app-primary px-6 font-normal text-white shadow-sm"
          >
            <Plus className="h-5 w-5" />
            <span>Novo fornecedor</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total cadastrados" value={stats.total} />
        <StatCard label="Ativos" value={stats.ativos} iconTone="success" />
        <StatCard label="Com CNPJ" value={stats.comCnpj} />
      </div>

      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-app-text-muted" />
        <Input
          placeholder="Buscar por nome, razão social, CNPJ ou contato..."
          value={searchFilter}
          onChange={(event) => setSearchFilter(event.target.value)}
          className="h-11 rounded-xl border-app-border bg-app-card pl-11 text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:bg-app-card-dark dark:text-white dark:placeholder:text-app-text-muted"
        />
      </div>

      <Card className="overflow-hidden rounded-2xl border-app-border/60 shadow-sm dark:border-app-border-dark">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-card/5">
                <TableRow className="border-app-border hover:bg-transparent dark:border-app-border-dark">
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">
                    Fornecedor
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">
                    CNPJ
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">
                    Contato
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
                        Carregando fornecedores...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <EmptyState
                        icon={Boxes}
                        title="Nenhum fornecedor cadastrado."
                        description="Cadastre o primeiro fornecedor para registrar compras e repasses."
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
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-normal text-app-text-primary dark:text-white">
                            {item.nome}
                          </span>
                          <span className="text-xs text-[#6a7282] dark:text-app-text-muted">
                            {item.razaoSocial || item.email || '--'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-[#6a7282] dark:text-app-text-muted">
                        {item.cnpj || '--'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-[#6a7282] dark:text-app-text-muted">
                        {item.contatoNome
                          ? `${item.contatoNome}${item.contatoSetor ? ` · ${item.contatoSetor}` : ''}`
                          : (item.telefone ?? '--')}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          className={
                            item.status === 'Ativo'
                              ? 'app-status-success border-none shadow-sm font-normal'
                              : 'app-status-neutral border-none shadow-sm font-normal'
                          }
                        >
                          {item.status === 'Ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg border border-transparent text-[#6a7282] hover:border-app-border hover:bg-app-bg-secondary hover:shadow-sm dark:text-app-text-muted dark:hover:border-app-border-dark dark:hover:bg-app-hover"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl border-app-border shadow-lg dark:border-app-border-dark"
                            >
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(item)}
                                className="rounded-lg py-2.5"
                              >
                                <Edit2 className="mr-3 h-4 w-4 text-app-text-muted" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenDelete(item)}
                                className="rounded-lg py-2.5 text-[var(--app-danger-text)]"
                              >
                                <Trash2 className="mr-3 h-4 w-4 text-red-400" />
                                Inativar
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

      <FornecedorModal
        isOpen={modalType === 'create' || modalType === 'edit'}
        mode={modalType === 'edit' ? 'edit' : 'create'}
        initial={modalType === 'edit' ? selected : null}
        onClose={handleCloseModal}
        onSave={handleSave}
      />

      <Dialog open={modalType === 'delete'} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent
          size="sm"
          className="rounded-[24px] border border-app-border bg-app-card p-8 shadow-lg dark:border-app-border-dark dark:bg-app-card-dark"
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-normal text-app-text-primary dark:text-white">
              Inativar fornecedor
            </DialogTitle>
            <DialogDescription className="font-normal text-app-text-secondary dark:text-white/60">
              O fornecedor <strong>{selected?.nome ?? ''}</strong> será marcado como inativo. O
              cadastro não é apagado e pode ser reativado pela edição.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              className="rounded-xl border-app-border font-normal dark:border-app-border-dark"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[var(--app-danger-text)] font-normal text-white hover:opacity-90"
              onClick={() => void handleDelete()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Inativando...' : 'Inativar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
