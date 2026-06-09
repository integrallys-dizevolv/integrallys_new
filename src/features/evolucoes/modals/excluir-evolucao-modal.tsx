'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ExcluirEvolucaoModalProps {
    isOpen: boolean
    onClose: () => void
    pacienteNome?: string
}

export function ExcluirEvolucaoModal({ isOpen, onClose, pacienteNome = 'Maria Silva' }: ExcluirEvolucaoModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                hideCloseButton={true}
                className="sm:max-w-[550px] p-0 rounded-[24px] overflow-hidden border-none shadow-2xl"
            >
                <div className="bg-app-card dark:bg-app-card-dark p-10">
                    {/* Header with Icon and Title */}
                    <div className="flex items-center gap-5 mb-6">
                        <div className="h-14 w-14 rounded-full bg-[#fef2f2] dark:bg-transparent flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-7 w-7 text-[#dc2626] dark:text-[var(--app-danger-text)]" />
                        </div>
                        <h2 className="text-2xl font-normal text-app-text-primary dark:text-white tracking-tight">
                            Excluir evolução
                        </h2>
                    </div>

                    {/* Description */}
                    <p className="text-[#64748b] dark:text-app-text-muted text-lg leading-relaxed mb-10 font-normal">
                        Tem certeza que deseja excluir a evolução de <span className="font-normal text-app-text-primary dark:text-white">{pacienteNome}</span>? Esta ação não pode ser desfeita.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-12 px-8 rounded-[12px] border-app-border dark:border-app-border-dark text-app-text-primary dark:text-white font-normal text-base hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-all bg-white dark:bg-transparent"
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="h-12 px-10 rounded-[12px] bg-[#e11d48] hover:bg-[#be123c] text-white font-normal text-base shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02]"
                            onClick={() => {
                                // Lógica de exclusão aqui
                                onClose();
                            }}
                        >
                            Excluir
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
