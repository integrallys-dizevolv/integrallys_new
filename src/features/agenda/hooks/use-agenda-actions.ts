'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { AgendaModal, AgendaSlot } from '../agenda.types'

interface UseAgendaActionsProps {
  updateAgendamento: (payload: {
    id: string
    pacienteId: string
    profissional: string
    data: string
    horario: string
    status: string
  }) => Promise<void>
  deleteAgendamento: (id: string, reason: string) => Promise<void>
  createLancamento: (payload: {
    descricao: string
    categoria: string
    valor: number
    tipo: 'receita' | 'despesa'
    metodo?: string
    observacoes?: string
    status?: string
  }) => Promise<void>
  createWaitlistItem: (payload: {
    pacienteId: string
    prioridade: string
    observacoes?: string
    procedimentoId?: string
    especialistaId?: string
  }) => Promise<void>
  createTarefa: (payload: {
    titulo: string
    descricao: string
    responsavelNome: string
    status: string
  }) => Promise<void>
  findPacienteId: (slot: AgendaSlot) => string | undefined
}

export function useAgendaActions({
  updateAgendamento,
  deleteAgendamento,
  createLancamento,
  createWaitlistItem,
  createTarefa,
  findPacienteId,
}: UseAgendaActionsProps) {
  const [activeModal, setActiveModal] = useState<AgendaModal>(null)
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlot | null>(null)

  const openSlotModal = (
    modal: Extract<AgendaModal, 'remarcar' | 'cancelar' | 'detalhes' | 'visualizar' | 'ficha-paciente' | 'chamar-especialista'>,
    slot: AgendaSlot,
  ) => {
    setSelectedSlot(slot)
    setActiveModal(modal)
  }

  const handleOpenCharge = (slot: AgendaSlot) => {
    setSelectedSlot(slot)
    setActiveModal('cobranca')
  }

  const parseAgendaDate = (value?: string) => {
    if (!value) return ''
    const parts = value.split('/')
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
    return value
  }

  const handleStatusChange = async (slot: AgendaSlot, status: string) => {
    if (status === 'Cancelado') {
      setSelectedSlot(slot)
      setActiveModal('cancelar')
      return
    }

    const pacienteId = findPacienteId(slot)
    if (!pacienteId) {
      toast.error('Não foi possível localizar o paciente deste agendamento.')
      return
    }

    try {
      await updateAgendamento({
        id: slot.id,
        pacienteId,
        profissional: slot.profissional,
        data: parseAgendaDate(slot.data),
        horario: slot.hora,
        status,
      })
      toast.success(`Status atualizado para ${status}.`)

      // CR-HW-01 (item 1.4): ao iniciar atendimento, abre automaticamente o
      // prontuário em nova janela em modo tela grande (chrome escondido via
      // ?hardware=1 no (app)/layout). Requer interação do usuário prévia
      // (clique no menu de status) — a janela pode ser bloqueada por
      // pop-up blockers em alguns navegadores; o botão manual "Tela Grande"
      // no visualizar-consulta-modal cobre esse caso.
      if (status === 'Em Atendimento' && typeof window !== 'undefined') {
        window.open(
          `/prontuarios?paciente_id=${encodeURIComponent(pacienteId)}&hardware=1`,
          '_blank',
          'noopener',
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar o status.')
    }
  }

  const handleReschedule = async (payload: {
    id: string
    pacienteId?: string
    data: string
    horario: string
  }) => {
    if (!selectedSlot || !payload.pacienteId) return
    try {
      await updateAgendamento({
        id: payload.id,
        pacienteId: payload.pacienteId,
        profissional: selectedSlot.profissional,
        data: payload.data,
        horario: payload.horario,
        status: selectedSlot.status,
      })
      toast.success('Agendamento remarcado com sucesso.')
      setActiveModal(null)
      setSelectedSlot(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remarcar o agendamento.')
    }
  }

  const handleCancel = async (payload: { id: string; reason: string }) => {
    try {
      await deleteAgendamento(payload.id, payload.reason)
      toast.success('Agendamento cancelado com sucesso.')
      setActiveModal(null)
      setSelectedSlot(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível cancelar o agendamento.')
    }
  }

  const handleAddToWaitlist = async (payload: {
    pacienteId: string
    prioridade: string
    observacoes: string
    procedimentoId?: string
    especialistaId?: string
  }) => {
    try {
      await createWaitlistItem({
        pacienteId: payload.pacienteId,
        prioridade: payload.prioridade,
        observacoes: payload.observacoes || undefined,
        procedimentoId: payload.procedimentoId || undefined,
        especialistaId: payload.especialistaId || undefined,
      })
      toast.success('Paciente adicionado à lista de espera.')
      setActiveModal(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar à lista de espera.')
    }
  }

  const handleEmitCharge = async (payload: {
    descricao: string
    valor: number
    metodo: string
    observacoes: string
  }) => {
    if (!selectedSlot) return
    try {
      await createLancamento({
        descricao: payload.descricao,
        categoria: 'Consultas',
        valor: payload.valor,
        tipo: 'receita',
        metodo: payload.metodo,
        observacoes: payload.observacoes || `${selectedSlot.profissional} • ${selectedSlot.hora}`,
        status: 'Pendente',
      })
      toast.success('Cobrança emitida no financeiro com sucesso.')
      setActiveModal(null)
      setSelectedSlot(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível emitir a cobrança.')
    }
  }

  const handleCallSpecialist = async (profissionalId?: string, mensagem?: string) => {
    const slot = selectedSlot
    if (!slot) return
    const profNome = profissionalId ? undefined : slot.profissional
    try {
      await createTarefa({
        titulo: `Contato com especialista - ${slot.paciente}`,
        descricao: mensagem
          ? `${mensagem}\n\nReferente: ${slot.profissional} • ${slot.hora}${slot.data ? ` • ${slot.data}` : ''}`
          : `Solicitação gerada pela agenda para ${slot.profissional} referente ao horário ${slot.hora}${slot.data ? ` em ${slot.data}` : ''}.`,
        responsavelNome: profNome ?? slot.profissional,
        status: 'Pendente',
      })
      toast.success('Solicitação enviada para o especialista nas tarefas.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível chamar o especialista.')
    }
  }

  return {
    activeModal,
    setActiveModal,
    selectedSlot,
    setSelectedSlot,
    openSlotModal,
    handleOpenCharge,
    parseAgendaDate,
    handleStatusChange,
    handleReschedule,
    handleCancel,
    handleAddToWaitlist,
    handleEmitCharge,
    handleCallSpecialist,
  }
}
