'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import type { PrescricaoInput } from '@/hooks/use-prescricoes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface NovaPrescricaoEvolucaoModalProps {
  isOpen: boolean
  onClose: () => void
  evolucaoId?: string
  pacienteId?: string
  pacienteNome?: string
  onSave: (payload: PrescricaoInput) => Promise<void>
}

interface EvolucaoMedicamentoItem {
  id: string
  nome: string
  quantidade: string
  posologia: string
}

function createItem(): EvolucaoMedicamentoItem {
  return {
    id: Math.random().toString(36).slice(2, 9),
    nome: '',
    quantidade: '1',
    posologia: '',
  }
}

function buildObservacoes(items: EvolucaoMedicamentoItem[], observacoes: string) {
  const linhas = items
    .filter((item) => item.nome.trim())
    .map((item, index) => {
      const partes = [
        `${index + 1}. ${item.nome.trim()}`,
        item.quantidade.trim() ? `Qtd: ${item.quantidade.trim()}` : '',
        item.posologia.trim() ? `Posologia: ${item.posologia.trim()}` : '',
      ].filter(Boolean)
      return partes.join(' | ')
    })

  return ['Prescrição vinculada à evolução:', ...linhas, observacoes.trim() ? `Observações: ${observacoes.trim()}` : '']
    .filter(Boolean)
    .join('\n')
}

export function NovaPrescricaoEvolucaoModal({
  isOpen,
  onClose,
  evolucaoId,
  pacienteId: initialPacienteId,
  pacienteNome,
  onSave,
}: NovaPrescricaoEvolucaoModalProps) {
  const [pacienteId, setPacienteId] = useState('')
  const [validade, setValidade] = useState('30')
  const [medicamentos, setMedicamentos] = useState<EvolucaoMedicamentoItem[]>([createItem()])
  const [observacoes, setObservacoes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const titulo = useMemo(
    () => (pacienteNome ? `Prescrição para ${pacienteNome}` : 'Nova prescrição a partir desta evolução'),
    [pacienteNome],
  )

  useEffect(() => {
    setPacienteId(initialPacienteId ?? '')
    setValidade('30')
  }, [initialPacienteId, isOpen])

  const resetForm = () => {
    setPacienteId('')
    setValidade('30')
    setMedicamentos([createItem()])
    setObservacoes('')
    setIsSaving(false)
  }

  const handleClose = () => {
    if (isSaving) return
    resetForm()
    onClose()
  }

  const handleChange = (id: string, field: keyof Omit<EvolucaoMedicamentoItem, 'id'>, value: string) => {
    setMedicamentos((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleSave = async () => {
    const validos = medicamentos.filter((item) => item.nome.trim())
    if (!pacienteId) {
      toast.error('Informe o paciente da evolução antes de salvar.')
      return
    }
    if (validos.length === 0) {
      toast.error('Adicione ao menos um medicamento para continuar.')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        pacienteId,
        valorTotal: 0,
        status: 'Ativa',
        tipo: 'evolucao',
        evolucaoId,
        validade: validade === 'indeterminado' ? 'Indeterminado' : `${validade} dias`,
        observacoes: buildObservacoes(validos, observacoes),
      })
      toast.success('Prescrição criada.')
      resetForm()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar a prescrição.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[550px] p-6 md:p-8 rounded-[24px] bg-app-card dark:bg-app-card-dark border border-app-border dark:border-app-border-dark shadow-lg block custom-scrollbar"
      >
        <DialogTitle className="sr-only">Nova prescrição de evolução</DialogTitle>

        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-app-text-primary dark:text-white" />
              <h2 className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">{titulo}</h2>
            </div>
            <p className="text-base text-app-text-muted dark:text-app-text-muted font-normal">
              Crie uma nova prescrição baseada na evolução clínica atual
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-app-text-muted" />
          </button>
        </div>

        <div className="space-y-5 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Paciente</Label>
            <Input
              readOnly
              value={pacienteNome ?? ''}
              className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-muted dark:text-app-text-muted font-normal"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">
              Validade
            </Label>
            <Select value={validade} onValueChange={setValidade}>
              <SelectTrigger className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-secondary dark:text-white/80">
                <SelectValue preferPlaceholder placeholder="Selecione a validade" />
              </SelectTrigger>
              <SelectContent className="rounded-[12px]">
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="indeterminado">Indeterminado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {medicamentos.map((item, index) => (
            <div key={item.id} className="space-y-4 rounded-[18px] border border-app-border dark:border-app-border-dark p-4">
              <div className="flex items-center justify-between">
                <Badge className="rounded-full border-0 bg-app-bg-secondary dark:bg-app-card-dark text-app-text-secondary dark:text-white/80 px-3 py-1 font-normal shadow-none">
                  Item {index + 1}
                </Badge>
                {index === medicamentos.length - 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMedicamentos((current) => [...current, createItem()])}
                    className="h-9 rounded-integrallys border-app-border dark:border-app-border-dark font-normal"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-normal text-app-text-primary dark:text-white">Medicamento</Label>
                <Input
                  placeholder="Digite o nome do produto..."
                  value={item.nome}
                  onChange={(event) => handleChange(item.id, 'nome', event.target.value)}
                  className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-primary dark:text-white placeholder:text-app-text-muted"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-app-text-primary dark:text-white">Quantidade</Label>
                  <Input
                    placeholder="Ex: 1 frasco"
                    value={item.quantidade}
                    onChange={(event) => handleChange(item.id, 'quantidade', event.target.value)}
                    className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-primary dark:text-white placeholder:text-app-text-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-app-text-primary dark:text-white">Posologia</Label>
                  <Input
                    placeholder="Ex: 1 dose ao dia"
                    value={item.posologia}
                    onChange={(event) => handleChange(item.id, 'posologia', event.target.value)}
                    className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-primary dark:text-white placeholder:text-app-text-muted"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Observações complementares da prescrição."
              className="min-h-[120px] rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark resize-none p-4 text-base"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end w-full border-t border-app-border dark:border-app-border-dark pt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto h-11 px-6 rounded-integrallys font-normal text-app-text-primary dark:text-white hover:bg-app-bg-secondary dark:hover:bg-app-hover border-app-border dark:border-app-border-dark"
          >
            Cancelar
          </Button>
          <Button
            className="w-full sm:w-auto px-6 h-11 bg-app-primary hover:bg-app-primary-hover text-white rounded-integrallys font-normal shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Criar prescrição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
