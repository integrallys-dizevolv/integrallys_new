'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ModalHeader } from '@/components/shared/modal-header'
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { UserRole } from '@/types/auth'
import type { UserManagementUnitOption } from './usuario-modal'

const ROLE_LABELS: Record<UserRole, string> = {
    master: 'Master',
    admin: 'Administrador',
    gestor: 'Gestor',
    recepcao: 'Recepção',
    especialista: 'Especialista',
    paciente: 'Paciente',
}

const normalizeRoleValue = (value?: string | null): UserRole | '' => {
    const normalized = value?.trim().toLowerCase()

    if (!normalized) return ''
    if (normalized === 'administrador') return 'admin'
    if (normalized === 'recepção' || normalized === 'recepcionista') return 'recepcao'
    if (normalized === 'master' || normalized === 'admin' || normalized === 'gestor' || normalized === 'recepcao' || normalized === 'especialista' || normalized === 'paciente') {
        return normalized
    }

    return ''
}

interface NovoUsuarioModalProps {
    isOpen: boolean
    onClose: () => void
    mode?: 'create' | 'edit'
    unitOptions: UserManagementUnitOption[]
    allowedRoles: UserRole[]
    lockUnitSelection?: boolean
    onSave?: (payload: {
        nome: string
        email: string
        password?: string
        perfil: string
        unidade: string
        unidadeId?: string
        status: 'Ativo' | 'Inativo'
        crth?: string
        tipoVinculo?: 'interno' | 'parceiro'
    }) => Promise<void> | void
    initialUser?: {
        nome: string
        email: string
        perfil: string
        unidade: string
        unidadeId?: string
        status?: 'Ativo' | 'Inativo'
        crth?: string
        tipoVinculo?: 'interno' | 'parceiro'
    } | null
}

export const NovoUsuarioModal = ({ isOpen, onClose, mode = 'create', initialUser = null, unitOptions, allowedRoles, lockUnitSelection = false, onSave }: NovoUsuarioModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: '',
        unitId: '',
        status: 'Ativo' as 'Ativo' | 'Inativo',
        conselho: '',
        uf: '',
        tipoVinculo: 'interno' as 'interno' | 'parceiro',
    })

    useEffect(() => {
        const fallbackUnitId = unitOptions[0]?.id ?? ''
        const matchedUnit = initialUser?.unidadeId
            ? unitOptions.find((option) => option.id === initialUser.unidadeId)
            : unitOptions.find((option) => option.nome === initialUser?.unidade)

        setFormData({
            name: initialUser?.nome || '',
            email: initialUser?.email || '',
            password: '',
            role: normalizeRoleValue(initialUser?.perfil),
            unitId: matchedUnit?.id ?? fallbackUnitId,
            status: initialUser?.status ?? 'Ativo',
            conselho: initialUser?.crth || '',
            uf: '',
            tipoVinculo: initialUser?.tipoVinculo ?? 'interno',
        })
    }, [initialUser, isOpen, unitOptions])

    const handleSubmit = async () => {
        if (!formData.name || !formData.email || !formData.role || !formData.unitId) {
            toast.error('Preencha nome, e-mail, perfil e unidade.')
            return
        }

        if (mode === 'create' && formData.password.trim().length < 6) {
            toast.error('Defina uma senha com pelo menos 6 caracteres.')
            return
        }

        const selectedUnit = unitOptions.find((option) => option.id === formData.unitId)

        if (!selectedUnit) {
            toast.error('Selecione uma unidade válida.')
            return
        }

        await onSave?.({
            nome: formData.name,
            email: formData.email,
            password: mode === 'create' ? formData.password : undefined,
            perfil: formData.role,
            unidade: selectedUnit.nome,
            unidadeId: selectedUnit.id,
            status: formData.status,
            crth: formData.conselho || undefined,
            tipoVinculo: formData.role === 'especialista' ? formData.tipoVinculo : undefined,
        })
        toast.success(mode === 'edit' ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso.')
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full gap-0 overflow-hidden rounded-[24px]">
                <ModalHeader
                    className="px-6 pt-6 pb-4 shrink-0"
                    title={mode === 'edit' ? 'Editar Usuário' : 'Novo Usuário'}
                    description={
                        mode === 'edit'
                            ? 'Atualize os dados do usuário selecionado.'
                            : 'Preencha os dados abaixo para cadastrar um novo usuário no sistema.'
                    }
                />

                <div className="px-6 py-4 space-y-4 custom-scrollbar">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">Nome Completo</Label>
                        <Input
                            placeholder="Digite o nome completo"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">E-mail</Label>
                        <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        />
                    </div>

                    {mode === 'create' && (
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">Senha inicial</Label>
                            <Input
                                type="password"
                                placeholder="Defina a senha inicial"
                                value={formData.password}
                                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">Perfil</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o perfil" />
                            </SelectTrigger>
                            <SelectContent>
                                {allowedRoles.map((role) => (
                                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">Unidade Vinculada</Label>
                        <Select value={formData.unitId} onValueChange={(value) => setFormData((prev) => ({ ...prev, unitId: value }))} disabled={lockUnitSelection && unitOptions.length === 1}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a unidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {unitOptions.map((unit) => (
                                    <SelectItem key={unit.id} value={unit.id}>{unit.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">Status</Label>
                        <Select value={formData.status} onValueChange={(value: 'Ativo' | 'Inativo') => setFormData((prev) => ({ ...prev, status: value }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="Inativo">Inativo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.role === 'especialista' && (
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">Tipo de Vínculo</Label>
                            <Select
                                value={formData.tipoVinculo}
                                onValueChange={(value: 'interno' | 'parceiro') =>
                                    setFormData((prev) => ({ ...prev, tipoVinculo: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="interno">Interno (clínica paga repasse)</SelectItem>
                                    <SelectItem value="parceiro">Parceiro (% sobre valor bruto)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-app-text-muted mt-1">
                                Parceiro: % aplicado sobre o valor bruto do procedimento, sem dedução de custos da clínica.
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">Conselho de Classe (se aplicável)</Label>
                        <Input
                            placeholder="Ex: CRM, CRO, CREFITO, CRTH, CRP"
                            value={formData.conselho}
                            onChange={(e) => setFormData((prev) => ({ ...prev, conselho: e.target.value }))}
                        />
                        <p className="text-xs text-app-text-muted mt-1">
                            Obrigatório para profissionais da saúde (CRM, CRO, CREFITO, CRTH, CRP, etc)
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">UF do Conselho (se aplicável)</Label>
                        <Select value={formData.uf} onValueChange={(value) => setFormData((prev) => ({ ...prev, uf: value }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sp">SP - São Paulo</SelectItem>
                                <SelectItem value="rj">RJ - Rio de Janeiro</SelectItem>
                                <SelectItem value="mg">MG - Minas Gerais</SelectItem>
                                <SelectItem value="rs">RS - Rio Grande do Sul</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="px-6 py-6 shrink-0 gap-3 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="h-11 px-6 rounded-lg border-app-border text-app-text-primary hover:bg-app-bg-secondary dark:border-app-border-dark dark:text-white/80 dark:hover:bg-app-card/5"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="h-11 px-8 rounded-lg bg-app-primary hover:bg-app-primary-hover text-white shadow-sm font-medium"
                    >
                        {mode === 'edit' ? 'Salvar alterações' : 'Salvar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
