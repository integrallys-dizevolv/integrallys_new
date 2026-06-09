'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarCheck, Edit, Eye, MoreVertical, Plus, Search, Shield, Trash2, Users, ArrowLeft } from 'lucide-react'
import { usePermissoes, type PermissaoItem } from '@/hooks/use-permissoes'
import { useUsuarios, type UsuarioItem } from '@/hooks/use-usuarios'
import { useUnidades } from '@/hooks/use-unidades'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type PermissionFormState = {
  perfil: string
  unidadeId: string
  permissions: Record<string, string[]>
}

type PerfilResumo = {
  id: string
  perfil: string
  unidadeId?: string
  unidadeNome?: string
  descricao: string
  escopo: string
  recursos: string[]
  acoes: string[]
  itens: PermissaoItem[]
}

type GerenciarTab = 'usuarios' | 'unidades' | 'perfis'

const PROFILE_LABELS: Record<string, string> = {
  master: 'Master',
  admin: 'Administrador',
  gestor: 'Gestor',
  recepcao: 'Recepção',
  especialista: 'Especialista',
  paciente: 'Paciente',
}

const RESOURCE_LABELS: Record<string, string> = {
  agenda: 'Agenda',
  auditoria: 'Auditoria',
  caixa: 'Caixa',
  configuracoes: 'Configurações',
  dashboard: 'Dashboard',
  documentacao: 'Documentação',
  estoque: 'Estoque',
  evolucoes: 'Evoluções',
  financeiro: 'Financeiro',
  lista_espera: 'Lista de espera',
  pacientes: 'Pacientes',
  permissoes: 'Permissões',
  portal: 'Portal',
  prescricoes: 'Prescrições',
  prontuarios: 'Prontuários',
  relatorios: 'Relatórios',
  repasse: 'Repasse',
  tarefas: 'Tarefas',
  unidades: 'Unidades',
  usuarios: 'Usuários',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Criar',
  read: 'Visualizar',
  update: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
  approve: 'Aprovar',
  manage: 'Gerenciar',
}

const GERENCIAR_NAV_ITEMS: { value: GerenciarTab; label: string }[] = [
  { value: 'usuarios', label: 'Usuários' },
  { value: 'unidades', label: 'Unidades' },
  { value: 'perfis', label: 'Perfis' },
]

const GERENCIAR_PROFILE_OPTIONS = [
  { value: 'todos', label: 'Todos os perfis' },
  { value: 'master', label: 'Master' },
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'recepcao', label: 'Recepção' },
  { value: 'especialista', label: 'Especialista' },
  { value: 'paciente', label: 'Paciente' },
]

const GERENCIAR_MODULE_OPTIONS = [
  { value: 'todos', label: 'Todos os módulos' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'clinico', label: 'Clínico' },
  { value: 'financeiro', label: 'Financeiro' },
]

const ACTION_OPTIONS = ['create', 'read', 'update', 'delete', 'export', 'approve', 'manage']

const INITIAL_PERMISSION_FORM: PermissionFormState = {
  perfil: '',
  unidadeId: 'global',
  permissions: {},
}

function formatPerfil(perfil: string) {
  return PROFILE_LABELS[perfil.toLowerCase()] ?? perfil
}

function formatEscopo(recursos: string[]) {
  if (recursos.length >= 8) return 'Global'
  if (recursos.some((item) => ['financeiro', 'repasse', 'relatorios'].includes(item))) return 'Administrativo'
  if (recursos.some((item) => ['agenda', 'pacientes', 'lista_espera', 'caixa', 'estoque'].includes(item))) return 'Operacional'
  if (recursos.some((item) => ['documentacao', 'evolucoes', 'prontuarios', 'prescricoes'].includes(item))) return 'Clínico'
  return 'Personalizado'
}

function formatDescricao(recursos: string[], acoes: string[]) {
  const recursosLabel = recursos.slice(0, 3).map((item) => RESOURCE_LABELS[item] ?? item)
  const acoesLabel = acoes.slice(0, 2).map((item) => ACTION_LABELS[item] ?? item.toLowerCase())

  if (recursosLabel.length === 0) {
    return 'Perfil sem permissões vinculadas.'
  }

  return `Acesso a ${recursosLabel.join(', ')}${recursos.length > 3 ? ' e outros módulos' : ''} com ações como ${acoesLabel.join(' e ')}.`
}

