'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Clock, Edit, Loader2, Plus, Trash2 } from 'lucide-react'
import { useTarefas, type CreateTarefaPayload, type TarefaItem } from '@/hooks/use-tarefas'
import { useUsuarios } from '@/hooks/use-usuarios'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'

const STATUS_OPTIONS = ['Pendente', 'Em andamento', 'Concluída', 'Cancelada']

function statusTone(status: string) {
  const s = status.toLowerCase()
  if (s.includes('conclu')) return 'app-status-success'
  if (s.includes('andamento')) return 'app-status-info'
  if (s.includes('cancel')) return 'app-status-danger'
  return 'app-status-warning'
}

interface TarefaFormData {
  titulo: string
  descricao: string
  responsavelNome: string
  status: string
}

const emptyForm: TarefaFormData = { titulo: '', descricao: '', responsavelNome: '', status: 'Pendente' }

export function RelatorioTarefasView() {
  const { data, isLoading, error, createTarefa, updateTarefa, deleteTarefa } = useTarefas()
  const { data: usuarios } = useUsuarios()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TarefaItem | null>(null)
  const [form, setForm] = useState<TarefaFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('todos')

  const openCreate = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (item: TarefaItem) => {
    setEditingItem(item)
    setForm({ titulo: item.titulo, descricao: '', responsavelNome: item.responsavel, status: item.status })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast.error('Título é obrigatório.')
      return
    }
    setIsSaving(true)
    try {
      const payload: CreateTarefaPayload = {
        titulo: form.titulo,
        descricao: form.descricao || undefined,
        responsavelNome: form.responsavelNome || undefined,
        status: form.status,
      }
      if (editingItem) {
        await updateTarefa({ ...payload, id: editingItem.id })
        toast.success('Tarefa atualizada.')
      } else {
        await createTarefa(payload)
        toast.success('Tarefa criada.')
      }
      setIsModalOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar tarefa.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: TarefaItem) => {
    try {
      await deleteTarefa(item.id)
      toast.success('Tarefa excluída.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir tarefa.')
    }
  }

  const handleQuickStatus = async (item: TarefaItem, newStatus: string) => {
    try {
      await updateTarefa({ id: item.id, titulo: item.titulo, responsavelNome: item.responsavel, status: newStatus })
      toast.success(`Status alterado para ${newStatus}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status.')
    }
  }

  const filtered = filterStatus === 'todos' ? data : data.filter((item) => item.status === filterStatus)

  return (
    <div className="app-page">
      <PageHeader
        title="Tarefas"
        description="Gerencie tarefas operacionais da equipe."
        actions={
          <>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nova tarefa
            </Button>
          </>
        }
      />

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}
      {isLoading && <p className="text-app-text-secondary">Carregando tarefas...</p>}
      {!isLoading && filtered.length === 0 && <p className="text-app-text-secondary">Nenhuma tarefa encontrada.</p>}

      <div className="space-y-3">
        {filtered.map((item) => (
          <Card key={item.id} className="rounded-[16px] border-app-border dark:border-app-border-dark">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-app-text-primary dark:text-white">{item.titulo}</p>
                <p className="mt-1 text-xs text-app-text-secondary">{item.responsavel}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className={`${statusTone(item.status)} border-none text-xs`}>{item.status}</Badge>
                {item.status !== 'Concluída' && (
                  <Button variant="ghost" size="icon" title="Marcar como concluída" onClick={() => handleQuickStatus(item, 'Concluída')}>
                    <CheckCircle2 className="h-4 w-4 text-[var(--app-success-text)]" />
                  </Button>
                )}
                {item.status === 'Concluída' && (
                  <Button variant="ghost" size="icon" title="Reabrir" onClick={() => handleQuickStatus(item, 'Pendente')}>
                    <Clock className="h-4 w-4 text-[var(--app-warning-text)]" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(item)}>
                  <Edit className="h-4 w-4 text-app-text-secondary" />
                </Button>
                <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDelete(item)}>
                  <Trash2 className="h-4 w-4 text-[var(--app-danger-text)]" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título da tarefa" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Opcional" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.responsavelNome} onValueChange={(v) => setForm({ ...form, responsavelNome: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.nome}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="text-white">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
