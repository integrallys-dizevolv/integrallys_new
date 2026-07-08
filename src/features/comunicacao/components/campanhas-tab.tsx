'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Megaphone, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { type CampanhaItem, useCampanhas } from '@/features/comunicacao/hooks/use-campanhas'
import { Pill, humanize } from './pill'

const HEAD =
  'px-6 py-4 text-xs font-medium uppercase tracking-wider text-app-text-secondary dark:text-white/60 whitespace-nowrap'

const ESTAGIO_LABEL: Record<string, string> = {
  lead: 'Lead',
  ativo: 'Ativo',
  em_tratamento: 'Em tratamento',
  retorno_pendente: 'Retorno pendente',
  inativo: 'Inativo',
  vip: 'VIP',
}

function statusPill(status: string) {
  if (status === 'concluida') return <Pill tone="success">Concluída</Pill>
  if (status === 'processando') return <Pill tone="info">Processando</Pill>
  if (status === 'cancelada') return <Pill tone="neutral">Cancelada</Pill>
  return <Pill tone="warning">Agendada</Pill>
}

export function CampanhasTab() {
  const { data: campanhas, isLoading, error, createCampanha, cancelCampanha } = useCampanhas()

  const [isOpen, setIsOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('personalizado')
  const [template, setTemplate] = useState('')
  const [dataDisparo, setDataDisparo] = useState('')
  const [hora, setHora] = useState('09:00')
  const [estagio, setEstagio] = useState('todos')
  const [isSaving, setIsSaving] = useState(false)

  const stats = useMemo(
    () => ({
      agendadas: campanhas.filter((c) => c.status === 'agendada').length,
      concluidas: campanhas.filter((c) => c.status === 'concluida').length,
      enviados: campanhas.reduce((sum, c) => sum + (c.totalEnviados ?? 0), 0),
    }),
    [campanhas],
  )

  const reset = () => {
    setNome('')
    setTipo('personalizado')
    setTemplate('')
    setDataDisparo('')
    setHora('09:00')
    setEstagio('todos')
  }

  const handleSalvar = async () => {
    if (isSaving) return
    if (!nome.trim() || !template.trim() || !dataDisparo) {
      toast.error('Preencha nome, mensagem e data.')
      return
    }
    setIsSaving(true)
    try {
      await createCampanha({
        nome: nome.trim(),
        tipo,
        mensagemTemplate: template.trim(),
        dataDisparo,
        horaDisparo: hora || '09:00',
        filtroEstagio: estagio === 'todos' ? null : estagio,
      })
      toast.success('Campanha agendada.')
      setIsOpen(false)
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar campanha')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelar = async (campanha: CampanhaItem) => {
    if (campanha.status !== 'agendada') return
    try {
      await cancelCampanha(campanha.id)
      toast.success(`Campanha "${campanha.nome}" cancelada.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao cancelar campanha')
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Agendadas"
          value={stats.agendadas}
          sub="Aguardando data/hora"
          icon={CalendarClock}
          iconTone="warning"
        />
        <StatCard
          label="Concluídas"
          value={stats.concluidas}
          sub="Disparo executado"
          icon={CheckCircle2}
          iconTone="success"
        />
        <StatCard
          label="Mensagens enviadas"
          value={stats.enviados}
          sub="Soma de todas as campanhas"
          icon={Megaphone}
          iconTone="primary"
        />
      </div>

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}

      <div className="overflow-hidden rounded-integrallys-lg border border-app-border bg-app-card shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
        <div className="flex flex-col gap-3 border-b border-app-border px-6 py-4 dark:border-app-border-dark sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-normal text-app-text-primary dark:text-white">
              Campanhas agendadas
            </h3>
            <p className="text-sm text-app-text-secondary dark:text-white/60">
              Datas comemorativas (Natal, Páscoa, Dia das Mães) e campanhas manuais com data
              programada.
            </p>
          </div>
          <Button
            onClick={() => setIsOpen(true)}
            className="h-10 gap-2 rounded-xl bg-app-primary px-4 font-normal text-white hover:bg-app-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Nova campanha agendada
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-app-border bg-transparent hover:bg-transparent dark:border-app-border-dark">
                <TableHead className={HEAD}>Nome</TableHead>
                <TableHead className={HEAD}>Tipo</TableHead>
                <TableHead className={HEAD}>Quando</TableHead>
                <TableHead className={HEAD}>Filtro</TableHead>
                <TableHead className={HEAD}>Status</TableHead>
                <TableHead className={HEAD}>Enviados / Erros</TableHead>
                <TableHead className={`${HEAD} text-right`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-app-text-secondary dark:text-white/60"
                  >
                    Carregando campanhas...
                  </TableCell>
                </TableRow>
              ) : campanhas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-app-text-secondary dark:text-white/60"
                  >
                    Nenhuma campanha agendada.
                  </TableCell>
                </TableRow>
              ) : (
                campanhas.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-b border-app-border/50 transition-colors hover:bg-app-bg-secondary/50 dark:border-app-border-dark dark:hover:bg-app-hover"
                  >
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap font-normal text-app-text-primary dark:text-white">
                        {c.nome}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="text-xs text-app-text-secondary dark:text-white/60">
                        {humanize(c.tipo)}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap text-sm text-app-text-secondary dark:text-white/80">
                        {c.dataDisparo} · {c.horaDisparo}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="text-xs text-app-text-secondary dark:text-white/60">
                        {c.filtroEstagio
                          ? (ESTAGIO_LABEL[c.filtroEstagio] ?? humanize(c.filtroEstagio))
                          : 'Todos os pacientes'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">{statusPill(c.status)}</TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="whitespace-nowrap text-sm font-normal text-app-text-primary dark:text-white">
                        {c.totalEnviados} /{' '}
                        <span className="text-[var(--app-danger-text)]">{c.totalErros}</span>
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <Button
                        variant="ghost"
                        onClick={() => void handleCancelar(c)}
                        disabled={c.status !== 'agendada'}
                        className="ml-auto flex h-8 items-center gap-1 rounded-lg text-xs font-normal text-[var(--app-danger-text)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) reset()
        }}
      >
        <DialogContent size="lg" className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Nova campanha agendada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
                Nome
              </span>
              <Input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex.: Dia das Mães 2026"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
                  Tipo
                </span>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natal">Natal</SelectItem>
                    <SelectItem value="pascoa">Páscoa</SelectItem>
                    <SelectItem value="dia_maes">Dia das Mães</SelectItem>
                    <SelectItem value="dia_pais">Dia dos Pais</SelectItem>
                    <SelectItem value="dia_crianca">Dia da Criança</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
                  Data
                </span>
                <Input
                  type="date"
                  value={dataDisparo}
                  onChange={(event) => setDataDisparo(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
                  Hora
                </span>
                <Input
                  type="time"
                  value={hora}
                  onChange={(event) => setHora(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
                Público (estágio do funil)
              </span>
              <Select value={estagio} onValueChange={setEstagio}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Todos os pacientes ativos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os pacientes ativos</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="em_tratamento">Em tratamento</SelectItem>
                  <SelectItem value="retorno_pendente">Retorno pendente</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-app-text-muted">
                Restringe o envio aos pacientes no estágio escolhido do funil.
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
                Mensagem (use <code className="text-xs">{'{paciente}'}</code> para o primeiro nome)
              </span>
              <Textarea
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                className="min-h-[120px] rounded-xl"
                placeholder="Ex.: Feliz Natal, {paciente}! 🎄 ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSalvar()}
              disabled={isSaving}
              className="bg-app-primary text-white hover:bg-app-primary-hover"
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Agendar campanha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
