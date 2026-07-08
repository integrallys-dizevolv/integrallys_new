'use client'

import { useEffect, useMemo, useState } from 'react'
import { Shield, Settings, Users, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { ModalHeader } from '@/components/shared/modal-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import type { UserRole } from '@/types/auth'
import type { UsuarioModalData } from './excluir-usuario-modal'

interface PermissoesUsuarioModalProps {
    isOpen: boolean
    onClose: (open: boolean) => void
    user: UsuarioModalData | null
}

type RoleOperationPermissions = {
    'agenda.cancel': boolean
    'agenda.extra_fit': boolean
    'finance.discount_by_method': boolean
    'finance.partner_cash': boolean
    'telehealth.online_attendance': boolean
    'users.manage_permissions': boolean
}

const defaultPermissions: RoleOperationPermissions = {
    'agenda.cancel': false,
    'agenda.extra_fit': false,
    'finance.discount_by_method': false,
    'finance.partner_cash': false,
    'telehealth.online_attendance': false,
    'users.manage_permissions': false,
}

export function PermissoesUsuarioModal({ isOpen, onClose, user }: PermissoesUsuarioModalProps) {
    const mapProfileToRole = (perfil?: string): UserRole => {
        const normalized = (perfil || '').toLowerCase()
        if (normalized.includes('admin')) return 'admin'
        if (normalized.includes('gestor')) return 'gestor'
        if (normalized.includes('recep')) return 'recepcao'
        if (normalized.includes('especial')) return 'especialista'
        if (normalized.includes('paciente')) return 'paciente'
        if (normalized.includes('master')) return 'master'
        return 'admin'
    }

    const targetRole = useMemo(() => mapProfileToRole(user?.perfil), [user?.perfil])
    const [permissions, setPermissions] = useState<RoleOperationPermissions>(defaultPermissions)

    useEffect(() => {
        if (!isOpen) return
        setPermissions(defaultPermissions)
    }, [isOpen, targetRole])

    const permissionLabels: Array<{ key: keyof RoleOperationPermissions; label: string }> = [
        { key: 'agenda.cancel', label: 'Cancelar agendamentos' },
        { key: 'agenda.extra_fit', label: 'Encaixe fora do horário padrão' },
        { key: 'finance.discount_by_method', label: 'Configurar desconto por forma de pagamento' },
        { key: 'finance.partner_cash', label: 'Acessar caixa financeiro de parceiros' },
        { key: 'telehealth.online_attendance', label: 'Atendimento online no sistema' },
        { key: 'users.manage_permissions', label: 'Gerenciar permissões de perfis' },
    ]

    const handleSave = () => {
        toast.success(`Permissões do perfil ${user?.perfil || targetRole} atualizadas.`)
        onClose(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent size="lg" className="w-full gap-0 overflow-hidden rounded-[24px]">
                <ModalHeader
                    className="px-6 pt-6 pb-4 shrink-0"
                    title="Alterar permissões"
                    description="Selecione as permissões específicas para este usuário."
                />

                <div className="px-6 py-4 space-y-6 custom-scrollbar">
                    {/* User Banner */}
                    <div className="flex items-center justify-between p-4 bg-app-bg-secondary dark:bg-app-card/5 rounded-xl border border-app-border dark:border-app-border-dark">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-[#E8F5E9] dark:app-status-info flex items-center justify-center text-[var(--app-primary)] dark:text-[#4ADE80]">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-normal text-app-text-primary dark:text-white text-base">{user?.nome}</h4>
                                <p className="text-sm text-app-text-muted dark:text-app-text-muted">Perfil: {user?.perfil}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="h-8 px-3 rounded-lg border-app-border text-app-text-secondary dark:text-white/80 font-normal bg-app-card dark:bg-transparent shield-badge gap-2">
                            <Shield className="h-3.5 w-3.5" />
                            {permissionLabels.length} permissões disponíveis
                        </Badge>
                    </div>

                    {/* Permissions Group */}
                    <div className="border rounded-xl border-app-border dark:border-app-border-dark p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Settings className="h-4.5 w-4.5 text-[var(--app-primary)] dark:text-[#4ADE80]" />
                                <h5 className="font-normal text-app-text-primary dark:text-white">Administrativo</h5>
                            </div>
                            <Badge variant="secondary" className="bg-app-bg-secondary text-app-text-secondary dark:bg-app-card/10 dark:text-white rounded-md">4 permissões</Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {permissionLabels.map((perm) => (
                                <div key={perm.key} className="flex items-center justify-between gap-3 p-3 hover:bg-app-bg-secondary dark:hover:bg-app-hover rounded-lg transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-[var(--app-primary)] dark:text-[#4ADE80] fill-[#E8F5E9] dark:fill-[var(--app-primary)]/40" />
                                        <span className="text-sm font-normal text-app-text-primary dark:text-gray-200 group-hover:text-[var(--app-primary)] dark:group-hover:text-[#4ADE80]">{perm.label}</span>
                                    </div>
                                    <Switch
                                        checked={permissions[perm.key]}
                                        onCheckedChange={(checked) =>
                                            setPermissions((prev) => ({
                                                ...prev,
                                                [perm.key]: checked,
                                            }))
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-6 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onClose(false)}
                        className="h-11 px-6 rounded-lg border-app-border text-app-text-primary hover:bg-app-bg-secondary dark:border-app-border-dark dark:text-white/80 dark:hover:bg-app-card/5"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="h-11 px-8 rounded-lg bg-app-primary hover:bg-app-primary-hover text-white shadow-sm font-normal"
                    >
                        Salvar alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
