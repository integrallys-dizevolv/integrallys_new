'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Eye, FileText, Filter, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { usePrescricoes, type PrescricaoItem } from '@/hooks/use-prescricoes'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { NovaPrescricaoModal, VisualizarPrescricaoModal } from './modals'

export function PrescricoesEspecialistaView() {
  const { data, isLoading, error, createPrescricao, deletePrescricao } = usePrescricoes()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos os Status')
  const [typeFilter, setTypeFilter] = useState('Todos os Tipos')
  const [selectedPrescricao, setSelectedPrescricao] = useState<PrescricaoItem | null>(null)
  const [isNovaPrescricaoOpen, setIsNovaPrescricaoOpen] = useState(false)
  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const searchMatch =
        item.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.numero.toLowerCase().includes(searchTerm.toLowerCase())
      const statusMatch = statusFilter === 'Todos os Status' || item.status === statusFilter
      const typeMatch =
        typeFilter === 'Todos os Tipos' ||
        item.tipo === typeFilter ||
        (typeFilter === 'Medicamentos' && item.tipo === 'Medicamento')
      return searchMatch && statusMatch && typeMatch
    })
  }, [data, searchTerm, statusFilter, typeFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('Todos os Status')
    setTypeFilter('Todos os Tipos')
  }

  const handleDelete = async () => {
    if (!selectedPrescricao) return
    setIsDeleting(true)
    try {
      await deletePrescricao(selectedPrescricao.id)
      toast.success('Prescrição excluída.')
      setIsDeleteOpen(false)
      setSelectedPrescricao(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir a prescrição.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="app-page">
      <PageHeader
        title="Prescrições médicas"
        description="Prescrições para uso externo, exames e orientações clínicas."
        actions={
          <>
            <Button variant="outline" onClick={clearFilters} className="h-11 rounded-integrallys px-4 font-normal">
              Limpar filtros
            </Button>
            <Button onClick={() => setIsNovaPrescricaoOpen(true)} className="h-11 rounded-integrallys px-6 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nova prescrição
            </Button>
          </>
        }
      />

      <div className="overflow-hidden rounded-integrallys-lg border border-app-border bg-app-card shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
        <div className="space-y-8 p-8">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-app-text-primary dark:text-white" />
            <h2 className="text-xl font-normal tracking-tight text-app-text-primary dark:text-white">
              Lista de prescrições
            </h2>
          </div>

          <div className="app-toolbar">
            <div className="relative w-full flex-1">
              <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-app-text-muted" />
              <Input
                placeholder="Buscar por paciente ou número..."
                className="h-12 w-full rounded-[12px] border-app-border bg-app-bg-secondary pl-12 transition-all focus-visible:ring-[var(--app-primary)] dark:border-app-border-dark dark:bg-app-card-dark"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex h-12 min-w-[180px] justify-between gap-3 rounded-[12px] font-normal text-app-text-secondary transition-all hover:bg-app-bg-secondary dark:text-white/80 dark:hover:bg-app-hover"
                  >
                    <div className="flex items-center gap-3">
                      <Filter className="h-4 w-4 text-app-text-muted" />
                      <span className="whitespace-nowrap">
                        {statusFilter === 'Todos os Status' ? 'Todos os status' : statusFilter}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-app-text-muted" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[200px] rounded-integrallys-lg border-app-border bg-app-card p-2 dark:border-app-border-dark dark:bg-app-card-dark">
                  <DropdownMenuItem onClick={() => setStatusFilter('Todos os Status')}>Todos os status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Ativa')}>Ativa</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Expirada')}>Expirada</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('Cancelada')}>Cancelada</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex h-12 min-w-[180px] justify-between gap-3 rounded-[12px] font-normal text-app-text-secondary transition-all hover:bg-app-bg-secondary dark:text-white/80 dark:hover:bg-app-hover"
                  >
                    <div className="flex items-center gap-3">
                      <Filter className="h-4 w-4 text-app-text-muted" />
                      <span className="whitespace-nowrap">
                        {typeFilter === 'Todos os Tipos' ? 'Todos os tipos' : typeFilter}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-app-text-muted" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[220px] rounded-integrallys-lg border-app-border bg-app-card p-2 dark:border-app-border-dark dark:bg-app-card-dark">
                  <DropdownMenuItem onClick={() => setTypeFilter('Todos os Tipos')}>Todos os tipos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('normal')}>Normal</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('manipulada')}>Manipulada</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('evolucao')}>Evolução</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {error && (
            <Card className="rounded-[12px] border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-4 text-sm text-[var(--app-danger-text)]">
              {error}
            </Card>
          )}

          {isLoading ? (
            <div className="text-sm text-app-text-muted">Carregando prescrições...</div>
          ) : filteredData.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-app-border bg-app-bg-secondary/40 p-8 text-center dark:border-app-border-dark dark:bg-app-bg-dark">
              <p className="text-base text-app-text-primary dark:text-white">Nenhuma prescrição encontrada.</p>
              <p className="mt-2 text-sm text-app-text-muted">
                Ajuste os filtros ou cadastre uma nova prescrição para preencher esta listagem.
              </p>
            </div>
          ) : (
            <DataTable data={filteredData}>
              {(pageData) => (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-app-border hover:bg-transparent dark:border-app-border-dark">
                        <TableHead className="py-4 font-normal text-app-text-secondary dark:text-white/60">Número</TableHead>
                        <TableHead className="py-4 font-normal text-app-text-secondary dark:text-white/60">Paciente</TableHead>
                        <TableHead className="py-4 font-normal text-app-text-secondary dark:text-white/60">Data</TableHead>
                        <TableHead className="py-4 font-normal text-app-text-secondary dark:text-white/60">Tipo</TableHead>
                        <TableHead className="py-4 font-normal text-app-text-secondary dark:text-white/60">Validade</TableHead>
                        <TableHead className="py-4 text-center font-normal text-app-text-secondary dark:text-white/60">Status</TableHead>
                        <TableHead className="py-4 text-center font-normal text-app-text-secondary dark:text-white/60">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((item) => (
                        <TableRow
                          key={item.id}
                          className="border-b border-app-border transition-colors hover:bg-app-hover dark:border-app-border-dark dark:hover:bg-app-hover"
                        >
                          <TableCell className="px-2 font-normal text-app-text-primary dark:text-white">{item.numero}</TableCell>
                          <TableCell className="font-normal text-app-text-primary dark:text-white">{item.paciente}</TableCell>
                          <TableCell className="text-app-text-secondary dark:text-white/80">{item.data ?? '--'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="whitespace-nowrap rounded-full border-app-border bg-app-bg-secondary px-3 py-0.5 font-medium text-app-text-secondary dark:border-app-border-dark dark:bg-app-card-dark dark:text-app-text-muted"
                            >
                              {item.tipo ?? '--'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-app-text-secondary dark:text-white/80">{item.validade ?? '--'}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`rounded-[8px] border-0 px-3 py-1.5 text-xs font-normal tracking-wider shadow-sm ${
                                item.status === 'Ativa'
                                  ? 'app-status-success text-white'
                                  : item.status === 'Expirada'
                                    ? 'app-status-warning text-white'
                                    : 'app-status-danger text-white'
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPrescricao(item)
                                  setIsVisualizarOpen(true)
                                }}
                                className="rounded-lg p-2 text-app-text-primary transition-colors hover:bg-app-bg-secondary dark:text-white dark:hover:bg-app-hover"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPrescricao(item)
                                  setIsDeleteOpen(true)
                                }}
                                className="rounded-lg p-2 text-app-text-primary transition-colors hover:bg-app-hover hover:text-[var(--app-danger-text)] dark:text-white dark:hover:bg-app-hover"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DataTable>
          )}
        </div>
      </div>

      <NovaPrescricaoModal
        isOpen={isNovaPrescricaoOpen}
        onClose={() => setIsNovaPrescricaoOpen(false)}
        onSave={async (payload) => {
          await createPrescricao(payload)
        }}
      />

      <VisualizarPrescricaoModal
        isOpen={isVisualizarOpen}
        onClose={() => {
          setIsVisualizarOpen(false)
          setSelectedPrescricao(null)
        }}
        prescricao={selectedPrescricao}
      />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
          <div className="bg-app-card p-8 dark:bg-app-card-dark">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white">Excluir prescrição</DialogTitle>
              <DialogDescription className="text-sm text-app-text-muted">
                Revise a prescrição {selectedPrescricao?.numero ?? 'selecionada'} antes de confirmar a exclusão.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteOpen(false)
                  setSelectedPrescricao(null)
                }}
                className="h-11 rounded-[12px] px-6"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="h-11 rounded-[12px] bg-[var(--app-danger-text)] px-6 text-white"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
