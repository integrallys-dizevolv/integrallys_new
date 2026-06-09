'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export interface PerfilPermissaoModal {
    id: number
    nome?: string
    perfil?: string
    descricao?: string
    escopo?: string
    usuarios?: number
    especialistas?: number
}

interface ExcluirPerfilModalProps {
    isOpen: boolean
    onClose: (open: boolean) => void
    profile: PerfilPermissaoModal | null
    onConfirm: (profileId: number) => void
}

export function ExcluirPerfilModal({ isOpen, onClose, profile, onConfirm }: ExcluirPerfilModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent size="sm" className="w-[95%] sm:w-full gap-0 overflow-hidden rounded-[24px] dark:bg-app-bg-dark dark:border-app-border-dark">
                <DialogHeader className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full app-status-danger dark:bg-transparent flex items-center justify-center mb-4">
                        <AlertTriangle className="h-7 w-7 text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)]" />
                    </div>
                    <DialogTitle className="text-xl font-bold dark:text-white">Excluir Perfil</DialogTitle>
                    <DialogDescription className="text-app-text-muted mt-2 dark:text-app-text-muted">
                        Você está prestes a excluir o perfil <span className="font-bold text-app-text-primary dark:text-white">&quot;{profile?.perfil || profile?.nome}&quot;</span>.
                        Esta ação não pode ser desfeita e afetará todos os usuários vinculados.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="px-6 py-8 pt-4 flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onClose(false)}
                        className="flex-1 h-11 rounded-lg border-app-border text-app-text-primary hover:bg-app-bg-secondary dark:border-app-border-dark dark:text-white/80 dark:hover:bg-app-card/5"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => profile && onConfirm(profile.id)}
                        className="flex-1 h-11 rounded-lg bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white shadow-sm font-medium transition-colors"
                    >
                        Confirmar Exclusão
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
