'use client'

import { useMemo, useState } from 'react'
import { Edit, FileText, Plus, Search, Send, Trash2 } from 'lucide-react'
import { useDocumentacao, type DocumentoClinicoItem } from '@/features/documentacao/hooks/use-documentacao'
import { usePacientes } from '@/hooks/use-pacientes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { SegmentedControl } from '@/components/shared/segmented-control'
import {
  CadastroModeloModal,
  ExcluirModeloModal,
  VisualizarDocumentoModal,
} from './modals'
import { DocumentosEmitidosTab } from './documentos-emitidos-tab'

type TabKey = 'emitidos' | 'recebidos'

export function DocumentacaoView() {
  const { data, isLoading, error, createDocumento, updateDocumento, deleteDocumento } = useDocumentacao()
  const { data: pacientes } = usePacientes()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCadastroOpen, setIsCadastroOpen] = useState(false)
  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false)
  const [isExcluirOpen, setIsExcluirOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentoClinicoItem | null>(null)
  const [tab, setTab] = useState<TabKey>('emitidos')

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return data

    return data.filter((item) => {
      return (
        item.paciente.toLowerCase().includes(term) ||
        item.tipo.toLowerCase().includes(term) ||
        (item.nome ?? '').toLowerCase().includes(term) ||
        (item.meio ?? '').toLowerCase().includes(term)
      )
    })
  }, [data, searchTerm])

  const stats = useMemo(() => {
    const enviados = data.filter((item) => item.recebido).length
    const pendentes = data.filter((item) => item.recebido === false).length
    return [
      { title: 'Total de documentos', value: String(data.length) },
      { title: 'Recebidos', value: String(enviados) },
      { title: 'Pendentes', value: String(pendentes) },
    ]
  }, [data])

  const clearSelection = () => setSelectedDoc(null)
  const clearSearch = () => setSearchTerm('')

  return (
    <div className="app-page app-page-loose">
      <PageHeader
        title="Documentação clínica"
        description={
          tab === 'emitidos'
            ? 'Documentos emitidos pela clínica (laudos, declarações, dietas, encaminhamentos).'
            : 'Documentos recebidos e anexos clínicos do paciente.'
        }
        actions={
          tab === 'recebidos' ? (
            <>
              <Button variant="outline" onClick={clearSearch} className="h-11 rounded-integrallys px-4 font-normal">
                Limpar busca
              </Button>
              <Button
                onClick={() => {
                  clearSelection()
                  setIsCadastroOpen(true)
                }}
                className="h-11 rounded-integrallys px-6 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar documento
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <SegmentedControl
          options={[
            { value: 'emitidos', label: 'Emitidos' },
            { value: 'recebidos', label: 'Recebidos' },
          ]}
          value={tab}
          onChange={(value) => setTab(value as TabKey)}
        />
      </div>

      {tab === 'emitidos' && <DocumentosEmitidosTab />}

      {tab === 'recebidos' && (
      <>
      <div className="app-grid-stats md:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="rounded-[24px] border border-app-border bg-app-card p-8 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark"
          >
            <div className="space-y-3">
              <span className="text-sm font-normal tracking-wider text-app-text-muted">{stat.title}</span>
              <h3 className="text-3xl font-normal text-app-text-primary dark:text-white">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="overflow-hidden rounded-[24px] border border-app-border bg-app-card shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
        <div className="space-y-8 p-8">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-app-text-primary dark:text-white" />
            <h2 className="text-xl font-normal tracking-tight text-app-text-primary dark:text-white">
              Documentos enviados ({filteredData.length})
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm text-app-text-muted dark:text-app-text-muted">
                Consulte os documentos já enviados e mantenha o histórico visual alinhado com o prontuário.
              </p>
            </div>

            <div className="relative w-full lg:w-[420px]">
              <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-app-text-muted" />
              <Input
                placeholder="Buscar por paciente, tipo ou meio..."
                className="h-12 rounded-integrallys-lg border-app-border bg-app-bg-secondary/50 pl-12 transition-all focus-visible:ring-[var(--app-primary)] dark:border-app-border-dark dark:bg-app-table-header-dark"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {error && (
            <Card className="rounded-[12px] border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-4 text-sm text-[var(--app-danger-text)]">
              {error}
            </Card>
          )}

          {isLoading ? (
            <div className="text-sm text-app-text-muted">Carregando documentação...</div>
          ) : filteredData.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-app-border bg-app-bg-secondary/40 p-8 text-center dark:border-app-border-dark dark:bg-app-bg-dark">
              <p className="text-base text-app-text-primary dark:text-white">Nenhum documento encontrado.</p>
              <p className="mt-2 text-sm text-app-text-muted">
                Ajuste os filtros ou adicione um novo documento para preencher esta central.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredData.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[12px] border border-app-border bg-app-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:border-app-border-dark dark:bg-app-card-dark"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="rounded-full border-app-border bg-white px-3 py-1 text-xs font-semibold text-gray-900 dark:border-app-border-dark dark:bg-app-table-header-dark dark:text-gray-100"
                    >
                      {item.categoria ?? item.tipo}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(item)
                          setIsCadastroOpen(true)
                        }}
                        className="text-app-text-muted transition-colors hover:text-app-text-secondary dark:hover:text-white"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(item)
                          setIsVisualizarOpen(true)
                        }}
                        className="text-app-text-muted transition-colors hover:text-app-text-secondary dark:hover:text-white"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(item)
                          setIsExcluirOpen(true)
                        }}
                        className="text-app-text-muted transition-colors hover:text-[var(--app-danger-text)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="font-normal text-app-text-muted">Nome:</span>
                      <span className="font-normal text-app-text-primary dark:text-white">{item.nome ?? item.tipo}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-normal text-app-text-muted">Paciente:</span>
                      <span className="font-normal text-app-text-primary dark:text-white">{item.paciente}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-normal text-app-text-muted">Data:</span>
                      <span className="font-normal text-app-text-primary dark:text-white">{item.atualizadoEm}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-normal text-app-text-muted">Especialista:</span>
                      <span className="font-normal text-app-text-primary dark:text-white">{item.especialista ?? '--'}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-normal text-app-text-muted">Meio:</span>
                      <span className="font-normal text-app-text-primary dark:text-white">{item.meio ?? '--'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      <CadastroModeloModal
        open={isCadastroOpen}
        onOpenChange={(open) => {
          setIsCadastroOpen(open)
          if (!open) clearSelection()
        }}
        documento={selectedDoc}
        pacientes={pacientes.map((item) => ({ id: item.id, nome: item.nome }))}
        especialistas={undefined}
        onSave={async (payload) => {
          if (selectedDoc) {
            await updateDocumento(payload)
          } else {
            await createDocumento(payload)
          }
          clearSelection()
        }}
      />

      <VisualizarDocumentoModal
        open={isVisualizarOpen}
        onOpenChange={(open) => {
          setIsVisualizarOpen(open)
          if (!open) clearSelection()
        }}
        documento={selectedDoc}
      />

      <ExcluirModeloModal
        open={isExcluirOpen}
        onOpenChange={(open) => {
          setIsExcluirOpen(open)
          if (!open) clearSelection()
        }}
        documentoNome={selectedDoc?.nome ?? selectedDoc?.tipo}
        onConfirm={async () => {
          if (!selectedDoc) return
          await deleteDocumento(selectedDoc.id)
          clearSelection()
        }}
      />
    </div>
  )
}
