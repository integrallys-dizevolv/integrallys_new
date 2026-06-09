'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Check, FileText, PencilLine, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { usePacientes } from '@/hooks/use-pacientes'
import type { PrescricaoInput } from '@/hooks/use-prescricoes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/shared/signature-pad'

interface NovaPrescricaoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: PrescricaoInput) => Promise<void>
}

interface MedicamentoFormItem {
  id: string
  nome: string
  posologia: string
  quantidade: string
}

function createMedicamentoItem(): MedicamentoFormItem {
  return {
    id: Math.random().toString(36).slice(2, 9),
    nome: '',
    posologia: '',
    quantidade: '1',
  }
}

function buildObservacoes(
  medicamentos: MedicamentoFormItem[],
  observacoes: string,
  heading: string,
) {
  const itens = medicamentos
    .filter((item) => item.nome.trim())
    .map((item, index) => {
      const partes = [
        `${index + 1}. ${item.nome.trim()}`,
        item.quantidade.trim() ? `Qtd: ${item.quantidade.trim()}` : '',
        item.posologia.trim() ? `Posologia: ${item.posologia.trim()}` : '',
      ].filter(Boolean)
      return partes.join(' | ')
    })

  return [heading, ...itens, observacoes.trim() ? `Observações: ${observacoes.trim()}` : '']
    .filter(Boolean)
    .join('\n')
}

