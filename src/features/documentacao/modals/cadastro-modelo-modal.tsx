'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, Save } from 'lucide-react'
import { toast } from 'sonner'
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
import { Textarea } from '@/components/ui/textarea'
import type { DocumentoClinicoInput, DocumentoClinicoItem } from '../hooks/use-documentacao'

interface CadastroModeloModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documento: DocumentoClinicoItem | null
  onSave: (payload: DocumentoClinicoInput) => Promise<void>
  especialistas?: Array<{ id: string; nome: string }>
  pacientes?: Array<{ id: string; nome: string }>
}

type FormState = {
  nome: string
  categoria: string
  descricao: string
  template: string
  especialista: string
  pacienteId: string
  meio: string
  anexoUrl: string
}

const initialForm: FormState = {
  nome: '',
  categoria: 'Avaliação',
  descricao: '',
  template: '',
  especialista: '',
  pacienteId: '',
  meio: 'digital',
  anexoUrl: '',
}

export function CadastroModeloModal({
  open,
  onOpenChange,
  documento,
  onSave,
  especialistas,
  pacientes,
}: CadastroModeloModalProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      nome: documento?.nome ?? '',
      categoria: documento?.categoria ?? documento?.tipo ?? 'Avaliação',
      descricao: documento?.descricao ?? '',
      template: documento?.template ?? '',
      especialista: documento?.especialista ?? '',
      pacienteId: documento?.pacienteId ?? '',
      meio: documento?.meio ?? 'digital',
      anexoUrl: documento?.anexoUrl ?? '',
    })
  }, [documento, open])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onSave({
        id: documento?.id,
        pacienteId: form.pacienteId,
        tipo: form.categoria,
        categoria: form.categoria,
        nome: form.nome,
        descricao: form.descricao,
        template: form.template,
        especialista: form.especialista,
        meio: form.meio,
        anexoUrl: form.anexoUrl.trim() || undefined,
      })
      toast.success(documento ? 'Modelo atualizado.' : 'Modelo criado.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o modelo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={documento?.id ?? 'new'}
        className="app-page-frame flex w-full flex-col p-0 rounded-[32px] border-none bg-app-card dark:bg-app-card-dark shadow-2xl"
      >
        <DialogHeader className="px-10 pt-10 pb-6 bg-app-bg-secondary/50 dark:bg-app-card/5">
          <DialogTitle className="text-2xl font-medium text-app-text-primary dark:text-white leading-none">
            {documento ? 'Editar Modelo' : 'Novo Modelo de Documento'}
          </DialogTitle>
          <p className="text-sm text-app-text-muted dark:text-app-text-muted mt-2 font-normal">
            Configure os detalhes técnicos do seu documento clínico.
          </p>
        </DialogHeader>

        <div className="p-10 space-y-8 bg-app-card dark:bg-app-card-dark custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider ml-1">Paciente</label>
              <Select
                value={form.pacienteId}
                onValueChange={(val) => setForm({ ...form, pacienteId: val })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-app-bg-secondary/50 dark:bg-app-card/5 border-app-border dark:border-app-border-dark">
                  <SelectValue preferPlaceholder placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark">
                  {(pacientes ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider ml-1">Nome do Modelo</label>
              <Input
                placeholder="Ex: Atestado de Comparecimento"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="h-12 rounded-xl bg-app-bg-secondary/50 dark:bg-app-card/5 border-app-border dark:border-app-border-dark"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider ml-1">Categoria</label>
              <Select
                value={form.categoria}
                onValueChange={(val) => setForm({ ...form, categoria: val })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-app-bg-secondary/50 dark:bg-app-card/5 border-app-border dark:border-app-border-dark">
                  <SelectValue preferPlaceholder placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark">
                  <SelectItem value="Avaliação">Avaliação</SelectItem>
                  <SelectItem value="Evolução">Evolução</SelectItem>
                  <SelectItem value="Prescrição">Prescrição</SelectItem>
                  <SelectItem value="Exame">Exame</SelectItem>
                  <SelectItem value="Relatório">Relatório</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider ml-1">Especialista vinculado</label>
              {especialistas && especialistas.length > 0 ? (
                <Select
                  value={form.especialista}
                  onValueChange={(val) => setForm({ ...form, especialista: val })}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-app-bg-secondary/50 dark:bg-app-card/5 border-app-border dark:border-app-border-dark">
                    <SelectValue preferPlaceholder placeholder="Selecione o especialista" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark">
                    {especialistas.map((item) => (
                      <SelectItem key={item.id} value={item.nome}>{item.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Nome do especialista"
                  value={form.especialista}
                  onChange={(e) => setForm({ ...form, especialista: e.target.value })}
                  className="h-12 rounded-xl bg-app-bg-secondary/50 dark:bg-app-card/5 border-app-border dark:border-app-border-dark"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider ml-1">Descrição Curta</label>
            <Input
              placeholder="Descreva brevemente a finalidade deste modelo..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="h-12 rounded-xl bg-app-bg-secondary/50 dark:bg-app-card/5 border-app-border dark:border-app-border-dark"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-app-text-primary dark:text-white ml-1">Template do Documento *</label>

            <div className="p-4 rounded-xl app-status-info border border-transparent flex gap-3 items-center">
              <Lightbulb size={18} className="text-[var(--app-info-text)] shrink-0" />
              <p className="text-xs text-[var(--app-info-text)] dark:text-[var(--app-info-text)]">
                Use as variáveis entre chaves duplas: <code className="font-bold">{'{{ nomeCompleto }}, {{ cpf }}, {{ dataAtendimento }}'}</code>, etc.
              </p>
            </div>

            <Textarea
              placeholder="Digite o template do documento aqui..."
              value={form.template}
              onChange={(e) => setForm({ ...form, template: e.target.value })}
              className="min-h-[200px] rounded-xl bg-app-bg-secondary/50 dark:bg-app-card/5 border-app-border dark:border-app-border-dark p-4 resize-none focus:ring-1 focus:ring-[var(--app-text-primary)]"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-6 sm:px-10 sm:py-8 bg-app-bg-secondary/50 dark:bg-app-card/5 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full sm:w-auto px-8 rounded-xl border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white/80 font-medium hover:bg-app-bg-secondary dark:hover:bg-app-hover"
          >
            Cancelar
          </Button>
          <Button
            className="h-12 w-full sm:w-auto px-8 rounded-xl bg-app-primary hover:bg-app-primary-hover text-white font-medium flex gap-2 items-center justify-center shadow-sm"
            onClick={() => void handleSave()}
            disabled={isSaving || !form.pacienteId || !form.nome || !form.categoria}
          >
            <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Modelo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
