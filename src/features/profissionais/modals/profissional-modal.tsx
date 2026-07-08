'use client'

import { Stethoscope } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useProcedimentos } from '@/features/procedimentos/hooks/use-procedimentos'
import { useUnidades } from '@/hooks/use-unidades'
import { cn } from '@/lib/utils'
import type { ProfissionalInput, ProfissionalItem, ProfissionalTurno } from '@/types/profissional'

const DIAS: Array<{ label: string; value: number }> = [
  { label: 'Domingo', value: 0 },
  { label: 'Segunda', value: 1 },
  { label: 'Terça', value: 2 },
  { label: 'Quarta', value: 3 },
  { label: 'Quinta', value: 4 },
  { label: 'Sexta', value: 5 },
  { label: 'Sábado', value: 6 },
]

const TURNOS: Array<{ key: ProfissionalTurno; label: string }> = [
  { key: 'manha', label: 'Manhã' },
  { key: 'tarde', label: 'Tarde' },
]

type TurnoForm = {
  ativo: boolean
  horaInicio: string
  horaFim: string
  duracaoMin: string
}

type DiaForm = Record<ProfissionalTurno, TurnoForm>

type GradeForm = Record<number, DiaForm>

const emptyTurno = (): TurnoForm => ({ ativo: false, horaInicio: '', horaFim: '', duracaoMin: '' })

const emptyGrade = (): GradeForm => {
  const grade = {} as GradeForm
  for (const dia of DIAS) {
    grade[dia.value] = { manha: emptyTurno(), tarde: emptyTurno() }
  }
  return grade
}

const gradeFromHorarios = (item: ProfissionalItem | null): GradeForm => {
  const grade = emptyGrade()
  if (!item) return grade
  for (const horario of item.horarios) {
    const dia = grade[horario.diaSemana]
    if (!dia) continue
    dia[horario.turno] = {
      ativo: horario.ativo,
      horaInicio: horario.horaInicio,
      horaFim: horario.horaFim,
      duracaoMin: String(horario.duracaoMin),
    }
  }
  return grade
}

type ProfissionalModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  initial?: ProfissionalItem | null
  onClose: () => void
  onSave: (payload: ProfissionalInput) => Promise<void>
}

type BasicForm = {
  nome: string
  email: string
  senha: string
  telefone: string
  conselho: string
  crm: string
  tipoVinculo: 'interno' | 'parceiro'
  status: 'Ativo' | 'Inativo'
  unidadeId: string
}

const emptyBasic = (): BasicForm => ({
  nome: '',
  email: '',
  senha: '',
  telefone: '',
  conselho: '',
  crm: '',
  tipoVinculo: 'interno',
  status: 'Ativo',
  unidadeId: '',
})

