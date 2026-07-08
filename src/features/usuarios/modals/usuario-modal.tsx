'use client'

import { useEffect, useMemo, useState } from 'react'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck, Upload, FileCheck, DollarSign, Users } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { UserRole } from '@/types/auth'
import { useUsuarios } from '@/hooks/use-usuarios'
import type { UsuarioModalData } from './excluir-usuario-modal'

export interface UserManagementUnitOption {
    id: string
    nome: string
}

export interface UserManagementScope {
    allowedRoles: UserRole[]
    unitOptions: UserManagementUnitOption[]
}

export interface SaveUserInput {
    id?: number | string
    nome: string
    email: string
    password?: string
    perfil: string
    unidade: string
    unidadeId?: string
    status: 'Ativo' | 'Inativo'
    crth?: string
    tipoVinculo?: 'Colaborador' | 'Parceiro'
    isVendedor?: boolean
    comissao?: number
    /** UUIDs de especialistas que esta recepcionista pode visualizar na agenda. null = todos. */
    especialistasPermitidos?: string[] | null
    agendaPessoalPermitidos?: string[]
}

interface UsuarioModalProps {
    isOpen: boolean
    onClose: (open: boolean) => void
    user?: UsuarioModalData | null
    mode: 'add' | 'edit'
    scope?: UserManagementScope
    onSave?: (user: SaveUserInput) => Promise<void> | void
}

type TipoVinculo = 'colaborador' | 'parceiro'
type UserWithAllowedProfessionals = UsuarioModalData & {
    especialistasPermitidos?: string[] | null
    agendaPessoalPermitidos?: string[]
}

const resolveTipoVinculo = (value?: string): TipoVinculo =>
    value?.toLowerCase() === 'parceiro' ? 'parceiro' : 'colaborador'

const normalizeStatus = (value?: string): 'Ativo' | 'Inativo' =>
    value === 'Inativo' ? 'Inativo' : 'Ativo'

const capitalize = (value: string) =>
    value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value

const modalSelectTriggerClassName = 'h-11 rounded-xl border-app-border bg-app-card text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:bg-app-card-dark dark:border-app-border-dark dark:text-white'
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

