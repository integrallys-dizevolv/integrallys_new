'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { CreateFinanceiroPayload, FinanceiroItem } from '@/hooks/use-financeiro'
import { parseCurrencyInput } from '../financeiro.utils'

export type NewLancamentoState = {
  descricao: string
  categoria: string
  valor: string
  tipo: 'receita' | 'despesa'
  data: string
  observacoes: string
}

export const initialFormState: NewLancamentoState = {
  descricao: '',
  categoria: '',
  valor: '',
  tipo: 'receita',
  data: '',
  observacoes: '',
}

interface UseLancamentoFormParams {
  onCreate: (payload: CreateFinanceiroPayload) => Promise<void>
  onUpdate: (payload: CreateFinanceiroPayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function useLancamentoForm({ onCreate, onUpdate, onDelete }: UseLancamentoFormParams) {
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isLancamentoViewOpen, setIsLancamentoViewOpen] = useState(false)
  const [isLancamentoEditOpen, setIsLancamentoEditOpen] = useState(false)
  const [isLancamentoDeleteOpen, setIsLancamentoDeleteOpen] = useState(false)
  const [selectedLancamento, setSelectedLancamento] = useState<FinanceiroItem | null>(null)
  const [formData, setFormData] = useState<NewLancamentoState>(initialFormState)
  const [editLancamentoForm, setEditLancamentoForm] = useState<NewLancamentoState>(initialFormState)

  const handleCreateLancamento = async () => {
    if (!formData.descricao || !formData.categoria || !formData.valor) {
      toast.error('Preencha descrição, categoria e valor do lançamento.')
      return
    }

    try {
      await onCreate({
        descricao: formData.descricao,
        categoria: formData.categoria,
        valor: parseCurrencyInput(formData.valor),
        tipo: formData.tipo,
        data: formData.data,
        observacoes: formData.observacoes,
      })
      toast.success('Lançamento salvo com sucesso.')
      setIsNewOpen(false)
      setFormData(initialFormState)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o lançamento.')
    }
  }

  const handleOpenLancamentoView = (item: FinanceiroItem) => {
    setSelectedLancamento(item)
    setIsLancamentoViewOpen(true)
  }

  const handleOpenLancamentoEdit = (item: FinanceiroItem) => {
    setSelectedLancamento(item)
    setEditLancamentoForm({
      descricao: item.descricao,
      categoria: item.categoria,
      valor: item.valor.toString().replace('.', ','),
      tipo: item.tipo,
      data: item.data ? item.data.split(' ')[0].split('/').reverse().join('-') : '',
      observacoes: item.observacoes ?? '',
    })
    setIsLancamentoEditOpen(true)
  }

  const handleUpdateLancamento = async () => {
    if (!selectedLancamento || !editLancamentoForm.descricao || !editLancamentoForm.categoria || !editLancamentoForm.valor) {
      toast.error('Preencha descrição, categoria e valor do lançamento.')
      return
    }

    try {
      await onUpdate({
        id: selectedLancamento.id,
        descricao: editLancamentoForm.descricao,
        categoria: editLancamentoForm.categoria,
        valor: parseCurrencyInput(editLancamentoForm.valor),
        tipo: editLancamentoForm.tipo,
        data: editLancamentoForm.data,
        observacoes: editLancamentoForm.observacoes,
        metodo: selectedLancamento.metodo,
        status: selectedLancamento.status,
      })
      toast.success('Lançamento atualizado com sucesso.')
      setIsLancamentoEditOpen(false)
      setSelectedLancamento(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar o lançamento.')
    }
  }

  const handleDeleteLancamento = async () => {
    if (!selectedLancamento) return
    try {
      await onDelete(selectedLancamento.id)
      toast.success('Lançamento removido com sucesso.')
      setIsLancamentoDeleteOpen(false)
      setSelectedLancamento(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir o lançamento.')
    }
  }

  return {
    isNewOpen,
    setIsNewOpen,
    isLancamentoViewOpen,
    setIsLancamentoViewOpen,
    isLancamentoEditOpen,
    setIsLancamentoEditOpen,
    isLancamentoDeleteOpen,
    setIsLancamentoDeleteOpen,
    selectedLancamento,
    setSelectedLancamento,
    formData,
    setFormData,
    editLancamentoForm,
    setEditLancamentoForm,
    handleCreateLancamento,
    handleOpenLancamentoView,
    handleOpenLancamentoEdit,
    handleUpdateLancamento,
    handleDeleteLancamento,
  }
}
