'use client'

import { useMemo, useState } from 'react'
import { Download, Eye, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePrescricoesPortal, type PrescricaoPortalItem } from './hooks/use-prescricoes-portal'
import { ExcluirModal } from './modals/excluir-modal'
import { PrescricaoModal } from './modals/prescricao-modal'

export function PrescricoesView() {
  const { data, isLoading, error, deletePrescricao } = usePrescricoesPortal()
  const [buscaPrescricao, setBuscaPrescricao] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<PrescricaoPortalItem | null>(null)

  const filteredPrescricoes = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = item.id.toLowerCase().includes(buscaPrescricao.toLowerCase()) || item.profissional.toLowerCase().includes(buscaPrescricao.toLowerCase())
      const matchesType = filtroTipo === 'todos' || item.tipo.toLowerCase() === filtroTipo.toLowerCase()
      const matchesStatus = filtroStatus === 'todos' || item.status.toLowerCase() === filtroStatus.toLowerCase()
      return matchesSearch && matchesType && matchesStatus
    })
  }, [buscaPrescricao, data, filtroStatus, filtroTipo])

  return (
    <div className="app-page">
      <PageHeader
        title="Prescrições e Documentos"
        description={`${filteredPrescricoes.length} documentos encontrados`}
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted" />
          <Input placeholder="Buscar por nº ou profissional..." className="h-11 pl-10 bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark rounded-xl text-sm focus:ring-[var(--app-primary)] transition-all" value={buscaPrescricao} onChange={(e) => setBuscaPrescricao(e.target.value)} />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-full md:w-[180px] h-11 bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark rounded-xl text-sm focus:ring-[var(--app-primary)]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-app-border dark:border-app-border-dark">
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="prescrição">Prescrição</SelectItem>
              <SelectItem value="atestado">Atestado</SelectItem>
              <SelectItem value="exame">Exame</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full md:w-[180px] h-11 bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark rounded-xl text-sm focus:ring-[var(--app-primary)]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-app-border dark:border-app-border-dark">
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="expirado">Expirado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}
      {isLoading && <p className="text-app-text-secondary">Carregando prescrições...</p>}

      {!isLoading && (
        <Card className="rounded-integrallys-lg border-app-border dark:border-app-border-dark shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-hover">
                <TableRow>
                  <TableHead className="text-center font-semibold text-app-text-primary dark:text-white/70 text-sm py-4 whitespace-nowrap px-4">Nº Prescrição</TableHead>
                  <TableHead className="text-center font-semibold text-app-text-primary dark:text-white/70 text-sm py-4 whitespace-nowrap px-4">Profissional</TableHead>
                  <TableHead className="text-center font-semibold text-app-text-primary dark:text-white/70 text-sm py-4 whitespace-nowrap px-4">Data</TableHead>
                  <TableHead className="text-center font-semibold text-app-text-primary dark:text-white/70 text-sm py-4 whitespace-nowrap px-4">Tipo</TableHead>
                  <TableHead className="text-center font-semibold text-app-text-primary dark:text-white/70 text-sm py-4 whitespace-nowrap px-4">Validade</TableHead>
                  <TableHead className="text-center font-semibold text-app-text-primary dark:text-white/70 text-sm py-4 whitespace-nowrap px-4">Status</TableHead>
                  <TableHead className="text-center font-semibold text-app-text-primary dark:text-white/70 text-sm py-4 whitespace-nowrap px-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescricoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-app-text-secondary dark:text-white/60">Nenhum documento encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filteredPrescricoes.map((item) => (
                    <TableRow key={item.id} className="hover:bg-app-bg-secondary dark:hover:bg-app-hover border-app-border dark:border-app-border-dark">
                      <TableCell className="text-center py-4 text-app-text-primary dark:text-white/70 font-medium whitespace-nowrap px-4">{item.id}</TableCell>
                      <TableCell className="text-center py-4 text-app-text-secondary dark:text-white/60 whitespace-nowrap px-4">{item.profissional}</TableCell>
                      <TableCell className="text-center py-4 text-app-text-secondary dark:text-white/60 whitespace-nowrap px-4">{item.data}</TableCell>
                      <TableCell className="text-center py-4 px-4">
                        <Badge variant="outline" className="bg-white dark:bg-transparent border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white/70 font-medium whitespace-nowrap">{item.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-center py-4 text-app-text-secondary dark:text-white/60 whitespace-nowrap px-4">{item.validade}</TableCell>
                      <TableCell className="text-center py-4 px-4">
                        <Badge className={`${item.status === 'Ativo' ? 'app-status-info text-[var(--app-primary)] dark:text-[#4ADE80]' : item.status === 'Pendente' ? 'app-status-warning text-[var(--app-warning-text)]' : 'app-status-danger text-[var(--app-danger-text)]'} font-medium rounded-md px-2.5 py-0.5 whitespace-nowrap border-0`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex items-center justify-center text-app-text-muted hover:text-[var(--app-info-text)] dark:text-app-text-muted dark:hover:text-blue-400 active:scale-95 transition-all" onClick={() => { setSelectedDoc(item); setViewModalOpen(true) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex items-center justify-center text-app-text-muted hover:text-[var(--app-success-text)] dark:text-app-text-muted dark:hover:text-emerald-400 active:scale-95 transition-all">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex items-center justify-center text-app-text-muted hover:text-[var(--app-danger-text)] dark:text-app-text-muted dark:hover:text-red-400 active:scale-95 transition-all" onClick={() => { setSelectedDoc(item); setDeleteModalOpen(true) }}>
                            <Trash2 className="h-4 w-4" />
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
      )}

      <PrescricaoModal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} selectedDoc={selectedDoc} />
      <ExcluirModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={async () => { if (selectedDoc) await deletePrescricao(selectedDoc.id); setDeleteModalOpen(false); setSelectedDoc(null) }} documentId={selectedDoc?.id} />
    </div>
  )
}
