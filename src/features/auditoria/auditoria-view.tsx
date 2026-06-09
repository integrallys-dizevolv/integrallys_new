'use client'

import { useMemo, useState } from 'react'
import { Download, Eye, MoreVertical } from 'lucide-react'
import { useAuditoria, type AuditoriaItem } from '@/features/auditoria/hooks/use-auditoria'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

const parseAuditDate = (value: string) => {
  const normalized = value.trim()
  const nativeDate = new Date(normalized)
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate
  }

  const [datePart, timePart = '00:00'] = normalized.split(' ')
  const [day, month, year] = datePart.split('/').map(Number)
  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(':').map(Number)

  if (!day || !month || !year) {
    return null
  }

  return new Date(year, month - 1, day, hours, minutes, seconds)
}

const getAcaoBadgeVariant = (acao: string): BadgeVariant => {
  switch (acao) {
    case 'CRIAR':
      return 'default'
    case 'EDITAR':
      return 'outline'
    case 'DELETAR':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export function AuditoriaView() {
  const { data, isLoading, error } = useAuditoria()
  const [selectedLog, setSelectedLog] = useState<AuditoriaItem | null>(null)
  const [filters, setFilters] = useState({
    dataInicial: '',
    dataFinal: '',
    acao: 'todas',
    modulo: 'todos',
    search: '',
  })

  const filteredLogs = useMemo(() => {
    return data.filter((log) => {
      const logDate = parseAuditDate(log.data)
      if (filters.dataInicial && logDate) {
        const startDate = new Date(`${filters.dataInicial}T00:00:00`)
        if (logDate < startDate) return false
      }

      if (filters.dataFinal && logDate) {
        const endDate = new Date(`${filters.dataFinal}T23:59:59.999`)
        if (logDate > endDate) return false
      }

      if (filters.acao !== 'todas' && log.acao !== filters.acao) return false
      if (filters.modulo !== 'todos' && (log.modulo ?? '') !== filters.modulo) return false

      if (filters.search) {
        const search = filters.search.toLowerCase()
        const text = `${log.usuario} ${log.descricao ?? ''} ${log.ip ?? ''}`.toLowerCase()
        if (!text.includes(search)) return false
      }

      return true
    })
  }, [data, filters])

  const clearFilters = () => {
    setFilters({
      dataInicial: '',
      dataFinal: '',
      acao: 'todas',
      modulo: 'todos',
      search: '',
    })
  }

  return (
    <div className="app-page app-page-loose">
      <PageHeader
        title="Log de auditoria"
        description="Acompanhe ações críticas do sistema, filtros de rastreio e detalhes das operações registradas."
        actions={
          <Badge variant="outline" className="w-fit rounded-full border-app-border px-3 py-1 text-xs font-normal text-app-text-secondary dark:border-app-border-dark dark:text-white/75">
            {filteredLogs.length} registros
          </Badge>
        }
      />

      <Card className="rounded-[24px] border-app-border bg-app-card p-4 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark md:p-6">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Data inicial</Label>
            <Input
              type="date"
              value={filters.dataInicial}
              onChange={(event) => setFilters((prev) => ({ ...prev, dataInicial: event.target.value }))}
              className="h-11 rounded-xl border-app-border bg-app-card text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:border-app-border-dark dark:bg-app-card-dark dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Data final</Label>
            <Input
              type="date"
              value={filters.dataFinal}
              onChange={(event) => setFilters((prev) => ({ ...prev, dataFinal: event.target.value }))}
              className="h-11 rounded-xl border-app-border bg-app-card text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:border-app-border-dark dark:bg-app-card-dark dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Ação</Label>
            <Select value={filters.acao} onValueChange={(value) => setFilters((prev) => ({ ...prev, acao: value }))}>
              <SelectTrigger className="h-11 rounded-xl border-app-border bg-app-card text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:border-app-border-dark dark:bg-app-card-dark dark:text-white">
                <SelectValue preferPlaceholder placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-app-border shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                <SelectItem value="todas">Todos</SelectItem>
                <SelectItem value="CRIAR">Criar</SelectItem>
                <SelectItem value="EDITAR">Editar</SelectItem>
                <SelectItem value="DELETAR">Deletar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Módulo</Label>
            <Select value={filters.modulo} onValueChange={(value) => setFilters((prev) => ({ ...prev, modulo: value }))}>
              <SelectTrigger className="h-11 rounded-xl border-app-border bg-app-card text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:border-app-border-dark dark:bg-app-card-dark dark:text-white">
                <SelectValue preferPlaceholder placeholder="Todos os módulos" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-app-border shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Agendamento">Agendamento</SelectItem>
                <SelectItem value="Prontuário">Prontuário</SelectItem>
                <SelectItem value="Paciente">Paciente</SelectItem>
                <SelectItem value="Usuário">Usuário</SelectItem>
                <SelectItem value="Produto">Produto</SelectItem>
                <SelectItem value="Permissões">Permissões</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-full gap-2">
            <Button variant="outline" className="h-11 rounded-lg px-4 font-normal" onClick={clearFilters}>
              Limpar filtros
            </Button>
            <Button disabled className="h-11 flex-1 rounded-lg bg-app-primary px-4 font-normal text-white shadow-sm opacity-70">
              <Download className="h-4 w-4 shrink-0" />
              <span className="text-sm leading-none">Exportar</span>
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="rounded-integrallys-lg border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-4 text-sm text-[var(--app-danger-text)]">
          {error}
        </Card>
      )}

      <Card className="table-scroll overflow-hidden rounded-[24px] border-app-border/60 shadow-sm dark:border-app-border-dark">
        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-app-text-muted dark:text-white/40">Carregando logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-app-text-muted dark:text-white/40">Nenhum log encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          <DataTable data={filteredLogs}>
            {(pageData) => (
              <Table>
                <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-hover">
                  <TableRow>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-app-text-secondary">Data/hora</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-app-text-secondary">Usuário</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-app-text-secondary">Ação</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-app-text-secondary">Módulo</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-app-text-secondary">Descrição</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-app-text-secondary">IP</TableHead>
                    <TableHead className="text-center text-xs font-medium uppercase tracking-wider text-app-text-secondary">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-normal text-app-text-secondary dark:text-app-text-muted">{log.data}</TableCell>
                      <TableCell className="font-normal text-app-text-primary dark:text-white">{log.usuario}</TableCell>
                      <TableCell>
                        <Badge variant={getAcaoBadgeVariant(log.acao)} className="rounded-full px-3 py-1 text-xs font-medium shadow-sm">
                          {log.acao.charAt(0).toUpperCase() + log.acao.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                          {log.modulo ?? '--'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm font-normal text-app-text-secondary dark:text-app-text-muted">
                        {log.descricao ?? '--'}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-normal text-app-text-secondary dark:text-app-text-muted">{log.ip ?? '--'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="flex h-8 w-8 items-center justify-center">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl border-app-border p-2 shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                              <DropdownMenuItem onClick={() => setSelectedLog(log)} className="rounded-lg px-3 py-2.5 font-medium">
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar detalhes
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTable>
        )}
      </Card>

      <Dialog open={selectedLog !== null} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent size="lg" className="gap-0 overflow-hidden rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
          <div className="bg-app-card p-8 dark:bg-app-card-dark">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white">Detalhes do log de auditoria</DialogTitle>
              <DialogDescription className="text-sm text-app-text-muted">
                Informações completas sobre a ação registrada.
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="mt-6 space-y-5">
                <div className="flex flex-col gap-4 rounded-[18px] border border-app-border bg-app-bg-secondary/40 p-5 dark:border-app-border-dark dark:bg-app-bg-dark/40 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-info-bg)] text-[var(--app-info-text)]">
                      <Eye className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-base font-normal text-app-text-primary dark:text-white">{selectedLog.usuario}</p>
                      <p className="text-sm text-app-text-muted">{selectedLog.data}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full border-app-border px-3 py-1 text-xs font-normal text-app-text-secondary dark:border-app-border-dark dark:text-white/75">
                    {selectedLog.modulo ?? 'Sem módulo'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Data e hora</Label>
                  <div className="flex h-11 items-center rounded-xl border border-app-border bg-app-bg-secondary px-4 text-base text-app-text-primary dark:border-app-border-dark dark:bg-app-card/5 dark:text-white">
                    {selectedLog.data}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Usuário</Label>
                  <div className="flex h-11 items-center rounded-xl border border-app-border bg-app-bg-secondary px-4 text-base text-app-text-primary dark:border-app-border-dark dark:bg-app-card/5 dark:text-white">
                    {selectedLog.usuario}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Ação</Label>
                  <div className="flex h-11 items-center rounded-xl border border-app-border bg-app-bg-secondary px-4 dark:border-app-border-dark dark:bg-app-card/5">
                    <Badge variant={getAcaoBadgeVariant(selectedLog.acao)} className="px-3 py-1 font-normal">
                      {selectedLog.acao.charAt(0).toUpperCase() + selectedLog.acao.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Módulo</Label>
                  <div className="flex h-11 items-center rounded-xl border border-app-border bg-app-bg-secondary px-4 dark:border-app-border-dark dark:bg-app-card/5">
                    <Badge variant="outline" className="border-app-border bg-app-card px-3 py-1 font-normal text-app-text-primary dark:border-white/20 dark:bg-app-card/10 dark:text-white">
                      {selectedLog.modulo ?? '--'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-1">
                  <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Endereço IP</Label>
                  <div className="flex h-11 items-center rounded-xl border border-app-border bg-app-bg-secondary px-4 font-mono text-base text-app-text-primary dark:border-app-border-dark dark:bg-app-card/5 dark:text-white">
                    {selectedLog.ip ?? '--'}
                  </div>
                </div>

                <div className="col-span-1 space-y-2 sm:col-span-2">
                  <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Descrição completa</Label>
                  <div className="flex min-h-[44px] items-center rounded-xl border border-app-border bg-app-bg-secondary px-4 py-3 text-base text-app-text-primary dark:border-app-border-dark dark:bg-app-card/5 dark:text-white">
                    {selectedLog.descricao ?? 'Sem descrição detalhada.'}
                  </div>
                </div>
              </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setSelectedLog(null)} className="h-11 rounded-xl bg-app-primary px-8 font-normal text-white shadow-sm">
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
