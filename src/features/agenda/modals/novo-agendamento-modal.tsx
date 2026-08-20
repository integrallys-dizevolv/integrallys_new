'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, Clock, FileText, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  CadastroRapidoPaciente,
  type CadastroRapidoPacientePayload,
} from './cadastro-rapido-paciente'
import { resolveModalidade, type TipoAtendimento } from './novo-agendamento.utils'

interface PacienteOption {
  id: string
  nome: string
}

export interface SlotDisponivel {
  profissional: string
  data: string // YYYY-MM-DD
  horario: string // HH:MM
}

// YYYY-MM-DD no fuso LOCAL — toISOString() é UTC e desalinha do fuso dos slots
// (perto da meia-noite cairia no dia seguinte → "0 horários disponíveis").
function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface NovoAgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
  currentDate?: Date
  professionals?: string[]
  patients?: PacienteOption[]
  /** Slots 'Disponível' (gerados na 2A) para oferecer fora do encaixe. */
  availableSlots?: SlotDisponivel[]
  initialPatientId?: string
  initialDate?: string
  initialTime?: string
  initialProfissional?: string
  onCreatePatient?: (payload: CadastroRapidoPacientePayload) => Promise<PacienteOption>
  onSave?: (payload: {
    pacienteId: string
    profissional: string
    data: string
    horario: string
    tipo: string
    observacoes: string
    modalidade?: string
    plataformaOnline?: string
    foraJanela?: boolean
    motivoEncaixe?: string
  }) => Promise<void> | void
}

