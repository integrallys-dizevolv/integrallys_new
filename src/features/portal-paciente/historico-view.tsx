'use client'

import { useMemo, useState } from 'react'
import { Download, FileText, History } from 'lucide-react'
import { toast } from 'sonner'
import { useHistorico } from './hooks/use-historico'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function UsersIcon(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function HistoricoView() {
  const { data, error, isLoading } = useHistorico()
  const [filtroHistorico, setFiltroHistorico] = useState('todos')

  const filteredHistorico = useMemo(() => {
    if (filtroHistorico === 'todos') return data
    if (filtroHistorico === 'consulta') {
      return data.filter((item) => item.tipo.toLowerCase().includes('consulta') || item.tipo.toLowerCase().includes('clínica') || item.tipo.toLowerCase().includes('clinica'))
    }
    if (filtroHistorico === 'exame') {
      return data.filter((item) => item.tipo.toLowerCase().includes('exame'))
    }
    return data
  }, [data, filtroHistorico])

  return (
    <div className="app-page">
      <PageHeader title="Histórico Médico" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-app-text-muted">Total de Atendimentos</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <div className="app-status-info rounded-lg p-2 text-[var(--app-info-text)]">
              <History className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-app-text-muted">Especialistas Visitados</p>
              <p className="text-2xl font-bold">{new Set(data.map((item) => item.medico).filter(Boolean)).size}</p>
            </div>
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
              <UsersIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-app-text-muted">Documentos Arquivados</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <div className="app-status-warning rounded-lg p-2 text-[var(--app-warning-text)]">
              <FileText className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-app-border bg-app-card p-4 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark sm:flex-row sm:items-center sm:gap-4">
        <span className="text-sm font-medium">Filtrar por:</span>
        <Select value={filtroHistorico} onValueChange={setFiltroHistorico}>
          <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white sm:w-60 lg:w-72 dark:border-app-border-dark dark:bg-[var(--app-card-dark)]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="consulta">Consultas</SelectItem>
            <SelectItem value="exame">Exames</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}
      {isLoading && <p className="text-app-text-secondary">Carregando historico...</p>}

      <Card className="overflow-hidden rounded-integrallys-lg border-app-border shadow-sm dark:border-app-border-dark">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-app-bg-secondary dark:bg-app-hover">
              <TableRow>
                <TableHead className="whitespace-nowrap text-left text-sm font-semibold text-app-text-primary dark:text-white/70">Data</TableHead>
                <TableHead className="text-left text-sm font-semibold text-app-text-primary dark:text-white/70">Procedimento</TableHead>
                <TableHead className="text-left text-sm font-semibold text-app-text-primary dark:text-white/70">Especialista</TableHead>
                <TableHead className="text-left text-sm font-semibold text-app-text-primary dark:text-white/70">Local</TableHead>
                <TableHead className="text-center text-sm font-semibold text-app-text-primary dark:text-white/70">Status</TableHead>
                <TableHead className="text-center text-sm font-semibold text-app-text-primary dark:text-white/70">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filteredHistorico.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-app-text-secondary dark:text-white/60">
                    Nenhum registro no histórico.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistorico.map((item) => (
                  <TableRow key={item.id} className="hover:bg-app-bg-secondary dark:hover:bg-app-hover">
                    <TableCell className="whitespace-nowrap py-4 font-medium text-app-text-secondary dark:text-white/60">{item.data}</TableCell>
                    <TableCell className="py-4 font-medium text-app-text-secondary dark:text-white/60">{item.tipo}</TableCell>
                    <TableCell className="py-4 font-medium text-app-text-secondary dark:text-white/60">{item.medico}</TableCell>
                    <TableCell className="py-4 font-medium text-app-text-secondary dark:text-white/60">{item.local}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="rounded-full px-3 font-medium app-status-success/50 text-[var(--app-success-text)] hover:app-status-success dark:bg-transparent dark:text-[var(--app-success-text)] dark:hover:bg-emerald-900/30">
                          {item.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info(`Documentos da consulta de ${item.data} disponíveis em breve.`)}
                          className="flex h-8 items-center gap-2 whitespace-nowrap font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          <Download className="h-4 w-4" />
                          Documentos
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
