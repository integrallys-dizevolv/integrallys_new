'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Building2, Edit2, Eye, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import { useUnidades, type UnidadeItem } from '@/hooks/use-unidades'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ModalType = 'create' | 'edit' | 'view' | 'delete' | null

type FormState = {
  nome: string
  cnpj: string
  endereco: string
  cidade: string
  gestor: string
  status: string
}

const initialFormState: FormState = {
  nome: '',
  cnpj: '',
  endereco: '',
  cidade: '',
  gestor: '',
  status: 'Ativa',
}

export function UnidadesView() {
  const { data, isLoading, error, createUnidade, updateUnidade, deleteUnidade } = useUnidades()
  const [searchFilter, setSearchFilter] = useState('')
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedUnit, setSelectedUnit] = useState<UnidadeItem | null>(null)
  const [formData, setFormData] = useState<FormState>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredUnits = useMemo(() => {
    return data.filter((unit) => {
      const term = searchFilter.toLowerCase()
      return (
        searchFilter === '' ||
        unit.nome.toLowerCase().includes(term) ||
        (unit.cnpj ?? '').toLowerCase().includes(term) ||
        (unit.cidade ?? '').toLowerCase().includes(term)
      )
    })
  }, [data, searchFilter])

  const handleOpenModal = (type: ModalType, unit?: UnidadeItem) => {
    setModalType(type)
    if (unit) {
      setSelectedUnit(unit)
      setFormData({
        nome: unit.nome,
        cnpj: unit.cnpj ?? '',
        endereco: unit.endereco ?? unit.cidade,
        cidade: unit.cidade,
        gestor: unit.gestor ?? '',
        status: unit.status,
      })
    } else {
      setSelectedUnit(null)
      setFormData(initialFormState)
    }
  }

  const handleCloseModal = () => {
    setModalType(null)
    setSelectedUnit(null)
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.cidade) {
      toast.error('Preencha nome e cidade para continuar.')
      return
    }

    setIsSubmitting(true)
    try {
      if (modalType === 'edit' && selectedUnit) {
        await updateUnidade({
          id: selectedUnit.id,
          nome: formData.nome,
          cnpj: formData.cnpj || undefined,
          endereco: formData.endereco || undefined,
          cidade: formData.cidade,
          gestor: formData.gestor || undefined,
          status: formData.status,
        })
        toast.success('Unidade atualizada com sucesso.')
      } else {
        await createUnidade({
          nome: formData.nome,
          cnpj: formData.cnpj || undefined,
          endereco: formData.endereco || undefined,
          cidade: formData.cidade,
          gestor: formData.gestor || undefined,
          status: formData.status,
        })
        toast.success('Unidade criada com sucesso.')
      }
      handleCloseModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a unidade.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUnit) return
    setIsSubmitting(true)
    try {
      await deleteUnidade(selectedUnit.id)
      toast.success('Unidade excluída com sucesso.')
      handleCloseModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir a unidade.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-page app-page-loose">
      <PageHeader
        title="Unidades"
        description="Gerencie as unidades e clínicas sob sua gestão."
        actions={
          <Button
            onClick={() => handleOpenModal('create')}
            className="h-11 shrink-0 rounded-xl bg-app-primary px-6 font-normal text-white shadow-sm"
          >
            <Plus className="h-5 w-5" />
            <span>Adicionar unidade</span>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-app-text-muted" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            className="h-11 rounded-xl border-app-border bg-app-card pl-11 text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:bg-app-card-dark dark:text-white dark:placeholder:text-app-text-muted"
          />
        </div>
      </div>

      <Card className="overflow-hidden rounded-[24px] border-app-border/60 shadow-sm dark:border-app-border-dark">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-card/5">
                <TableRow className="border-app-border hover:bg-transparent dark:border-app-border-dark">
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">Unidade</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">Endereço</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">Gestor</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">Status</TableHead>
                  <TableHead className="px-6 py-4 text-center text-xs font-normal uppercase tracking-wider text-[#6a7282] dark:text-app-text-muted">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <p className="text-base font-normal text-[#6a7282] dark:text-app-text-muted">Carregando unidades...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <EmptyState
                        icon={Building2}
                        title="Nenhuma unidade encontrada."
                        description="Experimente ajustar o filtro de busca."
                        className="border-0 bg-transparent dark:bg-transparent"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUnits.map((unit) => (
                    <TableRow key={unit.id} className="group border-app-border transition-colors hover:bg-app-bg-secondary dark:border-app-border-dark dark:hover:bg-app-hover">
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="max-w-[200px] truncate font-normal text-app-text-primary dark:text-white">{unit.nome}</span>
                          <span className="mt-0.5 text-xs text-[#6a7282] dark:text-app-text-muted">{unit.cnpj ?? '--'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="line-clamp-1 text-sm text-[#6a7282] dark:text-app-text-muted">{unit.endereco ?? unit.cidade}</span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-[#6a7282] dark:text-app-text-muted">
                        {unit.gestor ?? '--'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm">
                        <Badge
                          className={`inline-flex min-h-8 items-center rounded-full border px-3.5 py-1 text-xs font-medium shadow-sm ${
                            unit.status === 'Ativa'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                              : unit.status === 'Em Manutenção'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300'
                                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300'
                          }`}
                        >
                          {unit.status}
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
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-app-border shadow-lg dark:border-app-border-dark">
                              <DropdownMenuItem onClick={() => handleOpenModal('view', unit)} className="rounded-lg py-2.5">
                                <Eye className="mr-3 h-4 w-4 text-app-text-muted" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenModal('edit', unit)} className="rounded-lg py-2.5">
                                <Edit2 className="mr-3 h-4 w-4 text-app-text-muted" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenModal('delete', unit)} className="rounded-lg py-2.5 text-[var(--app-danger-text)]">
                                <Trash2 className="mr-3 h-4 w-4 text-red-400" />
                                Excluir
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

      {(modalType === 'create' || modalType === 'edit' || modalType === 'view') && (
        <Dialog open={modalType !== null} onOpenChange={handleCloseModal}>
          <DialogContent size="lg" className="rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
            <div className="bg-app-card p-8 dark:bg-app-card-dark">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl font-normal text-app-text-primary dark:text-white">
                  {modalType === 'create' ? 'Adicionar unidade' : modalType === 'edit' ? 'Editar unidade' : 'Visualizar unidade'}
                </DialogTitle>
                <DialogDescription className="text-sm text-app-text-muted">
                  {modalType === 'create'
                    ? 'Preencha as informações principais da unidade para seguir com o cadastro.'
                    : modalType === 'edit'
                      ? 'Revise os dados da unidade selecionada antes de salvar as alterações.'
                      : 'Confira os principais dados cadastrais da unidade selecionada.'}
                </DialogDescription>
              </DialogHeader>

              {selectedUnit && (
                <Card className="mt-6 rounded-[18px] border border-app-border bg-app-card p-5 shadow-none dark:border-app-border-dark dark:bg-app-card-dark">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-bg-secondary text-[var(--app-primary)] dark:bg-app-hover dark:text-white">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-normal text-app-text-primary dark:text-white">{selectedUnit.nome}</p>
                        <p className="text-sm text-app-text-muted">{selectedUnit.cnpj ?? 'CNPJ não informado'}</p>
                      </div>
                    </div>
                    <Badge
                      className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                        selectedUnit.status === 'Ativa'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : selectedUnit.status === 'Em Manutenção'
                            ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300'
                            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300'
                      }`}
                    >
                      {selectedUnit.status}
                    </Badge>
                  </div>
                </Card>
              )}

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Nome da unidade</Label>
                  <Input
                    value={formData.nome}
                    disabled={modalType === 'view'}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Clínica Central"
                    className="h-12 rounded-[12px]"
                  />
                </div>
                <div className="space-y-3">
                  <Label>CNPJ</Label>
                  <Input
                    value={formData.cnpj}
                    disabled={modalType === 'view'}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="h-12 rounded-[12px]"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label>Endereço completo</Label>
                  <Input
                    value={formData.endereco}
                    disabled={modalType === 'view'}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="h-12 rounded-[12px]"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.cidade}
                    disabled={modalType === 'view'}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Cidade da unidade"
                    className="h-12 rounded-[12px]"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label>Gestor responsável</Label>
                  <Input
                    value={formData.gestor}
                    disabled={modalType === 'view'}
                    onChange={(e) => setFormData({ ...formData, gestor: e.target.value })}
                    placeholder="Nome do gestor responsável"
                    className="h-12 rounded-[12px]"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Status</Label>
                  <Input
                    value={formData.status}
                    disabled={modalType === 'view'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    placeholder="Ativa"
                    className="h-12 rounded-[12px]"
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="h-11 rounded-[12px] px-6">
                  {modalType === 'view' ? 'Fechar' : 'Cancelar'}
                </Button>
                {modalType !== 'view' && (
                  <Button type="button" onClick={() => void handleSave()} disabled={isSubmitting} className="h-11 rounded-[12px] px-6 text-white">
                    {isSubmitting ? 'Salvando...' : modalType === 'create' ? 'Salvar unidade' : 'Salvar alterações'}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {modalType === 'delete' && (
        <Dialog open={modalType !== null} onOpenChange={handleCloseModal}>
          <DialogContent size="lg" className="rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
            <div className="bg-app-card p-8 dark:bg-app-card-dark">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl font-normal text-app-text-primary dark:text-white">Excluir unidade</DialogTitle>
                <DialogDescription className="text-sm text-app-text-muted">
                  Revise o impacto antes de confirmar a remoção desta unidade da estrutura administrativa.
                </DialogDescription>
              </DialogHeader>

              <Card className="mt-6 rounded-[18px] border border-app-border bg-app-card p-5 shadow-none dark:border-app-border-dark dark:bg-app-card-dark">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm uppercase tracking-[0.16em] text-app-text-muted">Unidade selecionada</p>
                    <p className="text-lg font-normal text-app-text-primary dark:text-white">{selectedUnit?.nome}</p>
                    <p className="text-sm text-app-text-muted">{selectedUnit?.cnpj ?? 'CNPJ não informado'}</p>
                  </div>
                </div>
              </Card>

              <Card className="mt-4 rounded-[18px] border border-app-border bg-app-bg-secondary/35 p-5 shadow-none dark:border-app-border-dark dark:bg-app-hover/40">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-app-text-primary dark:text-white">Impactos desta ação</p>
                  <ul className="space-y-2 text-sm text-app-text-muted">
                    <li>O cadastro deixará de aparecer nas listagens administrativas.</li>
                    <li>Revise vínculos operacionais e históricos antes de concluir a exclusão.</li>
                  </ul>
                </div>
              </Card>

              <div className="mt-8 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="h-11 rounded-[12px] px-6">
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void handleDelete()} disabled={isSubmitting} className="h-11 rounded-[12px] bg-[var(--app-danger-text)] px-6 text-white">
                  Excluir unidade
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {error && (
        <p className="text-sm text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)]">{error}</p>
      )}
    </div>
  )
}