function buildPermissionForm(item: PerfilResumo | null): PermissionFormState {
  if (!item) return INITIAL_PERMISSION_FORM

  return {
    perfil: item.itens[0]?.perfil ?? '',
    unidadeId: item.unidadeId ?? 'global',
    permissions: item.itens.reduce<Record<string, string[]>>((acc, current) => {
      acc[current.recurso] = [...current.acoes]
      return acc
    }, {}),
  }
}

export function PermissoesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, resources, units, isLoading, error, createPermissao, updatePermissao, deletePermissao } = usePermissoes()
  const { data: usuarios, isLoading: isLoadingUsuarios, error: usuariosError, updateUsuario, load: reloadUsuarios } = useUsuarios()
  const { data: unidades, isLoading: isLoadingUnidades, error: unidadesError } = useUnidades()
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedPermission, setSelectedPermission] = useState<PerfilResumo | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<'create' | 'edit'>('create')
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [gerenciarTab, setGerenciarTab] = useState<GerenciarTab>('usuarios')
  const [profileFilter, setProfileFilter] = useState('todos')
  const [moduleFilter, setModuleFilter] = useState('todos')
  const [permissionForm, setPermissionForm] = useState<PermissionFormState>(INITIAL_PERMISSION_FORM)
  const [isSubmittingPermission, setIsSubmittingPermission] = useState(false)
  const [agendaUsuario, setAgendaUsuario] = useState<UsuarioItem | null>(null)
  const [agendaSelectedIds, setAgendaSelectedIds] = useState<string[]>([])
  const [isAgendaSaving, setIsAgendaSaving] = useState(false)

  const currentView = searchParams?.get('view')
  const isGerenciarView = currentView === 'gerenciar'

  useEffect(() => {
    if (!isGerenciarView) {
      setGerenciarTab('usuarios')
    }
  }, [isGerenciarView])

  useEffect(() => {
    setSearchFilter('')
    setProfileFilter('todos')
    setModuleFilter('todos')
  }, [gerenciarTab])

  const groupedPermissions = useMemo<PerfilResumo[]>(() => {
    const grouped = data.reduce<Record<string, PerfilResumo>>((acc, item) => {
      const perfilKey = item.perfil.toLowerCase()
      const groupKey = `${perfilKey}:${item.unidadeId ?? 'global'}`

      if (!acc[groupKey]) {
        acc[groupKey] = {
          id: groupKey,
          perfil: formatPerfil(item.perfil),
          unidadeId: item.unidadeId,
          unidadeNome: item.unidadeNome,
          descricao: '',
          escopo: '',
          recursos: [],
          acoes: [],
          itens: [],
        }
      }

      const current = acc[groupKey]
      current.itens.push(item)

      if (!current.recursos.includes(item.recurso)) {
        current.recursos.push(item.recurso)
      }

      item.acoes.forEach((acao) => {
        if (!current.acoes.includes(acao)) {
          current.acoes.push(acao)
        }
      })

      return acc
    }, {})

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        recursos: [...item.recursos].sort((a, b) => a.localeCompare(b)),
        acoes: [...item.acoes].sort((a, b) => a.localeCompare(b)),
      }))
      .map((item) => ({
        ...item,
        escopo: formatEscopo(item.recursos),
        descricao: `${item.unidadeNome ? `${item.unidadeNome} · ` : 'Global · '}${formatDescricao(item.recursos, item.acoes)}`,
      }))
      .sort((a, b) => a.perfil.localeCompare(b.perfil))
  }, [data])

  const filteredPermissions = useMemo(() => {
    return groupedPermissions.filter((item) => {
      const term = searchFilter.toLowerCase()
      return (
        searchFilter === '' ||
        item.perfil.toLowerCase().includes(term) ||
        (item.unidadeNome ?? 'global').toLowerCase().includes(term) ||
        item.descricao.toLowerCase().includes(term) ||
        item.escopo.toLowerCase().includes(term) ||
        item.recursos.some((recurso) => (RESOURCE_LABELS[recurso] ?? recurso).toLowerCase().includes(term)) ||
        item.perfil.toLowerCase().includes(term) ||
        item.acoes.some((acao) => (ACTION_LABELS[acao] ?? acao).toLowerCase().includes(term))
      )
    })
  }, [groupedPermissions, searchFilter])

  const availableResources = useMemo(() => {
    return resources
      .map((item) => ({
        codigo: item.codigo,
        descricao: item.descricao,
        label: RESOURCE_LABELS[item.codigo] ?? item.descricao ?? item.codigo,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [resources])

  const clearFilters = () => {
    setSearchFilter('')
    setProfileFilter('todos')
    setModuleFilter('todos')
  }

  const toggleAction = (resourceCode: string, action: string) => {
    setPermissionForm((current) => {
      const currentActions = current.permissions[resourceCode] ?? []
      const nextActions = currentActions.includes(action)
        ? currentActions.filter((item) => item !== action)
        : [...currentActions, action]

      const nextPermissions = { ...current.permissions }
      if (nextActions.length === 0) {
        delete nextPermissions[resourceCode]
      } else {
        nextPermissions[resourceCode] = nextActions.sort((a, b) => a.localeCompare(b))
      }

      return {
        ...current,
        permissions: nextPermissions,
      }
    })
  }

  const handleOpenCreate = () => {
    setSelectedPermission(null)
    setCreateMode('create')
    setPermissionForm(INITIAL_PERMISSION_FORM)
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (item: PerfilResumo) => {
    setSelectedPermission(item)
    setCreateMode('edit')
    setPermissionForm(buildPermissionForm(item))
    setIsCreateOpen(true)
  }

  const handleSavePermission = async () => {
    const perfil = permissionForm.perfil.trim().toLowerCase()
    const unidadeId = permissionForm.unidadeId === 'global' ? null : permissionForm.unidadeId
    const permissions = Object.entries(permissionForm.permissions)
      .map(([recurso, acoes]) => ({ recurso, acoes }))
      .filter((item) => item.acoes.length > 0)

    if (!perfil) {
      toast.error('Selecione um perfil para salvar.')
      return
    }

    if (permissions.length === 0) {
      toast.error('Selecione ao menos um recurso com ações.')
      return
    }

    setIsSubmittingPermission(true)
    try {
      if (createMode === 'edit') {
        await updatePermissao({ perfil, unidadeId, permissions })
        toast.success('Permissões atualizadas com sucesso.')
      } else {
        await createPermissao({ perfil, unidadeId, permissions })
        toast.success('Perfil criado com sucesso.')
      }
      setIsCreateOpen(false)
      setSelectedPermission(null)
      setPermissionForm(INITIAL_PERMISSION_FORM)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar as permissões.')
    } finally {
      setIsSubmittingPermission(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedPermission) return

    setIsSubmittingPermission(true)
    try {
      await deletePermissao(selectedPermission.itens[0]?.perfil ?? '', selectedPermission.unidadeId)
      toast.success('Perfil removido com sucesso.')
      setIsDeleteOpen(false)
      setSelectedPermission(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir o perfil.')
    } finally {
      setIsSubmittingPermission(false)
    }
  }

  const especialistaOptions = useMemo(() => {
    return usuarios
      .filter((item) => (item.perfil ?? '').toLowerCase() === 'especialista' && item.status !== 'Inativo')
      .map((item) => ({ id: item.id, nome: item.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [usuarios])

  const handleOpenAgenda = (usuario: UsuarioItem) => {
    setAgendaUsuario(usuario)
    setAgendaSelectedIds(usuario.especialistasPermitidos ?? [])
  }

  const handleToggleAgendaEspecialista = (id: string) => {
    setAgendaSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleSalvarAgenda = async () => {
    if (!agendaUsuario) return
    setIsAgendaSaving(true)
    try {
      await updateUsuario({
        id: agendaUsuario.id,
        nome: agendaUsuario.nome,
        email: agendaUsuario.email,
        perfil: agendaUsuario.perfil ?? 'recepcao',
        status: agendaUsuario.status,
        tipoVinculo: agendaUsuario.tipoVinculo,
        especialistasPermitidos: agendaSelectedIds.length > 0 ? agendaSelectedIds : null,
      })
      toast.success('Configuração de agenda salva.')
      setAgendaUsuario(null)
      setAgendaSelectedIds([])
      await reloadUsuarios()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a configuração.')
    } finally {
      setIsAgendaSaving(false)
    }
  }

  const openGerenciarView = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('view', 'gerenciar')
    router.push(`/permissoes?${params.toString()}`)
  }

  const openListaView = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('view')
    const next = params.toString()
    router.push(next ? `/permissoes?${next}` : '/permissoes')
  }

  const filteredUsuarios = useMemo(() => {
    const term = searchFilter.toLowerCase()
    return usuarios.filter((item) => {
      const profileMatch =
        profileFilter === 'todos' || (item.perfil ?? '').toLowerCase() === profileFilter

      if (!term) return profileMatch
      const searchMatch = (
        item.nome.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        (item.perfil ?? '').toLowerCase().includes(term)
      )
      return searchMatch && profileMatch
    })
  }, [usuarios, searchFilter, profileFilter])

  const filteredUnidades = useMemo(() => {
    const term = searchFilter.toLowerCase()
    return unidades.filter((item) => {
      if (!term) return true
      return (
        item.nome.toLowerCase().includes(term) ||
        (item.cnpj ?? '').toLowerCase().includes(term) ||
        (item.cidade ?? '').toLowerCase().includes(term)
      )
    })
  }, [unidades, searchFilter])

  const perfilSummary = useMemo(() => {
    return groupedPermissions.map((item) => ({
      id: item.id,
      perfil: item.perfil,
      unidadeNome: item.unidadeNome ?? 'Global',
      escopo: item.escopo,
      recursos: item.recursos.length,
      acoes: item.acoes.length,
      descricao: item.descricao,
    }))
  }, [groupedPermissions])

  const filteredPerfilSummary = useMemo(() => {
    return perfilSummary.filter((item) => {
      const term = searchFilter.toLowerCase()
      const moduleMatch =
        moduleFilter === 'todos' ||
        (moduleFilter === 'operacional' && item.escopo === 'Operacional') ||
        (moduleFilter === 'administrativo' && item.escopo === 'Administrativo') ||
        (moduleFilter === 'clinico' && item.escopo === 'Clínico') ||
        (moduleFilter === 'financeiro' && item.escopo === 'Global')

        const searchMatch =
          !term ||
          item.perfil.toLowerCase().includes(term) ||
          item.unidadeNome.toLowerCase().includes(term) ||
          item.descricao.toLowerCase().includes(term) ||
          item.escopo.toLowerCase().includes(term)

      return moduleMatch && searchMatch
    })
  }, [perfilSummary, searchFilter, moduleFilter])

  const renderGerenciarContent = () => {
    if (gerenciarTab === 'usuarios') {
      return (
        <Card className="overflow-hidden rounded-2xl border-app-border/60 shadow-sm dark:border-app-border-dark">
          <CardContent className="p-0">
            {isLoadingUsuarios ? (
              <div className="py-12 text-center text-app-text-muted">Carregando usuários...</div>
            ) : filteredUsuarios.length === 0 ? (
              <div className="py-12 text-center text-app-text-muted">Nenhum usuário encontrado.</div>
            ) : (
              <DataTable data={filteredUsuarios}>
                {(pageData) => (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-hover">
                        <TableRow>
                          <TableHead className="min-w-[220px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Nome</TableHead>
                          <TableHead className="min-w-[260px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">E-mail</TableHead>
                          <TableHead className="min-w-[140px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Perfil</TableHead>
                          <TableHead className="min-w-[120px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Status</TableHead>
                          <TableHead className="text-right min-w-[110px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-normal text-app-text-primary dark:text-white">{item.nome}</TableCell>
                        <TableCell className="text-app-text-secondary dark:text-white/70">{item.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                            {formatPerfil(item.perfil ?? '--')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${item.status === 'Ativo' ? 'app-status-success text-white' : 'app-status-neutral text-white'}`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4 text-app-text-secondary dark:text-white/40" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-xl border-app-border p-2 shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                                <DropdownMenuItem onClick={() => router.push('/usuarios')} className="cursor-pointer rounded-lg px-3 py-2.5 font-medium dark:text-white dark:hover:bg-app-hover">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push('/usuarios')} className="cursor-pointer rounded-lg px-3 py-2.5 font-medium dark:text-white dark:hover:bg-app-hover">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                {(item.perfil ?? '').toLowerCase() === 'recepcao' && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenAgenda(item)}
                                    className="cursor-pointer rounded-lg px-3 py-2.5 font-medium dark:text-white dark:hover:bg-app-hover"
                                  >
                                    <CalendarCheck className="mr-2 h-4 w-4" />
                                    Configurar agenda
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </DataTable>
            )}
          </CardContent>
        </Card>
      )
    }

    if (gerenciarTab === 'unidades') {
      return (
        <Card className="overflow-hidden rounded-2xl border-app-border/60 shadow-sm dark:border-app-border-dark">
          <CardContent className="p-0">
            {isLoadingUnidades ? (
              <div className="py-12 text-center text-app-text-muted">Carregando unidades...</div>
            ) : filteredUnidades.length === 0 ? (
              <div className="py-12 text-center text-app-text-muted">Nenhuma unidade encontrada.</div>
            ) : (
              <DataTable data={filteredUnidades}>
                {(pageData) => (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-hover">
                        <TableRow>
                          <TableHead className="min-w-[220px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Unidade</TableHead>
                          <TableHead className="min-w-[180px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Cidade</TableHead>
                          <TableHead className="min-w-[200px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">CNPJ</TableHead>
                          <TableHead className="min-w-[120px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Status</TableHead>
                          <TableHead className="text-right min-w-[110px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-normal text-app-text-primary dark:text-white">{item.nome}</TableCell>
                        <TableCell className="text-app-text-secondary dark:text-white/70">{item.cidade}</TableCell>
                        <TableCell className="text-app-text-secondary dark:text-white/70">{item.cnpj ?? '--'}</TableCell>
                        <TableCell>
                          <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${item.status === 'Ativa' || item.status === 'Ativo' ? 'app-status-success text-white' : 'app-status-neutral text-white'}`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4 text-app-text-secondary dark:text-white/40" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 rounded-xl border-app-border p-2 shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                                <DropdownMenuItem onClick={() => router.push('/unidades')} className="cursor-pointer rounded-lg px-3 py-2.5 font-medium dark:text-white dark:hover:bg-app-hover">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push('/unidades')} className="cursor-pointer rounded-lg px-3 py-2.5 font-medium dark:text-white dark:hover:bg-app-hover">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </DataTable>
            )}
          </CardContent>
        </Card>
      )
    }

    if (gerenciarTab === 'perfis') {
      return (
        <Card className="overflow-hidden rounded-2xl border-app-border/60 shadow-sm dark:border-app-border-dark">
          <CardContent className="p-0">
            {filteredPerfilSummary.length === 0 ? (
              <div className="py-12 text-center text-app-text-muted">Nenhum perfil encontrado.</div>
            ) : (
              <DataTable data={filteredPerfilSummary}>
                {(pageData) => (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-hover">
                        <TableRow>
                          <TableHead className="min-w-[220px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Perfil</TableHead>
                          <TableHead className="min-w-[320px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Descrição</TableHead>
                          <TableHead className="min-w-[140px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Escopo</TableHead>
                          <TableHead className="min-w-[110px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Módulos</TableHead>
                          <TableHead className="min-w-[110px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-normal text-app-text-primary dark:text-white">{item.perfil}</TableCell>
                        <TableCell className="text-app-text-secondary dark:text-white/70">{item.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                            {item.escopo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-normal text-app-text-primary dark:text-white">{item.recursos}</TableCell>
                        <TableCell className="font-normal text-app-text-primary dark:text-white">{item.acoes}</TableCell>
                      </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </DataTable>
            )}
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="overflow-hidden rounded-2xl border-app-border/60 shadow-sm dark:border-app-border-dark">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-app-text-muted">Carregando perfis...</div>
          ) : filteredPermissions.length === 0 ? (
            <div className="py-12 text-center text-app-text-muted">Nenhum perfil encontrado.</div>
          ) : (
            <DataTable data={filteredPermissions}>
              {(pageData) => (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-hover">
                      <TableRow>
                        <TableHead className="min-w-[200px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Perfil</TableHead>
                        <TableHead className="min-w-[320px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Descrição</TableHead>
                        <TableHead className="min-w-[150px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Escopo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-normal text-app-text-primary dark:text-white">{item.perfil}</TableCell>
                      <TableCell className="text-app-text-secondary dark:text-white/70">{item.descricao}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                          {item.escopo}
                        </Badge>
                      </TableCell>
                    </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DataTable>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="app-page app-page-loose">
      {isGerenciarView ? (
        <>
          <PageHeader
            title={
              <span className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-[var(--app-primary)] dark:text-white" />
                Gerenciamento de Perfis de Acesso
              </span>
            }
            description="Centralize a gestão administrativa de usuários, unidades e perfis em uma única visão."
            actions={
              <Button variant="outline" onClick={openListaView} className="h-10 rounded-xl px-4 font-normal">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para permissões
              </Button>
            }
          />

          <div className="space-y-4">
            <div className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-100/80 p-1 dark:bg-app-card/5">
              {GERENCIAR_NAV_ITEMS.map((item) => {
                const isActive = gerenciarTab === item.value
                return (
                  <button
                    key={item.value}
                    onClick={() => setGerenciarTab(item.value)}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'border border-app-border/50 bg-app-card text-app-text-primary shadow-sm dark:border-app-border-dark dark:bg-app-bg-dark dark:text-white'
                        : 'text-app-text-secondary hover:bg-app-card/50 dark:text-white/60 dark:hover:bg-app-card/10'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full lg:w-[480px]">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-app-text-muted dark:text-app-text-muted" />
                <Input
                  placeholder={
                    gerenciarTab === 'usuarios'
                      ? 'Buscar usuários por nome ou e-mail...'
                      : gerenciarTab === 'unidades'
                        ? 'Buscar unidades por nome ou CNPJ...'
                        : 'Buscar perfis por nome, descrição ou escopo...'
                  }
                  value={searchFilter}
                  onChange={(event) => setSearchFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border-app-border bg-app-card pl-11 text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:bg-app-card-dark dark:text-white dark:placeholder:text-app-text-muted"
                />
              </div>

              <div className="flex gap-3">
                {gerenciarTab === 'usuarios' && (
                  <Select value={profileFilter} onValueChange={setProfileFilter}>
                    <SelectTrigger className="h-11 w-full rounded-xl sm:w-60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-app-border dark:border-app-border-dark">
                      {GERENCIAR_PROFILE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {gerenciarTab === 'perfis' && (
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger className="h-11 w-full rounded-xl sm:w-60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-app-border dark:border-app-border-dark">
                      {GERENCIAR_MODULE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button variant="outline" onClick={clearFilters} className="h-11 rounded-xl px-6 font-normal whitespace-nowrap">
                  Limpar filtros
                </Button>
              </div>
            </div>

            {(usuariosError || unidadesError || error) && (
              <p className="text-sm text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)]">
                {usuariosError || unidadesError || error}
              </p>
            )}

            {renderGerenciarContent()}
          </div>
        </>
      ) : (
      <>
      <PageHeader
        title="Permissões"
        description="Gerencie perfis, escopos e acessos disponíveis nas áreas administrativas."
        actions={
          <>
            <Button variant="outline" onClick={clearFilters} className="h-11 rounded-xl px-6 font-normal whitespace-nowrap">
              Limpar filtros
            </Button>
            <Button
              variant="outline"
              onClick={openGerenciarView}
              className="h-11 rounded-xl px-6 font-normal whitespace-nowrap"
            >
              <Shield className="h-5 w-5" />
              Gerenciar perfis
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="h-11 rounded-xl bg-app-primary px-6 font-normal text-white whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Criar perfil
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full lg:w-[480px]">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-app-text-muted dark:text-app-text-muted" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            className="h-11 w-full rounded-xl border-app-border bg-app-card pl-11 text-sm font-normal shadow-sm transition-all focus:border-[var(--app-primary)] focus:ring-[var(--app-primary)]/20 dark:bg-app-card-dark dark:text-white dark:placeholder:text-app-text-muted"
          />
        </div>
      </div>
      </>
      )}

      {!isGerenciarView && error && (
        <p className="text-sm text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)]">{error}</p>
      )}

      {!isGerenciarView && <Card className="overflow-hidden rounded-[24px] border-app-border/60 shadow-sm dark:border-app-border-dark">
        <CardContent className="p-0">
        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-app-text-muted dark:text-white/40">Carregando permissões...</p>
          </div>
        ) : filteredPermissions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-app-text-muted dark:text-white/40">Nenhuma permissão encontrada com os filtros aplicados.</p>
          </div>
        ) : (
          <DataTable data={filteredPermissions}>
            {(pageData) => (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-hover">
                    <TableRow>
                      <TableHead className="min-w-[200px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Perfil</TableHead>
                      <TableHead className="min-w-[200px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Unidade</TableHead>
                      <TableHead className="min-w-[320px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Descrição</TableHead>
                      <TableHead className="min-w-[150px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Escopo</TableHead>
                      <TableHead className="text-center min-w-[100px] text-xs font-medium uppercase tracking-wider text-app-text-secondary">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-normal text-app-text-primary dark:text-white">{item.perfil}</TableCell>
                        <TableCell className="text-app-text-secondary dark:text-white/70">{item.unidadeNome ?? 'Global'}</TableCell>
                        <TableCell className="text-app-text-secondary dark:text-white/70">{item.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                            {item.escopo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4 text-app-text-secondary dark:text-white/40" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-xl border-app-border p-2 shadow-lg dark:border-app-border-dark dark:bg-app-card-dark">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPermission(item)
                                    setIsViewOpen(true)
                                  }}
                                  className="cursor-pointer rounded-lg px-3 py-2.5 font-medium dark:text-white dark:hover:bg-app-hover"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenEdit(item)}
                                  className="cursor-pointer rounded-lg px-3 py-2.5 font-medium dark:text-white dark:hover:bg-app-hover"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPermission(item)
                                    setIsDeleteOpen(true)
                                  }}
                                  className="cursor-pointer rounded-lg px-3 py-2.5 font-medium text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)] dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DataTable>
        )}
        </CardContent>
      </Card>}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
          <div className="bg-app-card p-8 dark:bg-app-card-dark">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white">
                {createMode === 'edit' ? 'Editar perfil' : 'Criar perfil'}
              </DialogTitle>
              <DialogDescription className="text-sm text-app-text-muted">
                {createMode === 'edit'
                  ? 'Revise módulos e ações deste perfil antes de aplicar alterações.'
                  : 'Monte a estrutura inicial do novo perfil administrativo a partir desta tela.'}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <p className="text-xs tracking-wider text-app-text-muted">Perfil</p>
                <Select
                  value={permissionForm.perfil}
                  onValueChange={(value) => setPermissionForm((current) => ({ ...current, perfil: value }))}
                  disabled={createMode === 'edit'}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {GERENCIAR_PROFILE_OPTIONS.filter((option) => option.value !== 'todos').map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs tracking-wider text-app-text-muted">Unidade</p>
                <Select
                  value={permissionForm.unidadeId}
                  onValueChange={(value) => setPermissionForm((current) => ({ ...current, unidadeId: value }))}
                  disabled={createMode === 'edit'}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-[12px] border border-app-border p-4 dark:border-app-border-dark">
                <p className="text-xs tracking-wider text-app-text-muted">Módulos e ações</p>
                <div className="mt-4 max-h-[360px] space-y-4 overflow-y-auto pr-1">
                  {availableResources.map((resource) => {
                    const selectedActions = permissionForm.permissions[resource.codigo] ?? []
                    return (
                      <div key={resource.codigo} className="rounded-[12px] border border-app-border/70 p-4 dark:border-app-border-dark">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-app-text-primary dark:text-white">{resource.label}</p>
                            <p className="mt-1 text-xs text-app-text-muted">{resource.descricao}</p>
                          </div>
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                            {selectedActions.length} ações
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ACTION_OPTIONS.map((action) => {
                            const isActive = selectedActions.includes(action)
                            return (
                              <button
                                key={`${resource.codigo}-${action}`}
                                type="button"
                                onClick={() => toggleAction(resource.codigo, action)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                  isActive
                                    ? 'border-app-primary bg-app-primary text-white'
                                    : 'border-app-border bg-app-card text-app-text-secondary dark:border-app-border-dark dark:bg-app-card-dark dark:text-white/70'
                                }`}
                              >
                                {ACTION_LABELS[action] ?? action}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Card className="rounded-[12px] border border-dashed border-app-border p-4 text-sm text-app-text-secondary dark:border-app-border-dark dark:text-white/70">
                {createMode === 'edit'
                  ? 'As alterações serão aplicadas diretamente à matriz de permissões do perfil selecionado.'
                  : 'O novo perfil será criado a partir da combinação de módulos e ações marcada abaixo.'}
              </Card>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 rounded-integrallys px-5">
                Cancelar
              </Button>
              <Button onClick={() => void handleSavePermission()} disabled={isSubmittingPermission} className="h-10 rounded-integrallys px-5 text-white">
                {isSubmittingPermission ? 'Salvando...' : createMode === 'edit' ? 'Salvar alterações' : 'Criar perfil'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
          <div className="bg-app-card p-8 dark:bg-app-card-dark">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white">Visualizar permissão</DialogTitle>
              <DialogDescription className="text-sm text-app-text-muted">Resumo consolidado das permissões vinculadas a este perfil.</DialogDescription>
            </DialogHeader>

            {selectedPermission && (
              <div className="mt-6 grid gap-4">
                <Card className="rounded-[12px] border border-app-border p-4 dark:border-app-border-dark">
                  <p className="text-xs tracking-wider text-app-text-muted">Perfil</p>
                  <p className="mt-1 text-base text-app-text-primary dark:text-white">{selectedPermission.perfil}</p>
                </Card>
                <Card className="rounded-[12px] border border-app-border p-4 dark:border-app-border-dark">
                  <p className="text-xs tracking-wider text-app-text-muted">Unidade</p>
                  <p className="mt-1 text-base text-app-text-primary dark:text-white">{selectedPermission.unidadeNome ?? 'Global'}</p>
                </Card>
                <Card className="rounded-[12px] border border-app-border p-4 dark:border-app-border-dark">
                  <p className="text-xs tracking-wider text-app-text-muted">Escopo</p>
                  <p className="mt-1 text-base text-app-text-primary dark:text-white">{selectedPermission.escopo}</p>
                </Card>
                <Card className="rounded-[12px] border border-app-border p-4 dark:border-app-border-dark">
                  <p className="text-xs tracking-wider text-app-text-muted">Módulos vinculados</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedPermission.recursos.map((recurso) => (
                      <Badge key={recurso} variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                        {RESOURCE_LABELS[recurso] ?? recurso}
                      </Badge>
                    ))}
                  </div>
                </Card>
                <Card className="rounded-[12px] border border-app-border p-4 dark:border-app-border-dark">
                  <p className="text-xs tracking-wider text-app-text-muted">Ações</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedPermission.acoes.map((acao) => (
                      <Badge key={acao} variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                        {ACTION_LABELS[acao] ?? acao}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setIsViewOpen(false)} className="h-10 rounded-integrallys px-5 text-white">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(agendaUsuario)} onOpenChange={(open) => { if (!open) { setAgendaUsuario(null); setAgendaSelectedIds([]) } }}>
        <DialogContent className="rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
          <div className="bg-app-card p-8 dark:bg-app-card-dark">
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-3 text-xl font-normal text-app-text-primary dark:text-white">
                <span className="app-status-info rounded-lg p-2">
                  <Users className="h-5 w-5 text-[var(--app-primary)]" />
                </span>
                Agendas permitidas — {agendaUsuario?.nome ?? ''}
              </DialogTitle>
              <DialogDescription className="text-sm text-app-text-muted">
                Selecione quais especialistas esta recepcionista pode visualizar e gerenciar na agenda. Deixar vazio para acesso irrestrito.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              {especialistaOptions.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-app-border px-4 py-6 text-center text-sm text-app-text-muted dark:border-app-border-dark">
                  Nenhum especialista ativo cadastrado.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {especialistaOptions.map((prof) => {
                    const active = agendaSelectedIds.includes(prof.id)
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => handleToggleAgendaEspecialista(prof.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-normal border transition-all ${
                          active
                            ? 'border-[var(--app-primary)] text-[var(--app-primary)] app-status-info'
                            : 'border-app-border text-app-text-secondary hover:border-[var(--app-primary)]/40 hover:text-[var(--app-primary)] dark:border-app-border-dark dark:text-white/70'
                        }`}
                      >
                        {prof.nome}
                      </button>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-app-text-muted">
                Se nenhum especialista for selecionado, a recepcionista terá acesso irrestrito a todas as agendas.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setAgendaUsuario(null); setAgendaSelectedIds([]) }}
                className="h-11 rounded-xl px-6 font-normal"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => void handleSalvarAgenda()}
                disabled={isAgendaSaving}
                className="h-11 rounded-xl bg-app-primary px-6 font-normal text-white"
              >
                {isAgendaSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-[24px] border border-app-border p-0 dark:border-app-border-dark">
          <div className="bg-app-card p-8 dark:bg-app-card-dark">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white">Excluir perfil</DialogTitle>
              <DialogDescription className="text-sm text-app-text-muted">
                Revise o perfil selecionado antes de concluir a remoção administrativa.
              </DialogDescription>
            </DialogHeader>
            {selectedPermission && (
              <div className="mt-6 rounded-[18px] border border-[var(--app-danger-bg)] bg-[var(--app-danger-bg)]/45 p-5 dark:bg-[var(--app-danger-bg)]/15">
                <p className="text-sm font-medium text-[var(--app-danger-text)]">
                  {selectedPermission.perfil} · {selectedPermission.unidadeNome ?? 'Global'}
                </p>
                <p className="mt-2 text-sm text-app-text-secondary dark:text-white/70">
                  Confirme a remoção apenas depois de revisar o impacto do perfil sobre os módulos vinculados.
                </p>
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="h-11 rounded-[12px] px-6">
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleConfirmDelete()} disabled={isSubmittingPermission} className="h-11 rounded-[12px] bg-[var(--app-danger-text)] px-6 text-white">
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
