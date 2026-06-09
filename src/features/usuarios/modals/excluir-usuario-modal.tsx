'use client'

import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export interface UsuarioModalData {
    id: number | string
    nome: string
    perfil?: string
    status?: 'Ativo' | 'Inativo'
    email?: string
    unidade?: string
    unidadeId?: string
    crth?: string
    tipoVinculo?: 'Colaborador' | 'Parceiro'
    isVendedor?: boolean
    comissao?: number
    profissionaisPermitidos?: string[]
    agendaPessoalPermitidos?: string[]
}

interface ExcluirUsuarioModalProps {
    isOpen: boolean
    onClose: (open: boolean) => void
    user: UsuarioModalData | null
    onConfirm?: (id: number | string) => Promise<void> | void
}

export function ExcluirUsuarioModal({ isOpen, onClose, user, onConfirm }: ExcluirUsuarioModalProps) {
    const handleConfirm = async () => {
        if (!user) return

        try {
            await onConfirm?.(user.id)
            toast.success('Usuário inativado com sucesso!')
            onClose(false)
        } catch {
            toast.error('Não foi possível inativar o usuário.')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent size="sm" className="w-full gap-0 overflow-hidden rounded-[24px]">
                <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
                    <div className="h-14 w-14 rounded-full app-status-danger dark:app-status-danger0/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-7 w-7 text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)]" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-app-text-primary dark:text-white mb-2">Confirmar Inativação</DialogTitle>
                    <DialogDescription className="text-app-text-muted mb-6 max-w-xs mx-auto">
                        Deseja realmente inativar este usuário? O registro continuará no banco, mas o acesso ficará bloqueado até nova ativação.
                    </DialogDescription>

                    <div className="w-full p-4 app-status-danger dark:app-status-danger0/10 border border-transparent dark:border-transparent rounded-xl mb-2">
                        <p className="text-sm font-bold text-[var(--app-danger-text)] dark:text-red-300">
                            Usuário: <span className="font-extrabold">{user?.nome}</span>
                        </p>
                    </div>
                </div>

                <DialogFooter className="px-6 pb-8 pt-2 sm:justify-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onClose(false)}
                        className="h-11 px-8 rounded-lg border-app-border text-app-text-primary hover:bg-app-bg-secondary dark:border-app-border-dark dark:text-white/80 dark:hover:bg-app-card/5 w-full sm:w-auto"
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="h-11 px-8 rounded-lg bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white shadow-sm font-medium w-full sm:w-auto"
                        onClick={handleConfirm}
                    >
                        Inativar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
