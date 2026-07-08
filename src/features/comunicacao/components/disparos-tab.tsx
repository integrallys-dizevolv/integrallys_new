'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, MessageSquare, Play, Plus, Search, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { FilterBar } from '@/components/shared/filter-bar'
import { StatCard } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { type DisparoItem, useDisparos } from '@/features/comunicacao/hooks/use-disparos'
import { usePacientes } from '@/hooks/use-pacientes'
import { Pill, humanize } from './pill'

const HEAD =
  'px-6 py-4 text-xs font-medium uppercase tracking-wider text-app-text-secondary dark:text-white/60 whitespace-nowrap'

const TIPO_LABEL: Record<string, string> = {
  lembrete_consulta: 'Lembrete',
  pos_consulta: 'Pós-consulta',
  aniversario: 'Aniversário',
  campanha: 'Campanha',
}

function statusPill(status: string) {
  if (status === 'enviado') return <Pill tone="success">Enviado</Pill>
  if (status === 'erro') return <Pill tone="danger">Erro</Pill>
  return <Pill tone="warning">Pendente</Pill>
}

function withinPeriod(iso: string, period: string) {
  if (period === 'todos') return true
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return true
  return Math.abs(Date.now() - ts) <= Number(period) * 24 * 60 * 60 * 1000
}

