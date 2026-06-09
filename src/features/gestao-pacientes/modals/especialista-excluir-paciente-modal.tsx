'use client'

import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface Paciente {
    id: number
    nome: string
}

interface ExcluirPacienteModalProps {
    isOpen: boolean
    onClose: () => void
    paciente: Paciente | null
}

export function ExcluirPacienteModal({ isOpen, onClose, paciente }: ExcluirPacienteModalProps) {
    if (!paciente) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                hideCloseButton={true}
                className="sm:max-w-[500px] p-0 rounded-[20px] overflow-hidden border-none shadow-2xl"
            >
                <div className="bg-app-card dark:bg-app-card-dark p-8">
                    {/* Header with Icon and Title */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-full app-status-danger dark:bg-transparent flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-6 w-6 text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)]" />
                        </div>
                        <h2 className="text-2xl font-normal text-app-text-primary dark:text-white">
                            Excluir paciente
                        </h2>
                    </div>

                    {/* Description */}
                    <p className="text-app-text-muted dark:text-app-text-muted text-lg leading-relaxed mb-10">
                        Tem certeza que deseja excluir o paciente <span className="font-normal text-app-text-primary dark:text-white">{paciente.nome}</span>? Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-12 px-8 rounded-[12px] border-app-border text-app-text-primary hover:bg-app-bg-secondary dark:border-app-border-dark dark:text-white/80 dark:hover:bg-app-hover font-normal text-base"
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="h-12 px-10 rounded-[12px] bg-[#d93f48] hover:bg-[#c1323a] text-white font-normal text-base shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02]"
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