export function ProfissionalModal({
  isOpen,
  mode,
  initial = null,
  onClose,
  onSave,
}: ProfissionalModalProps) {
  const { data: procedimentos } = useProcedimentos()
  const { data: unidades } = useUnidades()

  const [basic, setBasic] = useState<BasicForm>(emptyBasic())
  const [grade, setGrade] = useState<GradeForm>(emptyGrade())
  const [procedimentoIds, setProcedimentoIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setBasic({
      nome: initial?.nome ?? '',
      email: initial?.email ?? '',
      senha: '',
      telefone: initial?.telefone ?? '',
      conselho: initial?.conselho ?? '',
      crm: initial?.crm ?? '',
      tipoVinculo: initial?.tipoVinculo ?? 'interno',
      status: initial?.status === 'Inativo' ? 'Inativo' : 'Ativo',
      unidadeId: initial?.unidadeId ?? '',
    })
    setGrade(gradeFromHorarios(initial))
    setProcedimentoIds(initial?.procedimentoIds ?? [])
  }, [isOpen, initial])

  const procedimentosAtivos = useMemo(
    () => procedimentos.filter((item) => item.ativo),
    [procedimentos],
  )

  const setBasicField = <K extends keyof BasicForm>(key: K, value: BasicForm[K]) =>
    setBasic((prev) => ({ ...prev, [key]: value }))

  const setTurnoField = (dia: number, turno: ProfissionalTurno, patch: Partial<TurnoForm>) =>
    setGrade((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [turno]: { ...prev[dia][turno], ...patch } },
    }))

  const toggleProcedimento = (id: string) =>
    setProcedimentoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )

  const buildHorarios = (): ProfissionalInput['horarios'] | null => {
    const horarios: ProfissionalInput['horarios'] = []
    for (const dia of DIAS) {
      for (const turno of TURNOS) {
        const cfg = grade[dia.value][turno.key]
        if (!cfg.ativo) continue
        const duracaoMin = Number(cfg.duracaoMin)
        if (!cfg.horaInicio || !cfg.horaFim) {
          toast.error(`Informe início e fim do turno ${turno.label.toLowerCase()} de ${dia.label}.`)
          return null
        }
        if (cfg.horaFim <= cfg.horaInicio) {
          toast.error(`O fim deve ser maior que o início (${turno.label} de ${dia.label}).`)
          return null
        }
        if (!Number.isFinite(duracaoMin) || duracaoMin <= 0) {
          toast.error(`Informe uma duração válida (${turno.label} de ${dia.label}).`)
          return null
        }
        horarios.push({
          diaSemana: dia.value,
          turno: turno.key,
          horaInicio: cfg.horaInicio,
          horaFim: cfg.horaFim,
          duracaoMin: Math.round(duracaoMin),
          ativo: true,
        })
      }
    }
    return horarios
  }

  const handleSubmit = async () => {
    if (!basic.nome.trim() || !basic.email.trim()) {
      toast.error('Preencha nome e e-mail.')
      return
    }
    if (mode === 'create' && basic.senha.trim().length < 6) {
      toast.error('Defina uma senha inicial com pelo menos 6 caracteres.')
      return
    }

    const horarios = buildHorarios()
    if (horarios === null) return

    setIsSubmitting(true)
    try {
      await onSave({
        id: initial?.id,
        nome: basic.nome.trim(),
        email: basic.email.trim(),
        senha: mode === 'create' ? basic.senha.trim() : undefined,
        telefone: basic.telefone.trim() || null,
        conselho: basic.conselho.trim() || null,
        crm: basic.crm.trim() || null,
        tipoVinculo: basic.tipoVinculo,
        status: basic.status,
        unidadeId: basic.unidadeId || null,
        horarios,
        procedimentoIds,
      })
      toast.success(
        mode === 'edit'
          ? 'Profissional atualizado com sucesso.'
          : 'Profissional cadastrado com sucesso.',
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o profissional.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="2xl" className="gap-0 overflow-hidden rounded-[24px] p-0">
        <ModalHeader
          className="px-6 pt-6 pb-4 shrink-0"
          icon={Stethoscope}
          title={mode === 'edit' ? 'Editar Profissional' : 'Novo Profissional'}
          description="Cadastre os dados, a grade semanal de atendimento e os procedimentos atendidos."
        />

        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar px-6 py-4 space-y-8">
          {/* Dados básicos */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-app-text-secondary">
              Dados do profissional
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                  Nome completo
                </Label>
                <Input
                  placeholder="Digite o nome completo"
                  value={basic.nome}
                  onChange={(e) => setBasicField('nome', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                  E-mail
                </Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={basic.email}
                  onChange={(e) => setBasicField('email', e.target.value)}
                />
              </div>
              {mode === 'create' && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                    Senha inicial
                  </Label>
                  <Input
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={basic.senha}
                    onChange={(e) => setBasicField('senha', e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                  Telefone
                </Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={basic.telefone}
                  onChange={(e) => setBasicField('telefone', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                  Conselho de classe
                </Label>
                <Input
                  placeholder="Ex.: CRM, CRO, CREFITO"
                  value={basic.conselho}
                  onChange={(e) => setBasicField('conselho', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                  Nº de registro
                </Label>
                <Input
                  placeholder="Número no conselho"
                  value={basic.crm}
                  onChange={(e) => setBasicField('crm', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                  Unidade
                </Label>
                <Select
                  value={basic.unidadeId || 'none'}
                  onValueChange={(value) =>
                    setBasicField('unidadeId', value === 'none' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem unidade definida</SelectItem>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                  Tipo de vínculo
                </Label>
                <Select
                  value={basic.tipoVinculo}
                  onValueChange={(value: 'interno' | 'parceiro') =>
                    setBasicField('tipoVinculo', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interno">Interno (clínica paga repasse)</SelectItem>
                    <SelectItem value="parceiro">Parceiro (% sobre valor bruto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                  Status
                </Label>
                <Select
                  value={basic.status}
                  onValueChange={(value: 'Ativo' | 'Inativo') => setBasicField('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Grade semanal */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-app-text-secondary">
                Grade semanal de atendimento
              </h3>
              <p className="text-xs text-app-text-muted mt-1">
                Ative os turnos atendidos e informe a janela e a duração de cada consulta. A geração
                de agenda usará estes horários.
              </p>
            </div>

            <div className="space-y-3">
              {DIAS.map((dia) => (
                <div
                  key={dia.value}
                  className="rounded-2xl border border-app-border p-4 dark:border-app-border-dark"
                >
                  <p className="mb-3 text-sm font-semibold text-app-text-primary dark:text-white">
                    {dia.label}
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {TURNOS.map((turno) => {
                      const cfg = grade[dia.value][turno.key]
                      return (
                        <div
                          key={turno.key}
                          className={cn(
                            'rounded-xl border p-3 transition-colors',
                            cfg.ativo
                              ? 'border-[var(--app-primary)]/40 bg-app-bg-secondary dark:bg-app-hover'
                              : 'border-app-border dark:border-app-border-dark',
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-app-text-primary dark:text-white">
                              {turno.label}
                            </span>
                            <Switch
                              checked={cfg.ativo}
                              onCheckedChange={(value) =>
                                setTurnoField(dia.value, turno.key, { ativo: value })
                              }
                            />
                          </div>
                          {cfg.ativo && (
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs font-normal text-app-text-muted">
                                  Início
                                </Label>
                                <Input
                                  type="time"
                                  value={cfg.horaInicio}
                                  onChange={(e) =>
                                    setTurnoField(dia.value, turno.key, {
                                      horaInicio: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-normal text-app-text-muted">
                                  Fim
                                </Label>
                                <Input
                                  type="time"
                                  value={cfg.horaFim}
                                  onChange={(e) =>
                                    setTurnoField(dia.value, turno.key, { horaFim: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-normal text-app-text-muted">
                                  Duração (min)
                                </Label>
                                <Input
                                  type="number"
                                  min={1}
                                  step={5}
                                  value={cfg.duracaoMin}
                                  onChange={(e) =>
                                    setTurnoField(dia.value, turno.key, {
                                      duracaoMin: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Procedimentos */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-app-text-secondary">
                Procedimentos atendidos
              </h3>
              <p className="text-xs text-app-text-muted mt-1">
                Selecione os procedimentos que este profissional realiza.
              </p>
            </div>
            {procedimentosAtivos.length === 0 ? (
              <p className="text-sm text-app-text-muted">
                Nenhum procedimento ativo cadastrado. Cadastre procedimentos para vinculá-los.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {procedimentosAtivos.map((procedimento) => {
                  const selected = procedimentoIds.includes(procedimento.id)
                  return (
                    <button
                      key={procedimento.id}
                      type="button"
                      onClick={() => toggleProcedimento(procedimento.id)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                        selected
                          ? 'border-[var(--app-primary)] bg-app-primary text-white'
                          : 'border-app-border bg-app-card text-app-text-primary hover:bg-app-bg-secondary dark:border-app-border-dark dark:bg-app-card-dark dark:text-white dark:hover:bg-app-hover',
                      )}
                    >
                      {procedimento.nome}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="px-6 py-5 shrink-0 gap-3 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-lg border-app-border px-6 dark:border-app-border-dark"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="h-11 rounded-lg bg-app-primary px-8 font-medium text-white shadow-sm hover:bg-app-primary-hover"
          >
            {isSubmitting
              ? 'Salvando...'
              : mode === 'edit'
                ? 'Salvar alterações'
                : 'Salvar profissional'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
