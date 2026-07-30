'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FeedbackConsulta, SpinnerCampo } from '@/components/shared/feedback-consulta'
import { ModalHeader } from '@/components/shared/modal-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConsultaCnpj } from '@/hooks/use-consulta-cnpj'
import {
  formatarCNPJ,
  formatarTelefone,
  normalizarCNPJ,
  validarCNPJ,
  validarTelefone,
} from '@/lib/validacao-br'
import type { EmpresaCnpj } from '@/services/cnpj.service'
import type { FornecedorInput, FornecedorItem } from '@/types/fornecedor'

type FornecedorModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  initial?: FornecedorItem | null
  onClose: () => void
  onSave: (payload: FornecedorInput) => Promise<void>
}

type FormState = {
  nome: string
  razaoSocial: string
  cnpj: string
  inscricaoEstadual: string
  telefone: string
  email: string
  contatoNome: string
  contatoSetor: string
  categoriaDre: string
  status: 'Ativo' | 'Inativo'
}

const emptyForm = (): FormState => ({
  nome: '',
  razaoSocial: '',
  cnpj: '',
  inscricaoEstadual: '',
  telefone: '',
  email: '',
  contatoNome: '',
  contatoSetor: '',
  categoriaDre: '',
  status: 'Ativo',
})

export function FornecedorModal({
  isOpen,
  mode,
  initial = null,
  onClose,
  onSave,
}: FornecedorModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Preenche razão social/contato a partir da Receita Federal, sem sobrescrever
  // o que o usuário já digitou.
  const aoEncontrarCnpj = useCallback((empresa: EmpresaCnpj) => {
    setForm((prev) => ({
      ...prev,
      nome: prev.nome || empresa.nomeFantasia || empresa.razaoSocial,
      razaoSocial: prev.razaoSocial || empresa.razaoSocial,
      telefone: prev.telefone || formatarTelefone(empresa.telefone),
      email: prev.email || empresa.email,
    }))
  }, [])

  const consultaCnpj = useConsultaCnpj(aoEncontrarCnpj)

  useEffect(() => {
    if (!isOpen) return
    consultaCnpj.reiniciar()
    setForm({
      nome: initial?.nome ?? '',
      razaoSocial: initial?.razaoSocial ?? '',
      cnpj: formatarCNPJ(initial?.cnpj ?? ''),
      inscricaoEstadual: initial?.inscricaoEstadual ?? '',
      telefone: formatarTelefone(initial?.telefone ?? ''),
      email: initial?.email ?? '',
      contatoNome: initial?.contatoNome ?? '',
      contatoSetor: initial?.contatoSetor ?? '',
      categoriaDre: initial?.categoriaDre ?? '',
      status: initial?.status === 'Inativo' ? 'Inativo' : 'Ativo',
    })
  }, [isOpen, initial, consultaCnpj.reiniciar])

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const handleCnpjChange = (valor: string) => {
    const mascarado = formatarCNPJ(valor)
    update({ cnpj: mascarado })
    void consultaCnpj.consultar(mascarado)
  }

  const handleSave = async () => {
    if (isSubmitting) return
    if (!form.nome.trim()) {
      toast.error('Informe o nome do fornecedor')
      return
    }
    if (form.cnpj.trim() && !validarCNPJ(form.cnpj)) {
      toast.error('CNPJ inválido — confira os dígitos verificadores.')
      return
    }
    if (form.telefone.trim() && !validarTelefone(form.telefone)) {
      toast.error('Telefone inválido — confira o DDD e a quantidade de dígitos.')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({
        nome: form.nome.trim(),
        razaoSocial: form.razaoSocial.trim() || null,
        cnpj: normalizarCNPJ(form.cnpj) || null,
        inscricaoEstadual: form.inscricaoEstadual.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        contatoNome: form.contatoNome.trim() || null,
        contatoSetor: form.contatoSetor.trim() || null,
        categoriaDre: form.categoriaDre.trim() || null,
        status: form.status,
      })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o fornecedor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[24px] sm:max-w-[640px]">
        <ModalHeader
          title={mode === 'edit' ? 'Editar fornecedor' : 'Novo fornecedor'}
          description="Dados do fornecedor e do contato comercial. Apenas o nome é obrigatório."
        />

        <div className="space-y-4 px-6 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fornecedor-nome">Nome</Label>
            <Input
              id="fornecedor-nome"
              placeholder="Ex.: ACME Suprimentos"
              value={form.nome}
              onChange={(e) => update({ nome: e.target.value })}
              className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-razao-social">Razão social</Label>
              <Input
                id="fornecedor-razao-social"
                value={form.razaoSocial}
                onChange={(e) => update({ razaoSocial: e.target.value })}
                className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-cnpj">CNPJ</Label>
              <div className="relative">
                <Input
                  id="fornecedor-cnpj"
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  autoComplete="off"
                  inputMode="text"
                  className="h-11 rounded-xl pr-10 border-app-border dark:border-app-border-dark"
                />
                {consultaCnpj.status === 'buscando' && <SpinnerCampo />}
              </div>
              <FeedbackConsulta
                status={consultaCnpj.status}
                buscando="Consultando na Receita Federal..."
                encontrado={form.razaoSocial}
                invalido="CNPJ inválido — confira os dígitos verificadores."
                naoEncontrado="CNPJ não encontrado na Receita — você pode seguir e preencher manualmente."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-ie">Inscrição estadual</Label>
              <Input
                id="fornecedor-ie"
                value={form.inscricaoEstadual}
                onChange={(e) => update({ inscricaoEstadual: e.target.value })}
                className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-dre">Categoria (DRE)</Label>
              <Input
                id="fornecedor-dre"
                placeholder="Ex.: Insumos"
                value={form.categoriaDre}
                onChange={(e) => update({ categoriaDre: e.target.value })}
                className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-telefone">Telefone</Label>
              <Input
                id="fornecedor-telefone"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(e) => update({ telefone: formatarTelefone(e.target.value) })}
                inputMode="tel"
                className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-email">E-mail</Label>
              <Input
                id="fornecedor-email"
                type="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-contato">Contato</Label>
              <Input
                id="fornecedor-contato"
                placeholder="Nome do contato"
                value={form.contatoNome}
                onChange={(e) => update({ contatoNome: e.target.value })}
                className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-setor">Setor</Label>
              <Input
                id="fornecedor-setor"
                placeholder="Ex.: Compras"
                value={form.contatoSetor}
                onChange={(e) => update({ contatoSetor: e.target.value })}
                className="h-11 rounded-xl border-app-border dark:border-app-border-dark"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(value: 'Ativo' | 'Inativo') => update({ status: value })}
            >
              <SelectTrigger className="h-11 rounded-xl border-app-border dark:border-app-border-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-3 px-6 pb-6 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 rounded-xl border-app-border font-normal dark:border-app-border-dark"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-app-primary px-6 font-normal text-white"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