export function DisparosTab() {
  const { data, isLoading, error, processarPendentes, dispararCampanha } = useDisparos()
  const { data: pacientes } = usePacientes()

  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [periodoFilter, setPeriodoFilter] = useState('todos')
  const [isProcessing, setIsProcessing] = useState(false)

  const [isManualOpen, setIsManualOpen] = useState(false)
  const [manualSearch, setManualSearch] = useState('')
  const [selectedPacientes, setSelectedPacientes] = useState<string[]>([])
  const [manualMensagem, setManualMensagem] = useState('')
  const [isSending, setIsSending] = useState(false)

  const stats = useMemo(
    () => ({
      pendentes: data.filter((d) => d.status === 'pendente').length,
      enviados: data.filter((d) => d.status === 'enviado').length,
      erros: data.filter((d) => d.status === 'erro').length,
    }),
    [data],
  )

  const filtered = useMemo(
    () =>
      data.filter((d: DisparoItem) => {
        const term = searchTerm.toLowerCase()
        const matchesSearch =
          d.paciente.toLowerCase().includes(term) || d.telefone.toLowerCase().includes(term)
        const matchesTipo = tipoFilter === 'todos' || d.tipo === tipoFilter
        const matchesStatus = statusFilter === 'todos' || d.status === statusFilter
        return (
          matchesSearch &&
          matchesTipo &&
          matchesStatus &&
          withinPeriod(d.agendadoParaIso, periodoFilter)
        )
      }),
    [data, searchTerm, tipoFilter, statusFilter, periodoFilter],
  )

  const manualPacientes = useMemo(() => {
    const term = manualSearch.toLowerCase()
    return pacientes
      .filter((p) => p.telefone)
      .filter(
        (p) =>
          !term || p.nome.toLowerCase().includes(term) || p.telefone.toLowerCase().includes(term),
      )
  }, [pacientes, manualSearch])

  const togglePaciente = (id: string) =>
    setSelectedPacientes((cur) => (cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id]))

  const resetManual = () => {
    setSelectedPacientes([])
    setManualMensagem('')
    setManualSearch('')
  }

  const handleProcessar = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      const result = await processarPendentes()
      if (result.motivo) toast.error(result.motivo)
      else toast.success(`Processados: ${result.processados} · Erros: ${result.erros}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao processar pendentes')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEnviarManual = async () => {
    if (isSending) return
    if (selectedPacientes.length === 0 || !manualMensagem.trim()) {
      toast.error('Selecione ao menos um paciente e escreva a mensagem.')
      return
    }
    setIsSending(true)
    try {
      const result = await dispararCampanha(selectedPacientes, manualMensagem.trim())
      toast.success(`Disparo agendado para ${result.agendados} paciente(s).`)
      setIsManualOpen(false)
      resetManual()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao agendar disparo')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Pendentes"
          value={stats.pendentes}
          sub="Aguardando envio"
          icon={Clock}
          iconTone="warning"
        />
        <StatCard
          label="Enviados"
          value={stats.enviados}
          sub="Entregues à Evolution"
          icon={CheckCircle2}
          iconTone="success"
        />
        <StatCard
          label="Erros"
          value={stats.erros}
          sub="Falha no disparo"
          icon={XCircle}
          iconTone="danger"
        />
      </div>

      <FilterBar>
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
          <Input
            placeholder="Buscar por paciente ou telefone..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-11 rounded-xl border-app-border bg-app-bg-secondary/35 pl-10 font-normal dark:border-app-border-dark dark:bg-app-hover"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="h-11 w-full rounded-xl border-app-border bg-app-bg-secondary/35 lg:w-[170px] dark:border-app-border-dark dark:bg-app-hover">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="lembrete_consulta">Lembrete</SelectItem>
            <SelectItem value="pos_consulta">Pós-consulta</SelectItem>
            <SelectItem value="aniversario">Aniversário</SelectItem>
            <SelectItem value="campanha">Campanha</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full rounded-xl border-app-border bg-app-bg-secondary/35 lg:w-[150px] dark:border-app-border-dark dark:bg-app-hover">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="erro">Erro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
          <SelectTrigger className="h-11 w-full rounded-xl border-app-border bg-app-bg-secondary/35 lg:w-[150px] dark:border-app-border-dark dark:bg-app-hover">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo o período</SelectItem>
            <SelectItem value="1">Último dia</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
        <FilterBar.Spacer />
        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm('')
            setTipoFilter('todos')
            setStatusFilter('todos')
            setPeriodoFilter('todos')
          }}
          className="h-11 rounded-xl border-app-border px-5 font-normal dark:border-app-border-dark"
        >
          Limpar filtros
        </Button>
      </FilterBar>

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}

      <div className="overflow-hidden rounded-integrallys-lg border border-app-border bg-app-card shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
        <div className="flex flex-col gap-3 border-b border-app-border px-6 py-4 dark:border-app-border-dark sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-normal text-app-text-primary dark:text-white">
              Fila de disparos
            </h3>
            <p className="text-sm text-app-text-secondary dark:text-white/60">
              Lembretes, pós-consulta, aniversários e campanhas enviados pela Evolution API.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void handleProcessar()}
              disabled={isProcessing}
              className="h-10 gap-2 rounded-xl border-app-border font-normal dark:border-app-border-dark"
            >
              <Play className="h-4 w-4" />
              {isProcessing ? 'Processando...' : 'Processar agora'}
            </Button>
            <Button
              onClick={() => setIsManualOpen(true)}
              className="h-10 gap-2 rounded-xl bg-app-primary px-4 font-normal text-white hover:bg-app-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Disparo manual
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-app-border bg-transparent hover:bg-transparent dark:border-app-border-dark">
                <TableHead className={HEAD}>Data programada</TableHead>
                <TableHead className={HEAD}>Tipo</TableHead>
                <TableHead className={HEAD}>Paciente</TableHead>
                <TableHead className={HEAD}>Telefone</TableHead>
                <TableHead className={HEAD}>Status</TableHead>
                <TableHead className={HEAD}>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-app-text-secondary dark:text-white/60"
                  >
                    Carregando disparos...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-app-text-secondary dark:text-white/60"
                  >
                    Nenhum disparo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow
                    key={d.id}
                    className="border-b border-app-border/50 transition-colors hover:bg-app-bg-secondary/50 dark:border-app-border-dark dark:hover:bg-app-hover"
                  >
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap text-sm text-app-text-secondary dark:text-white/80">
                        {d.agendadoPara}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <Pill tone="info">{TIPO_LABEL[d.tipo] ?? humanize(d.tipo)}</Pill>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap font-normal text-app-text-primary dark:text-white">
                        {d.paciente || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap text-sm text-app-text-secondary dark:text-white/60">
                        {d.telefone}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">{statusPill(d.status)}</TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="inline-block max-w-[280px] whitespace-pre-wrap break-words text-xs text-[var(--app-danger-text)]">
                        {d.erroDetalhe ?? ''}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={isManualOpen}
        onOpenChange={(open) => {
          setIsManualOpen(open)
          if (!open) resetManual()
        }}
      >
        <DialogContent size="lg" className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Disparo manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
                Pacientes ({selectedPacientes.length} selecionado(s))
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
                <Input
                  placeholder="Filtrar pacientes por nome ou telefone..."
                  value={manualSearch}
                  onChange={(event) => setManualSearch(event.target.value)}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
              <div className="max-h-[220px] overflow-y-auto rounded-xl border border-app-border dark:border-app-border-dark">
                {manualPacientes.length === 0 ? (
                  <p className="p-4 text-center text-sm text-app-text-secondary dark:text-white/60">
                    Nenhum paciente com telefone cadastrado.
                  </p>
                ) : (
                  manualPacientes.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-app-border/50 px-4 py-2 last:border-b-0 hover:bg-app-bg-secondary/50 dark:border-app-border-dark dark:hover:bg-app-hover"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPacientes.includes(p.id)}
                        onChange={() => togglePaciente(p.id)}
                        className="h-4 w-4 accent-[var(--app-primary)]"
                      />
                      <span className="flex-1 text-sm font-normal text-app-text-primary dark:text-white">
                        {p.nome}
                      </span>
                      <span className="text-xs text-app-text-secondary dark:text-white/60">
                        {p.telefone}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
                Mensagem
              </span>
              <Textarea
                value={manualMensagem}
                onChange={(event) => setManualMensagem(event.target.value)}
                className="min-h-[120px] rounded-xl"
                placeholder="Escreva a mensagem do disparo..."
              />
            </div>
            {manualMensagem.trim() && (
              <div className="rounded-xl border border-app-border bg-app-bg-secondary/40 p-4 dark:border-app-border-dark dark:bg-app-hover/30">
                <span className="text-xs font-medium text-app-text-secondary dark:text-white/70">
                  Pré-visualização
                </span>
                <p className="mt-1 whitespace-pre-wrap text-sm font-normal text-app-text-primary dark:text-white">
                  {manualMensagem}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleEnviarManual()}
              disabled={isSending}
              className="bg-app-primary text-white hover:bg-app-primary-hover"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {isSending ? 'Enviando...' : 'Disparar agora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
