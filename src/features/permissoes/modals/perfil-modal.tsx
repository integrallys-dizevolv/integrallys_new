'use client'

import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PerfilPermissaoModal } from './excluir-perfil-modal'

interface PerfilModalProps {
    isOpen: boolean
    onClose: (open: boolean) => void
    profile: PerfilPermissaoModal | null
    mode: 'add' | 'edit'
}

export function PerfilModal({ isOpen, onClose, profile, mode }: PerfilModalProps) {
    const isEdit = mode === 'edit'

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95%] sm:w-full gap-0 h-auto flex flex-col p-0 rounded-[24px] dark:bg-app-bg-dark dark:border-app-border-dark">
                <ModalHeader
                    className="px-6 pt-6 pb-4 shrink-0"
                    title={isEdit ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}
                    description={
                        isEdit
                            ? 'Atualize as permissões e informações deste perfil de acesso.'
                            : 'Crie um novo perfil de acesso definindo suas permissões e responsabilidades.'
                    }
                />

                <div className="px-6 py-2 pb-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-app-text-primary dark:text-white">Nome do Perfil</Label>
                        <Input
                            placeholder="Ex: Enfermeiro"
                            defaultValue={profile?.perfil || profile?.nome || ''}
                            className="h-11 rounded-lg border-app-border bg-app-card dark:bg-app-bg-dark dark:border-app-border-dark text-sm placeholder:text-app-text-muted"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-app-text-primary dark:text-white">Descrição</Label>
                        <Textarea
                            placeholder="Descreva as responsabilidades deste perfil"
                            defaultValue={profile?.descricao || ''}
                            className="min-h-[80px] p-2.5 rounded-lg border-app-border bg-app-card dark:bg-app-bg-dark dark:border-app-border-dark text-sm placeholder:text-app-text-muted focus-visible:ring-0 resize-none"
                        />
                    </div>

                    <div className="space-y-3 pt-1">
                        <Label className="text-sm font-semibold text-app-text-primary dark:text-white">Permissões</Label>
                        <div className="space-y-3">
                            {[
                                'Visualizar Pacientes',
                                'Editar Prontuários',
                                'Agendar Consultas',
                                'Visualizar Agenda Simultânea',
                                'Gerar Relatórios'
                            ].map((perm) => (
                                <label
                                    key={perm}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-app-border dark:border-app-border-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover cursor-pointer transition-colors group"
                                >
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            defaultChecked={isEdit && perm.length % 2 === 0}
                                            className="peer sr-only"
                                        />
                                        <div className="h-5 w-5 rounded-md border-2 border-app-border dark:border-white/20 bg-app-card dark:bg-app-card/5 peer-checked:bg-[var(--app-success-text)] peer-checked:border-emerald-600 dark:peer-checked:app-status-success0 dark:peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                                            <svg
                                                className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={3}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <svg
                                            className="absolute inset-0 h-5 w-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={3}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-app-text-primary dark:text-white/80">
                                        {perm}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-6 pt-4 shrink-0">
                    <Button
                        variant="outline"
                        onClick={() => onClose(false)}
                        className="h-11 px-6 rounded-lg border-app-border text-app-text-primary hover:bg-app-bg-secondary dark:border-app-border-dark dark:text-white/80 dark:hover:bg-app-card/5"
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="h-11 px-6 rounded-lg bg-app-primary hover:bg-app-primary-hover text-white shadow-sm font-medium"
                    >
                        {isEdit ? 'Salvar Alterações' : 'Criar Perfil'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
