'use client'

import { ModalHeader } from '@/components/shared/modal-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { UsuarioModalData } from './excluir-usuario-modal'

interface VisualizarUsuarioModalProps {
    isOpen: boolean
    onClose: (open: boolean) => void
    user: UsuarioModalData | null
}

export function VisualizarUsuarioModal({ isOpen, onClose, user }: VisualizarUsuarioModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent size="lg" className="w-full gap-0 overflow-hidden rounded-[24px]">
                <ModalHeader
                    className="px-6 pt-6 pb-4 shrink-0"
                    title="Visualizar usuário"
                    description="Detalhes completos do usuário selecionado."
                />

                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 custom-scrollbar">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Nome completo</Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80 font-normal">
                            {user?.nome}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">E-mail</Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80 font-normal">
                            {user?.email}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Perfil</Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80 font-normal">
                            {user?.perfil}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Unidade</Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80 font-normal">
                            {user?.unidade}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Status</Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm">
                            <Badge className={user?.status === 'Ativo'
                                ? 'bg-app-primary text-white shadow-sm font-normal'
                                : 'bg-[#F2F4F7] text-[#3b414e] border border-[#D0D5DD] dark:bg-app-card-dark dark:text-white/70 dark:border-app-border-dark font-normal'
                            }>
                                {user?.status}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Conselho de classe</Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80 font-normal">
                            {user?.crth || 'N/A'}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">UF do conselho</Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80 font-normal">
                            SP
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-6 pt-4">
                    <Button
                        onClick={() => onClose(false)}
                        className="h-11 px-8 rounded-lg bg-app-primary hover:bg-app-primary-hover text-white font-normal shadow-sm"
                    >
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
