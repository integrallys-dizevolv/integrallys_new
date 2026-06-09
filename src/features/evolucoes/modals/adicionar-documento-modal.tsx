'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter
} from '@/components/ui/dialog'
import { DateInput } from '@/components/shared/date-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { FileText, Save, X, UploadCloud } from 'lucide-react'

interface AdicionarDocumentoModalProps {
    isOpen: boolean
    onClose: () => void
}

export function AdicionarDocumentoModal({ isOpen, onClose }: AdicionarDocumentoModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                hideCloseButton={true}
                className="w-[95vw] sm:max-w-[600px] p-8 rounded-[24px] bg-app-card dark:bg-app-card-dark border border-app-border dark:border-app-border-dark shadow-lg block custom-scrollbar"
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-app-text-primary dark:text-white" />
                            <h2 className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">
                                Adicionar documento
                            </h2>
                        </div>
                        <p className="text-base text-app-text-muted dark:text-app-text-muted font-normal">
                            Anexe um novo documento ao histórico do paciente
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
                    >
                        <X className="h-4 w-4 text-app-text-muted" />
                    </button>
                </div>

                <div className="space-y-6 mb-8">
                    {/* Row 1: Título/Tipo */}
                    <div className="space-y-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
                            Tipo de documento *
                        </Label>
                        <Select>
                            <SelectTrigger className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-secondary dark:text-white/80">
                                <SelectValue preferPlaceholder placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[12px]">
                                <SelectItem value="prescricao">Prescrição</SelectItem>
                                <SelectItem value="atestado">Atestado</SelectItem>
                                <SelectItem value="exame">Resultado de Exame</SelectItem>
                                <SelectItem value="encaminhamento">Encaminhamento</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Row 2: Data & Meio */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
                                Data do envio *
                            </Label>
                            <DateInput value="" onChange={() => {}} className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted block w-full" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
                                Meio de envio *
                            </Label>
                            <Select>
                                <SelectTrigger className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-secondary dark:text-white/80">
                                    <SelectValue preferPlaceholder placeholder="Selecione o meio" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[12px]">
                                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                    <SelectItem value="email">E-mail</SelectItem>
                                    <SelectItem value="impresso">Impresso/Físico</SelectItem>
                                    <SelectItem value="portal">Portal do Paciente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Upload */}
                    <div className="space-y-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
                            Anexo *
                        </Label>
                        <div className="border-2 border-dashed border-app-border dark:border-app-border-dark rounded-[16px] p-8 flex flex-col items-center justify-center text-center hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors cursor-pointer bg-app-bg-secondary/50 dark:bg-app-surface-muted">
                            <div className="h-12 w-12 rounded-full bg-app-bg-secondary dark:bg-app-hover flex items-center justify-center mb-4">
                                <UploadCloud className="h-6 w-6 text-app-primary dark:text-white" />
                            </div>
                            <p className="text-sm font-normal text-app-text-primary dark:text-white mb-1">
                                Clique para fazer upload ou arraste e solte
                            </p>
                            <p className="text-xs text-app-text-muted dark:text-app-text-muted">
                                PDF, JPG, PNG (máx. 10MB)
                            </p>
                        </div>
                    </div>

                    {/* Row 4: Observações */}
                    <div className="space-y-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
                            Observações (opcional)
                        </Label>
                        <Textarea
                            placeholder="Adicione observações sobre este documento..."
                            className="min-h-[100px] rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark resize-none p-4 text-base focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)]"
                        />
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end w-full border-t border-app-border dark:border-app-border-dark pt-4">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full sm:w-auto h-12 rounded-[12px] font-normal text-app-text-primary dark:text-white hover:bg-app-bg-secondary dark:hover:bg-app-hover border border-app-border dark:border-app-border-dark"
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="w-full sm:w-auto px-8 h-12 bg-app-primary hover:bg-app-primary-hover text-white rounded-[12px] font-normal shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        onClick={onClose}
                    >
                        <Save className="h-4 w-4" />
                        Salvar documento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
