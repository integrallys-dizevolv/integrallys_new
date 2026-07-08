'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { toast } from 'sonner'

import type { EvolucaoItem } from '@/features/evolucoes/hooks/use-evolucoes'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface EditarRetornoRecepcaoModalProps {
  isOpen: boolean
  onClose: () => void
  evolucao: EvolucaoItem | null
  onSave: (payload: { id: string; retornoRecepcao: string }) => Promise<void>
}

export function EditarRetornoRecepcaoModal({
  isOpen,
  onClose,
  evolucao,
  onSave,
}: EditarRetornoRecepcaoModalProps) {
  const [retornoRecepcao, setRetornoRecepcao] = useState('Paciente avisado')
  const [observacao, setObservacao] = useState('')
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setRetornoRecepcao(evolucao?.retornoRecepcao ?? 'Paciente avisado')
    setObservacao('')
    setEnviarWhatsapp(false)
  }, [evolucao, isOpen])

  if (!evolucao) return null

  const handleClose = () => {
    if (isSaving) return
    onClose()
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({ id: evolucao.id, retornoRecepcao })
      if (enviarWhatsapp) {
        toast.info('Envio por WhatsApp em implementação.')
      }
      toast.success('Retorno atualizado.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar o retorno.')
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
        <DialogTitle className="sr-only">Editar retorno da recepção</DialogTitle>

        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">
              Editar retorno da recepção
            </h2>
            <p className="text-base text-app-text-muted dark:text-app-text-muted font-normal">
              Atualize as informações do retorno da recepção
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

        <div className="space-y-6 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Status do retorno</Label>
            <Select value={retornoRecepcao} onValueChange={setRetornoRecepcao}>
              <SelectTrigger className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-secondary dark:text-white/80">
                <SelectValue preferPlaceholder placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent className="rounded-[12px]">
                <SelectItem value="Paciente avisado">Paciente avisado</SelectItem>
                <SelectItem value="Retorno confirmado">Retorno confirmado</SelectItem>
                <SelectItem value="Não localizado">Não localizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">
              Detalhes do retorno (opcional)
            </Label>
            <Textarea
              placeholder="Descreva os detalhes..."
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              className="min-h-[100px] rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark resize-none p-4 text-base focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)]"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="space-y-1">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white cursor-pointer" htmlFor="enviar-whatsapp">
                Enviar por WhatsApp
              </Label>
              <p className="text-xs text-app-text-muted">Disparo automático será implementado em breve.</p>
            </div>
            <Switch
              id="enviar-whatsapp"
              checked={enviarWhatsapp}
              onCheckedChange={setEnviarWhatsapp}
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
            <MessageCircle className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