export function UsuarioModal({ isOpen, onClose, user, mode, scope, onSave }: UsuarioModalProps) {
    const isEdit = mode === 'edit'
    const { data: usuarios } = useUsuarios()
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [crth, setCrth] = useState('')
    const [comissao, setComissao] = useState('')
    const [selectedProfile, setSelectedProfile] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo>('colaborador')
    const [isVendedor, setIsVendedor] = useState(false)
    const [selectedUF, setSelectedUF] = useState('')
    const [selectedUnidade, setSelectedUnidade] = useState('')
    const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
    const [recepProfissionais, setRecepProfissionais] = useState<string[]>([])
    const [recepAgendaPessoal, setRecepAgendaPessoal] = useState<string[]>([])

    // Mapeamento de UFs para exibição formatada
    const ufLabels: Record<string, string> = {
        'sp': 'SP - São Paulo',
        'rj': 'RJ - Rio de Janeiro',
        'mg': 'MG - Minas Gerais',
        'rs': 'RS - Rio Grande do Sul'
    }

    const normalizedUser = useMemo(() => user as UserWithAllowedProfessionals | null, [user])

    useEffect(() => {
        if (!isOpen) return

        setNome(user?.nome || '')
        setEmail(user?.email || '')
        setPassword('')
        setSelectedProfile(normalizeRoleValue(user?.perfil))
        setSelectedUnidade(user?.unidadeId || '')
        setCrth(user?.crth ? user.crth.split(' ')[0] : '')
        setTipoVinculo(resolveTipoVinculo(user?.tipoVinculo))
        setIsVendedor(Boolean(user?.isVendedor))
        setComissao(user?.comissao != null ? String(user.comissao) : '')
        setStatus(normalizeStatus(user?.status))
        setRecepProfissionais(normalizedUser?.especialistasPermitidos || [])
        setRecepAgendaPessoal(normalizedUser?.agendaPessoalPermitidos || [])
        setSelectedUF('')
        setSelectedFile(null)
    }, [isOpen, mode, normalizedUser, user])
    const professionalOptions = useMemo(
        () =>
            usuarios
                .filter(
                    (item) =>
                        (item.perfil ?? '').toLowerCase() === 'especialista' &&
                        item.status !== 'Inativo',
                )
                .map((item) => ({ id: item.id, nome: item.nome }))
                .sort((a, b) => a.nome.localeCompare(b.nome)),
        [usuarios],
    )

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleSave = async () => {
        const nomeSanitized = nome.trim()
        const emailSanitized = email.trim()

        if (!nomeSanitized || !emailSanitized || !selectedProfile || !selectedUnidade) {
            toast.error('Preencha nome, e-mail, perfil e unidade para salvar.')
            return
        }

        if (!isEdit && password.trim().length < 6) {
            toast.error('Defina uma senha com pelo menos 6 caracteres.')
            return
        }

        const selectedUnit = scope?.unitOptions.find((unit) => unit.id === selectedUnidade)

        if (!selectedUnit) {
            toast.error('Selecione uma unidade válida.')
            return
        }

        const nextUser: SaveUserInput = {
            id: user?.id,
            nome: nomeSanitized,
            email: emailSanitized,
            password: isEdit ? undefined : password,
            perfil: selectedProfile,
            unidade: selectedUnit.nome,
            unidadeId: selectedUnit.id,
            status,
            crth: crth.trim() || undefined,
            tipoVinculo: selectedProfile === 'especialista' ? (capitalize(tipoVinculo) as 'Colaborador' | 'Parceiro') : undefined,
            isVendedor: selectedProfile === 'especialista' ? isVendedor : undefined,
            comissao: selectedProfile === 'especialista' && isVendedor && comissao !== '' ? Number(comissao) : undefined,
            especialistasPermitidos:
                selectedProfile === 'recepcao'
                    ? recepProfissionais.length > 0
                        ? recepProfissionais
                        : null
                    : undefined,
            agendaPessoalPermitidos: selectedProfile === 'recepcao' ? recepAgendaPessoal : undefined,
        }

        try {
            await onSave?.(nextUser)
            toast.success(isEdit ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!')
            onClose(false)
        } catch {
            toast.error('Não foi possível salvar o usuário.')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full gap-0 overflow-hidden rounded-[24px]">
                <ModalHeader
                    className="px-6 pt-6 pb-4 shrink-0"
                    title={isEdit ? 'Editar usuário' : 'Novo usuário'}
                    description={
                        isEdit
                            ? 'Atualize as informações do usuário no sistema.'
                            : 'Preencha os dados abaixo para cadastrar um novo usuário no sistema.'
                    }
                />

                <div className="px-6 py-4 space-y-4 custom-scrollbar">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Nome completo</Label>
                        <Input
                            placeholder="Digite o nome completo"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">E-mail</Label>
                        <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {!isEdit && (
                        <div className="space-y-1.5">
                            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Senha inicial</Label>
                            <Input
                                type="password"
                                placeholder="Defina a senha inicial"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Perfil</Label>
                        <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                            <SelectTrigger className={modalSelectTriggerClassName}>
                                <SelectValue placeholder="Selecione o perfil">
                                    {selectedProfile ? capitalize(selectedProfile) : 'Selecione o perfil'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-app-border shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                                {(scope?.allowedRoles ?? []).map((role) => (
                                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Unidade vinculada</Label>
                        <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
                            <SelectTrigger className={modalSelectTriggerClassName}>
                                <SelectValue placeholder="Selecione a unidade">
                                    {scope?.unitOptions.find((unit) => unit.id === selectedUnidade)?.nome || 'Selecione a unidade'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-app-border shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                                {(scope?.unitOptions ?? []).map((unit) => (
                                    <SelectItem key={unit.id} value={unit.id}>{unit.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Status</Label>
                        <Select value={status} onValueChange={(value: 'Ativo' | 'Inativo') => setStatus(value)}>
                            <SelectTrigger className={modalSelectTriggerClassName}>
                                <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-app-border shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="Inativo">Inativo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">Conselho de classe (se aplicável)</Label>
                        <Input
                            placeholder="Ex: CRM, CRO, CREFITO, CRTH, CRP"
                            value={crth}
                            onChange={(e) => setCrth(e.target.value)}
                        />
                        <p className="text-xs text-app-text-muted mt-1">
                            Obrigatório para profissionais da saúde (CRM, CRO, CREFITO, CRTH, CRP, etc)
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">UF do conselho (se aplicável)</Label>
                        <Select value={selectedUF} onValueChange={setSelectedUF}>
                            <SelectTrigger className={modalSelectTriggerClassName}>
                                <SelectValue placeholder="Selecione o estado">
                                    {selectedUF ? ufLabels[selectedUF] || selectedUF.toUpperCase() : 'Selecione o estado'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-app-border shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                                <SelectItem value="sp">SP - São Paulo</SelectItem>
                                <SelectItem value="rj">RJ - Rio de Janeiro</SelectItem>
                                <SelectItem value="mg">MG - Minas Gerais</SelectItem>
                                <SelectItem value="rs">RS - Rio Grande do Sul</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>


                {selectedProfile === 'recepcao' && (
                    <div className="px-6 py-4 border-t border-app-border dark:border-app-border-dark space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="app-status-info p-2 rounded-lg">
                                <Users className="h-5 w-5 text-[var(--app-primary)]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-normal text-app-text-primary dark:text-white">Profissionais permitidos</h4>
                                <p className="text-xs text-app-text-muted">Selecione quais especialistas essa recepcionista pode atender.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {professionalOptions.length === 0 && (
                                <p className="col-span-2 text-xs text-app-text-muted">
                                    Nenhum especialista cadastrado.
                                </p>
                            )}
                            {professionalOptions.map((prof) => {
                                const active = recepProfissionais.includes(prof.id)
                                return (
                                    <button
                                        key={prof.id}
                                        type="button"
                                        onClick={() => {
                                            setRecepProfissionais((prev) =>
                                                prev.includes(prof.id)
                                                    ? prev.filter((p) => p !== prof.id)
                                                    : [...prev, prof.id]
                                            )
                                        }}
                                        className={`px-3 py-2 rounded-lg text-xs font-normal border transition-all ${
                                            active
                                                ? 'border-[var(--app-primary)] text-[var(--app-primary)] app-status-info'
                                                : 'border-app-border text-app-text-secondary hover:border-[var(--app-primary)]/40 hover:text-[var(--app-primary)]'
                                        }`}
                                    >
                                        {prof.nome}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-xs text-app-text-muted">
                            Se nenhum profissional for selecionado, a recepcionista visualizará todos.
                        </p>

                        <div className="pt-4 border-t border-app-border dark:border-app-border-dark space-y-3">
                            <h4 className="text-sm font-normal text-app-text-primary dark:text-white">Acesso à Agenda Pessoal</h4>
                            <p className="text-xs text-app-text-muted">Marque os especialistas cuja agenda pessoal pode ser acessada por esta recepcionista.</p>
                            <div className="grid grid-cols-2 gap-2">
                                {professionalOptions.length === 0 && (
                                    <p className="col-span-2 text-xs text-app-text-muted">
                                        Nenhum especialista cadastrado.
                                    </p>
                                )}
                                {professionalOptions.map((prof) => {
                                    const active = recepAgendaPessoal.includes(prof.id)
                                    return (
                                        <button
                                            key={`personal-${prof.id}`}
                                            type="button"
                                            onClick={() => {
                                                setRecepAgendaPessoal((prev) =>
                                                    prev.includes(prof.id)
                                                        ? prev.filter((p) => p !== prof.id)
                                                        : [...prev, prof.id]
                                                )
                                            }}
                                            className={`px-3 py-2 rounded-lg text-xs font-normal border transition-all ${
                                                active
                                                    ? 'border-[var(--app-primary)] text-[var(--app-primary)] app-status-info'
                                                    : 'border-app-border text-app-text-secondary hover:border-[var(--app-primary)]/40 hover:text-[var(--app-primary)]'
                                            }`}
                                        >
                                            {prof.nome}
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="text-xs text-app-text-muted">Se vazio, a agenda pessoal ficará oculta para a recepção.</p>
                        </div>
                    </div>
                )}
                {selectedProfile === 'especialista' && (
                    <div className="px-6 py-4 border-t border-app-border dark:border-app-border-dark space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-normal text-app-text-primary dark:text-white">Tipo de vínculo</Label>
                            <Select
                                value={tipoVinculo}
                                onValueChange={(val) => setTipoVinculo(resolveTipoVinculo(val))}
                            >
                                <SelectTrigger className={modalSelectTriggerClassName}>
                                    <SelectValue placeholder="Selecione o vínculo">
                                        {tipoVinculo === 'colaborador' ? 'Colaborador (Repasse Padrão)' :
                                            tipoVinculo === 'parceiro' ? 'Parceiro (Recibo/PIX Direto)' : 'Selecione o vínculo'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-app-border shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                                    <SelectItem value="colaborador">Colaborador (Repasse Padrão)</SelectItem>
                                    <SelectItem value="parceiro">Parceiro (Recibo/PIX Direto)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-app-text-muted mt-1">
                                {tipoVinculo === 'colaborador'
                                    ? 'Especialista vinculado à clínica com repasse via caixa.'
                                    : 'Especialista parceiro com recebimento direto e repasse de taxa para a clínica.'}
                            </p>
                        </div>
                    </div>
                )}

                {selectedProfile === 'especialista' && (
                    <div className="px-6 py-4 border-t border-app-border dark:border-app-border-dark space-y-4">
                        <div className="flex items-center justify-between p-4 bg-app-bg-secondary dark:bg-app-card/5 rounded-xl border border-app-border dark:border-app-border-dark">
                            <div className="flex items-center gap-3">
                                <div className="app-status-info p-2 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-[var(--app-primary)]" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-normal text-app-text-primary dark:text-white">Habilitar Prescrição/Vendas</h4>
                                    <p className="text-xs text-app-text-muted">Permitir que este usuário receba comissões</p>
                                </div>
                            </div>
                            <Switch checked={isVendedor} onCheckedChange={setIsVendedor} />
                        </div>

                        {isVendedor && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-sm font-normal text-app-text-primary dark:text-white">Percentual de comissão (%)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder="Ex: 10"
                                        value={comissao}
                                        onChange={(e) => setComissao(e.target.value)}
                                        className="h-11 pl-10 rounded-lg border-app-border bg-app-card dark:bg-app-bg-dark dark:border-app-border-dark text-sm"
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted">
                                        <span className="text-sm font-medium">%</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {selectedProfile === 'especialista' && (
                    <div className="px-6 py-4 space-y-4">
                        <div className="pt-4 border-t border-app-border dark:border-app-border-dark animate-in fade-in slide-in-from-top-2">
                            <div className="bg-app-primary/5 dark:app-status-info border border-[var(--app-primary)]/10 dark:border-[var(--app-primary)]/20 rounded-[12px] p-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="app-status-info dark:bg-app-primary/30 p-2 rounded-full shrink-0">
                                        <ShieldCheck className="h-5 w-5 text-[var(--app-primary)] dark:text-[#4da885]" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-normal text-[var(--app-primary)] dark:text-[#white]">Validação jurídica ICP-Brasil</h4>
                                        <p className="text-xs text-[var(--app-primary)]/80 dark:text-[#4da885]/80 leading-relaxed">
                                            Para especialistas, é obrigatório o envio do certificado digital para assinatura de documentos com validade jurídica.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-normal text-app-text-primary dark:text-white">Upload do certificado (.pfx, .cer ou .pdf)</Label>
                                    <div
                                        className={`border-2 border-dashed transition-colors rounded-[12px] p-6 text-center cursor-pointer bg-app-card dark:bg-app-bg-dark relative ${selectedFile ? 'border-[var(--app-primary)] dark:border-[#4da885]' : 'border-app-border dark:border-app-border-dark hover:border-[var(--app-primary)]/50 dark:hover:border-[var(--app-primary)]'}`}
                                    >
                                        <input
                                            type="file"
                                            accept=".pfx,.cer,.pdf"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${selectedFile ? 'app-status-info dark:bg-app-primary/30' : 'bg-app-bg-secondary dark:bg-app-bg-dark'}`}>
                                                {selectedFile ? (
                                                    <FileCheck className="h-5 w-5 text-[var(--app-primary)] dark:text-[#4da885]" />
                                                ) : (
                                                    <Upload className="h-5 w-5 text-app-text-muted dark:text-white/80" />
                                                )}
                                            </div>
                                            <div className="text-sm">
                                                {selectedFile ? (
                                                    <span className="font-semibold text-[var(--app-primary)] dark:text-[#4da885] break-all">{selectedFile.name}</span>
                                                ) : (
                                                    <>
                                                        <span className="font-semibold text-[var(--app-primary)] dark:text-[#4da885]">Clique para enviar</span>
                                                        <span className="text-app-text-muted dark:text-app-text-muted"> ou arraste o arquivo aqui</span>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-xs text-app-text-muted">Suporta certificados e-CPF A1, A3 ou PDF assinado</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="px-6 py-6 pt-2 shrink-0">
                    <Button
                        variant="outline"
                        onClick={() => onClose(false)}
                        className="h-11 px-6 rounded-lg border-app-border text-app-text-primary hover:bg-app-bg-secondary dark:border-app-border-dark dark:text-white/80 dark:hover:bg-app-card/5"
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="h-11 px-8 rounded-lg bg-app-primary hover:bg-app-primary-hover text-white shadow-sm font-normal"
                        onClick={handleSave}
                    >
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
