'use client'

import { ModalHeader } from '@/components/shared/modal-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { PerfilPermissaoModal } from './excluir-perfil-modal'

interface VisualizarPerfilModalProps {
    isOpen: boolean
    onClose: (open: boolean) => void
    profile: PerfilPermissaoModal | null
}

const getProfileName = (profile: PerfilPermissaoModal | null) =>
    profile?.perfil || profile?.nome || ''

const getProfileScope = (profile: PerfilPermissaoModal | null) => {
    if (!profile) return '0 usuários ativos'
    if (profile.escopo) return profile.escopo
    const usuarios = profile.usuarios ?? profile.especialistas ?? 0
    return `${usuarios} usuários ativos`
}

export function VisualizarPerfilModal({ isOpen, onClose, profile }: VisualizarPerfilModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent size="lg" className="w-[95%] sm:w-full gap-0 overflow-hidden rounded-[24px] dark:bg-app-bg-dark dark:border-app-border-dark">
                <ModalHeader
                    className="px-6 pt-6 pb-4 shrink-0"
                    title="Visualizar perfil de acesso"
                    description="Detalhes das permissões e atribuições deste perfil."
                />

                <div className="px-6 py-4 space-y-4 custom-scrollbar">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Nome do perfil</Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80 font-normal">
                            {getProfileName(profile)}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Descrição</Label>
                        <div className="min-h-[80px] p-3 rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80 font-normal">
                            {profile?.descricao}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                            {profile?.escopo ? 'Escopo / atribuição' : 'Usuários vinculados'}
                        </Label>
                        <div className="h-11 px-3 flex items-center rounded-lg border border-app-border bg-app-bg-secondary dark:bg-app-card/5 dark:border-app-border-dark text-sm text-app-text-primary dark:text-white/80">
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-app-text-primary dark:text-white border-none font-normal">
                                {getProfileScope(profile)}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Permissões habilitadas</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                                'Visualizar pacientes',
                                'Gerenciar agenda',
                                'Emitir relatórios',
                                'Acesso ao prontuário'
                            ].map((perm) => (
                                <div key={perm} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-app-bg-secondary dark:bg-app-card/5 border border-app-border dark:border-app-border-dark">
                                    <div className="w-2 h-2 rounded-full app-status-success0" />
                                    <span className="text-sm text-app-text-primary dark:text-white font-normal">{perm}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-6 pt-4 shrink-0">
                    <Button
                        onClick={() => onClose(false)}
                        className="h-11 px-8 rounded-lg bg-app-primary hover:bg-app-primary-hover text-white shadow-sm font-normal"
                    >
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
