'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X } from 'lucide-react'

interface AdicionarNotaErrataModalProps {
    isOpen: boolean
    onClose: () => void
}

export function AdicionarNotaErrataModal({ isOpen, onClose }: AdicionarNotaErrataModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                hideCloseButton={true}
                className="w-[95vw] sm:max-w-[550px] p-6 md:p-8 rounded-[24px] bg-app-card dark:bg-app-card-dark border border-app-border dark:border-app-border-dark shadow-lg block custom-scrollbar"
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <h2 className="text-xl font-normal text-app-text-primary dark:text-white tracking-tight">
                            Adicionar nota/errata
                        </h2>
                        <p className="text-base text-app-text-muted dark:text-app-text-muted font-normal">
                            Adicione observações ou correções à evolução finalizada (RN-009)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
                    >
                        <X className="h-4 w-4 text-app-text-muted" />
                    </button>
                </div>

                <div className="space-y-5 mb-8">
                    {/* Paciente */}
                    <div className="space-y-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                            Paciente
                        </Label>
                        <Input
                            readOnly
                            value="Maria Silva"
                            className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-muted dark:text-app-text-muted font-normal"
                        />
                    </div>

                    {/* Data da Nota */}
                    <div className="space-y-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                            Data da nota
                        </Label>
                        <Input
                            readOnly
                            value="15/01/2026"
                            className="h-12 rounded-[12px] bg-app-bg-secondary dark:bg-app-surface-muted border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)] text-app-text-muted dark:text-app-text-muted font-normal"
                        />
                    </div>

                    {/* Texto da Nota */}
                    <div className="space-y-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                            Texto da nota/errata
                        </Label>
                        <Textarea
                            placeholder="Descreva a observação adicional ou correção necessária..."
                            className="min-h-[120px] rounded-[12px] bg-white dark:bg-app-surface-muted border-app-border dark:border-app-border-dark resize-none p-4 text-base focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)]"
                        />
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end w-full border-t border-app-border dark:border-app-border-dark pt-6">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto h-11 rounded-integrallys font-normal text-app-text-primary dark:text-white hover:bg-app-bg-secondary dark:hover:bg-app-hover border-app-border dark:border-app-border-dark"
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="w-full sm:w-auto px-6 h-11 bg-app-primary hover:bg-app-primary-hover text-white rounded-integrallys font-normal shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        onClick={onClose}
                    >
                        Adicionar nota/errata
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