export function NovaPrescricaoModal({ isOpen, onClose, onSave }: NovaPrescricaoModalProps) {
  const { data: pacientes } = usePacientes()
  const [pacienteId, setPacienteId] = useState('')
  const [tipo, setTipo] = useState<'normal' | 'manipulada'>('normal')
  const [validade, setValidade] = useState('30')
  const [observacoes, setObservacoes] = useState('')
  const [medicamentos, setMedicamentos] = useState<MedicamentoFormItem[]>([createMedicamentoItem()])
  const [isSaving, setIsSaving] = useState(false)
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null)
  const [signaturePadOpen, setSignaturePadOpen] = useState(false)

  const pacienteOptions = useMemo(
    () => pacientes.map((item) => ({ id: item.id, nome: item.nome })),
    [pacientes],
  )

  const resetForm = () => {
    setPacienteId('')
    setTipo('normal')
    setValidade('30')
    setObservacoes('')
    setMedicamentos([createMedicamentoItem()])
    setIsSaving(false)
    setSignatureBase64(null)
    setSignaturePadOpen(false)
  }

  const handleClose = () => {
    if (isSaving) return
    resetForm()
    onClose()
  }

  const handleMedicamentoChange = (id: string, field: keyof Omit<MedicamentoFormItem, 'id'>, value: string) => {
    setMedicamentos((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const handleAddMedicamento = () => {
    setMedicamentos((current) => [...current, createMedicamentoItem()])
  }

  const handleRemoveMedicamento = (id: string) => {
    setMedicamentos((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)))
  }

  const validateForm = () => {
    if (!pacienteId) {
      toast.error('Selecione o paciente para continuar.')
      return null
    }
    const medicamentosValidos = medicamentos.filter((item) => item.nome.trim())
    if (medicamentosValidos.length === 0) {
      toast.error('Adicione pelo menos um medicamento à prescrição.')
      return null
    }
    return medicamentosValidos
  }

  const handleSave = async () => {
    const medicamentosValidos = validateForm()
    if (!medicamentosValidos) return

    if (!signatureBase64) {
      toast.error('Assine a prescrição antes de salvar.')
      setSignaturePadOpen(true)
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        pacienteId,
        valorTotal: 0,
        status: 'Ativa',
        tipo,
        validade: `${validade} dias`,
        observacoes: buildObservacoes(medicamentosValidos, observacoes, 'Medicamentos prescritos:'),
        assinaturaBase64: signatureBase64,
      })
      toast.success('Prescrição assinada e salva.')
      resetForm()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar a prescrição.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenSignaturePad = () => {
    if (!validateForm()) return
    setSignaturePadOpen(true)
  }

  const handleSignatureCapture = (base64: string) => {
    setSignatureBase64(base64)
    setSignaturePadOpen(false)
    toast.success('Assinatura registrada.')
  }

  const handleClearSignature = () => {
    setSignatureBase64(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        hideCloseButton={true}
        className="w-[95vw] sm:max-w-[600px] p-8 rounded-[24px] bg-app-card dark:bg-app-card-dark border border-app-border dark:border-app-border-dark shadow-lg gap-8 custom-scrollbar"
      >
        <DialogTitle className="sr-only">Nova prescrição</DialogTitle>

        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-app-text-primary dark:text-white" />
              <h2 className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">Nova prescrição médica</h2>
            </div>
            <p className="text-base text-app-text-muted dark:text-app-text-muted font-normal">
              Prescrições para uso externo (farmácias, exames, orientações)
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

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Paciente *</Label>
              <Select value={pacienteId} onValueChange={setPacienteId}>
                <SelectTrigger className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-secondary dark:text-white/80">
                  <SelectValue preferPlaceholder placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="rounded-[12px]">
                  {pacienteOptions.map((paciente) => (
                    <SelectItem key={paciente.id} value={paciente.id}>
                      {paciente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
                Tipo de prescrição *
              </Label>
              <Select value={tipo} onValueChange={(value: 'normal' | 'manipulada') => setTipo(value)}>
                <SelectTrigger className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-primary dark:text-white font-normal">
                  <SelectValue preferPlaceholder placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-[12px]">
                  <SelectItem value="normal">Prescrição normal</SelectItem>
                  <SelectItem value="manipulada">Prescrição manipulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
              Validade (dias) *
            </Label>
            <Select value={validade} onValueChange={setValidade}>
              <SelectTrigger className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-primary dark:text-white font-normal">
                <SelectValue preferPlaceholder placeholder="Selecione a validade" />
              </SelectTrigger>
              <SelectContent className="rounded-[12px]">
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Medicamentos *</Label>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddMedicamento}
                className="h-10 rounded-[12px] border-app-border dark:border-app-border-dark font-normal"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar item
              </Button>
            </div>

            <div className="space-y-4">
              {medicamentos.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-[18px] border border-app-border dark:border-app-border-dark bg-app-bg-secondary/60 dark:bg-app-surface-muted/60 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="rounded-full border-0 bg-app-bg-secondary dark:bg-app-card-dark text-app-text-secondary dark:text-white/80 px-3 py-1 font-normal shadow-none">
                      Medicamento {index + 1}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicamento(item.id)}
                      className="rounded-lg p-2 text-app-text-muted transition-colors hover:bg-app-hover hover:text-[var(--app-danger-text)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr]">
                    <div className="space-y-2">
                      <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Nome</Label>
                      <Input
                        value={item.nome}
                        onChange={(event) => handleMedicamentoChange(item.id, 'nome', event.target.value)}
                        placeholder="Ex: Vitamina D 2000 UI"
                        className="h-12 rounded-[12px] bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Quantidade</Label>
                      <Input
                        value={item.quantidade}
                        onChange={(event) => handleMedicamentoChange(item.id, 'quantidade', event.target.value)}
                        placeholder="Ex: 1 caixa"
                        className="h-12 rounded-[12px] bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Posologia</Label>
                    <Textarea
                      value={item.posologia}
                      onChange={(event) => handleMedicamentoChange(item.id, 'posologia', event.target.value)}
                      placeholder="Ex: 1 cápsula após o café da manhã por 30 dias"
                      className="min-h-[96px] rounded-[12px] bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark resize-none p-4 text-base"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Descreva os medicamentos, dosagens, exames solicitados ou orientações..."
              className="min-h-[140px] rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark resize-none p-4 text-base focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] font-normal"
            />
          </div>

          <div className="space-y-4 pt-6 border-t border-app-border dark:border-app-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[var(--app-primary)]" />
                <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
                  Assinatura digital
                </Label>
              </div>
              {signatureBase64 ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-none font-normal px-3 py-1 rounded-full text-xs">
                  Assinada
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-none font-normal px-3 py-1 rounded-full text-xs">
                  Pendente
                </Badge>
              )}
            </div>

            {signatureBase64 ? (
              <div className="rounded-integrallys-lg border border-emerald-200/60 dark:border-emerald-700/40 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-16 w-32 rounded-md border border-app-border dark:border-app-border-dark bg-white shrink-0 overflow-hidden relative">
                    <Image
                      src={signatureBase64}
                      alt="Assinatura coletada"
                      fill
                      sizes="128px"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-normal text-app-text-primary dark:text-white">Assinatura coletada</p>
                    <p className="text-xs text-app-text-muted">Será anexada ao registro da prescrição.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignaturePadOpen(true)}
                    className="h-9 rounded-integrallys gap-2 border-app-border dark:border-app-border-dark"
                  >
                    <PencilLine className="h-4 w-4" />
                    Refazer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearSignature}
                    className="h-9 rounded-integrallys text-[var(--app-danger-text)] hover:bg-app-hover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-integrallys-lg border border-[var(--app-primary)]/20 bg-app-primary/5 dark:bg-app-primary/10 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full app-status-info dark:app-status-info flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-[var(--app-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-normal text-app-text-primary dark:text-white">
                      Assine a prescrição para finalizar
                    </p>
                    <p className="text-xs text-app-text-muted">A assinatura é obrigatória para salvar.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleOpenSignaturePad}
                  className="h-10 rounded-integrallys bg-app-primary text-white hover:bg-app-primary-hover gap-2 shrink-0"
                >
                  <PencilLine className="h-4 w-4" />
                  Assinar
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between w-full border-t border-app-border dark:border-app-border-dark pt-5">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full sm:w-auto h-12 rounded-[12px] font-normal text-app-text-primary dark:text-white hover:bg-app-bg-secondary dark:hover:bg-app-hover border border-app-border dark:border-app-border-dark"
          >
            Cancelar
          </Button>
          <Button
            className="w-full sm:w-auto px-8 h-12 bg-app-primary hover:bg-app-primary-hover border border-app-border-dark text-white rounded-[12px] font-normal shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar prescrição'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={signaturePadOpen} onOpenChange={(open) => !open && setSignaturePadOpen(false)}>
        <DialogContent size="lg" className="p-6 rounded-[20px] bg-app-card dark:bg-app-card-dark">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-normal text-app-text-primary dark:text-white">
              <ShieldCheck className="h-5 w-5 text-[var(--app-primary)]" />
              Assinatura digital da prescrição
            </DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSave={handleSignatureCapture}
            onCancel={() => setSignaturePadOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
