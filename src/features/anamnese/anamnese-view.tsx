'use client'

import { useMemo, useState } from 'react'
import {
  Search,
  Eye,
  Trash2,
  FileText,
  User,
  ArrowUpRight,
} from 'lucide-react'
import { useAnamnese, type AnamneseItem } from '@/features/anamnese/hooks/use-anamnese'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  NovoAnamneseModal,
  VisualizarAnamneseModal,
  ExcluirAnamneseModal,
} from './modals'

const formatMetric = (value?: number, suffix = '') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return `${value}${suffix}`
}

export function AnamneseView() {
  const { data, error, isLoading, createAnamnese, deleteAnamnese } = useAnamnese()
  const [searchTerm, setSearchTerm] = useState('')
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false)
  const [selectedAnamnese, setSelectedAnamnese] = useState<AnamneseItem | null>(null)
  const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false)
  const [isExcluirModalOpen, setIsExcluirModalOpen] = useState(false)

  const handleVisualizar = (anamnese: AnamneseItem) => {
    setSelectedAnamnese(anamnese)
    setIsVisualizarModalOpen(true)
  }

  const handleExcluir = (anamnese: AnamneseItem) => {
    setSelectedAnamnese(anamnese)
    setIsExcluirModalOpen(true)
  }

  const filteredAnamneses = useMemo(() => {
    return data.filter((item) =>
      item.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tipo.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [data, searchTerm])

  const clearFilters = () => {
    setSearchTerm('')
  }

  const stats = useMemo(() => {
    const consultas = data.filter((item) => item.tipo === 'Consulta').length
    const reconsultas = data.filter((item) => item.tipo === 'Reconsulta').length

    return [
      { title: 'Total de anamneses', value: String(data.length), icon: FileText, color: 'text-app-text-muted' },
      { title: 'Consultas', value: String(consultas), icon: User, color: 'text-[var(--app-info-text)]' },
      { title: 'Reconsultas', value: String(reconsultas), icon: ArrowUpRight, color: 'text-[var(--app-success-text)]' },
    ]
  }, [data])

  return (
    <div className="app-page">
      <PageHeader
        title="Anamnese"
        description="Registro estruturado de anamnese com bioimpedância"
        actions={
          <>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="h-11 px-4 rounded-integrallys font-normal"
            >
              Limpar filtros
            </Button>
            <Button onClick={() => setIsNovoModalOpen(true)} className="h-11 rounded-integrallys px-6 text-white">
              Nova anamnese
            </Button>
          </>
        }
      />

      <div className="app-grid-stats md:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index} className="p-8 rounded-integrallys-lg border border-app-border dark:border-app-border-dark shadow-sm bg-app-card dark:bg-app-card-dark">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <span className="text-sm font-normal text-app-text-muted dark:text-app-text-muted tracking-wider">{stat.title}</span>
                <h3 className="text-3xl font-normal text-app-text-primary dark:text-white">{stat.value}</h3>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-app-text-muted" />
        <Input
          placeholder="Buscar por paciente ou tipo..."
          className="pl-12 h-14 rounded-integrallys-lg border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark focus-visible:ring-[var(--app-primary)] shadow-sm text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error ? (
        <Card className="rounded-integrallys-lg border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-4 text-sm text-[var(--app-danger-text)]">
          {error}
        </Card>
      ) : null}

      <div className="bg-app-card dark:bg-app-card-dark rounded-integrallys-lg shadow-sm border border-app-border dark:border-app-border-dark overflow-hidden">
        <div className="p-8 pb-4">
          <h2 className="text-lg font-normal text-app-text-primary dark:text-white tracking-tight">
            Histórico de anamneses ({filteredAnamneses.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="px-8 pb-8 text-sm text-app-text-muted">Carregando anamneses...</div>
        ) : filteredAnamneses.length === 0 ? (
          <div className="px-8 pb-8 text-sm text-app-text-muted">Nenhuma anamnese encontrada.</div>
        ) : (
          <div className="overflow-x-auto px-2">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-app-border dark:border-app-border-dark hover:bg-transparent">
                  <TableHead className="font-normal text-app-text-secondary dark:text-white/60 py-4 px-6">Paciente</TableHead>
                  <TableHead className="font-normal text-app-text-secondary dark:text-white/60 py-4">Data</TableHead>
                  <TableHead className="font-normal text-app-text-secondary dark:text-white/60 py-4">Tipo</TableHead>
                  <TableHead className="font-normal text-app-text-secondary dark:text-white/60 py-4">Imc</TableHead>
                  <TableHead className="font-normal text-app-text-secondary dark:text-white/60 py-4">Peso</TableHead>
                  <TableHead className="font-normal text-app-text-secondary dark:text-white/60 py-4">Gordura (%)</TableHead>
                  <TableHead className="font-normal text-app-text-secondary dark:text-white/60 py-4">Queixa principal</TableHead>
                  <TableHead className="font-normal text-app-text-secondary dark:text-white/60 py-4 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnamneses.map((anamnese) => (
                  <TableRow key={anamnese.id} className="border-b border-app-border dark:border-app-border-dark hover:bg-app-hover dark:hover:bg-app-hover transition-colors">
                    <TableCell className="font-normal text-app-text-primary dark:text-white px-6 py-5">
                      {anamnese.paciente}
                    </TableCell>
                    <TableCell className="text-app-text-secondary dark:text-white/80">
                      {anamnese.data}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`px-3 py-1 font-normal rounded-lg border-none text-white shadow-sm ${
                          anamnese.tipo === 'Consulta' ? 'app-status-info text-white' : 'app-status-success text-white'
                        }`}
                      >
                        {anamnese.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-normal text-[var(--app-warning-text)]">
                      {formatMetric(anamnese.imc)}
                    </TableCell>
                    <TableCell className="text-app-text-primary dark:text-white">
                      {formatMetric(anamnese.peso, ' kg')}
                    </TableCell>
                    <TableCell className="text-app-text-primary dark:text-white">
                      {formatMetric(anamnese.gordura, '%')}
                    </TableCell>
                    <TableCell className="text-app-text-muted dark:text-app-text-muted max-w-[200px] truncate">
                      {anamnese.queixa}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleVisualizar(anamnese)}
                          className="p-2 hover:bg-app-bg-secondary dark:hover:bg-app-hover rounded-lg transition-colors group"
                        >
                          <Eye className="h-4 w-4 text-app-text-primary dark:text-white" />
                        </button>
                        <button
                          onClick={() => handleExcluir(anamnese)}
                          className="p-2 hover:bg-app-hover dark:hover:bg-app-hover rounded-lg transition-colors group"
                        >
                          <Trash2 className="h-4 w-4 text-app-text-primary dark:text-white group-hover:text-[var(--app-danger-text)]" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NovoAnamneseModal
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onSave={async (payload) => {
          await createAnamnese(payload)
          setIsNovoModalOpen(false)
        }}
      />

      <VisualizarAnamneseModal
        isOpen={isVisualizarModalOpen}
        onClose={() => setIsVisualizarModalOpen(false)}
        anamnese={selectedAnamnese}
      />

      <ExcluirAnamneseModal
        isOpen={isExcluirModalOpen}
        onClose={() => setIsExcluirModalOpen(false)}
        onConfirm={async () => {
          if (!selectedAnamnese) return
          await deleteAnamnese(selectedAnamnese.id)
          setIsExcluirModalOpen(false)
        }}
        pacienteNome={selectedAnamnese?.paciente}
      />
    </div>
  )
}