export function NovoAgendamentoModal({
  isOpen,
  onClose,
  currentDate,
  professionals = [],
  patients = [],
  availableSlots = [],
  initialPatientId,
  initialDate,
  initialTime,
  initialProfissional,
  onCreatePatient,
  onSave,
}: NovoAgendamentoModalProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pacienteId, setPacienteId] = useState('')
  const [patientQuery, setPatientQuery] = useState('')
  const [patientListOpen, setPatientListOpen] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [creatingPatient, setCreatingPatient] = useState(false)
  const [extraPatients, setExtraPatients] = useState<PacienteOption[]>([])
  const [profissional, setProfissional] = useState('')
  const [data, setData] = useState(currentDate ? toLocalISODate(currentDate) : '')
  const [horario, setHorario] = useState('')
  const [tipo, setTipo] = useState('consulta')
  const [observacoes, setObservacoes] = useState('')
  const [tipoAtendimento, setTipoAtendimento] = useState<TipoAtendimento>('presencial')
  const [plataformaOnline, setPlataformaOnline] = useState<'zoom' | 'google_meet' | 'teams'>('google_meet')
  const [encaixeExtraHorario, setEncaixeExtraHorario] = useState(false)
  const [motivoEncaixe, setMotivoEncaixe] = useState('')

  const allPatients = useMemo(() => {
    const map = new Map<string, PacienteOption>()
    for (const item of [...patients, ...extraPatients]) {
      map.set(item.id, item)
    }
    return Array.from(map.values())
  }, [extraPatients, patients])

  const patientName = useMemo(
    () => allPatients.find((item) => item.id === pacienteId)?.nome ?? '',
    [allPatients, pacienteId],
  )

  const filteredPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase()
    if (!query) return []
    return allPatients
      .filter((item) => item.nome.toLowerCase().includes(query))
      .slice(0, 8)
  }, [allPatients, patientQuery])

  const noPatientMatch = patientQuery.trim().length > 0 && filteredPatients.length === 0

  // Horários 'Disponível' do profissional selecionado naquela data (ordenados, únicos).
  const slotsForSelection = useMemo(() => {
    if (!profissional || !data) return [] as string[]
    const horarios = availableSlots
      .filter((slot) => slot.profissional === profissional && slot.data === data)
      .map((slot) => slot.horario)
    return Array.from(new Set(horarios)).sort()
  }, [availableSlots, profissional, data])

  // Fora do encaixe, o horário precisa ser um slot disponível — limpa seleções
  // inválidas quando o profissional/data muda.
  useEffect(() => {
    if (encaixeExtraHorario) return
    if (horario && !slotsForSelection.includes(horario)) {
      setHorario('')
    }
  }, [encaixeExtraHorario, horario, slotsForSelection])

  // Reset só na transição fechado→aberto (e presets iniciais). NÃO depender de
  // `patients`: após createPaciente a lista troca de identidade e apagaria o
  // paciente recém-selecionado.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      return
    }
    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true
    if (!justOpened) return

    setExtraPatients([])
    setShowQuickCreate(false)
    setPatientListOpen(false)
    setPacienteId('')
    setPatientQuery('')
    if (initialPatientId) {
      const initial = patients.find((item) => item.id === initialPatientId)
      if (initial) {
        setPacienteId(initial.id)
        setPatientQuery(initial.nome)
      } else {
        setPacienteId(initialPatientId)
      }
    }
    if (initialDate) setData(initialDate)
    if (initialTime) setHorario(initialTime)
    if (initialProfissional) setProfissional(initialProfissional)
    // patients intencionalmente omitido — lookup usa o valor do render da abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open transition only
  }, [isOpen, initialDate, initialPatientId, initialProfissional, initialTime])

  // Se o modal abriu com preset antes da lista carregar, preenche o nome quando
  // `patients` chegar — sem limpar seleção feita pelo usuário/create rápido.
  useEffect(() => {
    if (!isOpen || !initialPatientId) return
    const initial = patients.find((item) => item.id === initialPatientId)
    if (!initial) return
    setPacienteId((current) => {
      if (!current || current === initialPatientId) return initial.id
      return current
    })
    setPatientQuery((current) => {
      if (!current.trim() || current === initial.nome) return initial.nome
      return current
    })
  }, [isOpen, initialPatientId, patients])

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose()
  }

  const handleClose = () => {
    onClose()
  }

  const selectPatient = (patient: PacienteOption) => {
    setPacienteId(patient.id)
    setPatientQuery(patient.nome)
    setPatientListOpen(false)
    setShowQuickCreate(false)
  }

  const clearPatient = () => {
    setPacienteId('')
    setPatientQuery('')
    setPatientListOpen(false)
    setShowQuickCreate(false)
  }

  const handleQuickCreate = async (payload: CadastroRapidoPacientePayload) => {
    if (!onCreatePatient) {
      toast.error('Criação rápida de paciente indisponível.')
      return
    }
    setCreatingPatient(true)
    try {
      const created = await onCreatePatient(payload)
      setExtraPatients((prev) => [...prev, created])
      selectPatient(created)
      toast.success('Paciente cadastrado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao cadastrar paciente')
    } finally {
      setCreatingPatient(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pacienteId || !data || !horario) return
    const { modalidade, plataformaOnline: plataforma } = resolveModalidade(tipoAtendimento, plataformaOnline)
    await onSave?.({
      pacienteId,
      profissional,
      data,
      horario,
      tipo,
      observacoes,
      modalidade,
      plataformaOnline: plataforma,
      foraJanela: encaixeExtraHorario,
      motivoEncaixe: encaixeExtraHorario ? motivoEncaixe : undefined,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-integrallys-lg bg-app-card dark:bg-app-card-dark">
        <ModalHeader
          title="Novo Agendamento"
          description="Preencha os dados abaixo para realizar o agendamento."
        />

        <form ref={formRef} onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-6 pb-8 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="paciente-busca" className="text-sm font-normal text-app-text-primary dark:text-white">
              Paciente
            </Label>
            <div className="relative">
              <Input
                id="paciente-busca"
                role="combobox"
                aria-expanded={patientListOpen}
                aria-controls="paciente-sugestoes"
                aria-autocomplete="list"
                value={patientQuery}
                onChange={(event) => {
                  const value = event.target.value
                  setPatientQuery(value)
                  setPacienteId('')
                  setPatientListOpen(true)
                  setShowQuickCreate(false)
                }}
                onFocus={() => setPatientListOpen(true)}
                placeholder="Buscar ou digitar nome do paciente"
                className="h-11 rounded-integrallys bg-app-bg-secondary/50 pr-10 dark:bg-app-bg-dark"
                autoComplete="off"
              />
              {(pacienteId || patientQuery) && (
                <button
                  type="button"
                  aria-label="Limpar paciente"
                  onClick={clearPatient}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-app-text-muted hover:text-app-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {patientListOpen && patientQuery.trim().length > 0 && !showQuickCreate && (
                <div
                  id="paciente-sugestoes"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-integrallys border border-app-border bg-white shadow-md dark:border-app-border-dark dark:bg-app-card-dark"
                >
                  {filteredPatients.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={item.id === pacienteId}
                      className="flex w-full px-3 py-2 text-left text-sm text-app-text-primary hover:bg-app-bg-secondary dark:text-white dark:hover:bg-app-hover"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectPatient(item)}
                    >
                      {item.nome}
                    </button>
                  ))}
                  {noPatientMatch && (
                    <div className="space-y-2 p-3">
                      <p className="text-xs font-medium text-app-text-primary dark:text-white">
                        Cadastro rápido
                      </p>
                      <p className="text-xs text-app-text-muted">Nenhum paciente encontrado.</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full gap-2 rounded-integrallys"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setShowQuickCreate(true)
                          setPatientListOpen(false)
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                        Cadastrar paciente rápido
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {pacienteId && patientName && (
              <p className="text-xs text-app-text-muted">Selecionado: {patientName}</p>
            )}
            {showQuickCreate && (
              <CadastroRapidoPaciente
                initialNome={patientQuery.trim()}
                isSubmitting={creatingPatient}
                onCancel={() => setShowQuickCreate(false)}
                onSubmit={handleQuickCreate}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Profissional</Label>
            <Select value={profissional} onValueChange={setProfissional}>
              <SelectTrigger className="h-11 rounded-integrallys border-app-border bg-white dark:border-app-border-dark dark:bg-app-bg-dark">
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent className="rounded-integrallys">
                {professionals.length === 0 && <SelectItem value="__empty_professionals" disabled>Nenhum especialista disponível</SelectItem>}
                {professionals.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">Data</Label>
              <Input
                type="date"
                value={data}
                onChange={(event) => setData(event.target.value)}
                className="h-11 rounded-integrallys bg-app-bg-secondary/50 dark:bg-app-bg-dark"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-normal text-app-text-primary dark:text-white">
                <Clock className="h-4 w-4 text-[var(--app-primary)]" />
                Horário
              </Label>
              {encaixeExtraHorario ? (
                <Input
                  type="time"
                  value={horario}
                  onChange={(event) => setHorario(event.target.value)}
                  className="h-11 rounded-integrallys bg-app-bg-secondary/50 dark:bg-app-bg-dark"
                />
              ) : (
                <Select value={horario} onValueChange={setHorario} disabled={slotsForSelection.length === 0}>
                  <SelectTrigger className="h-11 rounded-integrallys border-app-border bg-white dark:border-app-border-dark dark:bg-app-bg-dark">
                    <SelectValue
                      placeholder={
                        !profissional || !data
                          ? 'Selecione profissional e data'
                          : slotsForSelection.length === 0
                            ? 'Nenhum horário disponível'
                            : 'Selecione o horário'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-integrallys">
                    {slotsForSelection.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {!encaixeExtraHorario && profissional && data && slotsForSelection.length === 0 && (
            <p className="text-xs text-app-text-muted">
              Nenhum horário disponível para este profissional nesta data. Gere a agenda ou ligue o
              encaixe abaixo para marcar fora da grade.
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-normal text-app-text-primary dark:text-white">
              <Activity className="h-4 w-4 text-[var(--app-primary)]" />
              Tipo
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-11 rounded-integrallys border-app-border bg-white dark:border-app-border-dark dark:bg-app-bg-dark">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="rounded-integrallys">
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="exame">Exame</SelectItem>
                <SelectItem value="retorno">Retorno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Tipo de atendimento</Label>
            <Select value={tipoAtendimento} onValueChange={(value) => setTipoAtendimento(value as TipoAtendimento)}>
              <SelectTrigger className="h-11 rounded-integrallys border-app-border bg-white dark:border-app-border-dark dark:bg-app-bg-dark">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="rounded-integrallys">
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(tipoAtendimento === 'online' || tipoAtendimento === 'hibrido') && (
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">Plataforma online</Label>
              <Select value={plataformaOnline} onValueChange={(value) => setPlataformaOnline(value as 'zoom' | 'google_meet' | 'teams')}>
                <SelectTrigger className="h-11 rounded-integrallys border-app-border bg-white dark:border-app-border-dark dark:bg-app-bg-dark">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="rounded-integrallys">
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2 rounded-integrallys border border-app-border bg-app-bg-secondary/50 p-3 dark:border-app-border-dark dark:bg-app-bg-dark">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white">Encaixe fora do horário padrão</Label>
              <Switch checked={encaixeExtraHorario} onCheckedChange={setEncaixeExtraHorario} />
            </div>
            {encaixeExtraHorario && (
              <Input
                value={motivoEncaixe}
                onChange={(event) => setMotivoEncaixe(event.target.value)}
                placeholder="Motivo do encaixe extra-horário"
                className="h-10 rounded-integrallys"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Observações</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 z-10 h-5 w-5 text-app-text-muted" />
              <Textarea
                placeholder="Detalhes adicionais..."
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                className="min-h-[100px] resize-none rounded-integrallys border-app-border bg-app-bg-secondary/50 py-3 pl-11 dark:border-app-border-dark dark:bg-app-bg-dark"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-11 w-full rounded-integrallys border-app-border px-6 text-app-text-primary hover:bg-app-bg-secondary dark:text-white/70 dark:hover:bg-app-hover sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className="h-11 w-full rounded-integrallys bg-app-primary px-8 font-normal text-white shadow-sm hover:bg-app-primary-hover sm:w-auto"
            >
              Agendar
            </Button>
          </DialogFooter>
        </form>

        <div className="sr-only">{patientName}</div>
      </DialogContent>
    </Dialog>
  )
}
