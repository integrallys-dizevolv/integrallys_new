'use client'

import { useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatarCPF, formatarTelefone, validarCPF, validarTelefone } from '@/lib/validacao-br'

export interface CadastroRapidoPacientePayload {
  nome: string
  telefone: string
  dataNascimento: string
  cpf: string
}

interface CadastroRapidoPacienteProps {
  initialNome?: string
  isSubmitting?: boolean
  onCancel: () => void
  onSubmit: (payload: CadastroRapidoPacientePayload) => Promise<void>
}

export function CadastroRapidoPaciente({
  initialNome = '',
  isSubmitting = false,
  onCancel,
  onSubmit,
}: CadastroRapidoPacienteProps) {
  const [nome, setNome] = useState(initialNome)
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [cpf, setCpf] = useState('')

  const handleSubmit = async () => {
    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      toast.error('Informe o nome completo do paciente.')
      return
    }
    if (!validarTelefone(telefone)) {
      toast.error('Telefone inválido — confira DDD e número.')
      return
    }
    if (!dataNascimento) {
      toast.error('Informe a data de nascimento.')
      return
    }
    if (!validarCPF(cpf)) {
      toast.error('CPF inválido — confira os dígitos verificadores.')
      return
    }

    await onSubmit({
      nome: nomeTrim,
      telefone: formatarTelefone(telefone),
      dataNascimento,
      cpf: formatarCPF(cpf),
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') return
    // Nested <form> is invalid HTML; trap Enter so parent Novo Agendamento
    // form does not submit (silent no-op when pacienteId is empty).
    event.preventDefault()
    event.stopPropagation()
    if (isSubmitting) return
    void handleSubmit()
  }

  return (
    <div
      className="space-y-3 rounded-integrallys border border-app-border bg-app-bg-secondary/40 p-3 dark:border-app-border-dark dark:bg-app-bg-dark"
      onKeyDown={handleKeyDown}
    >
      <p className="text-sm font-medium text-app-text-primary dark:text-white">Cadastro rápido</p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cadastro-rapido-nome" className="text-sm font-normal text-app-text-primary dark:text-white">
            Nome completo
          </Label>
          <Input
            id="cadastro-rapido-nome"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className="h-10 rounded-integrallys"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cadastro-rapido-telefone" className="text-sm font-normal text-app-text-primary dark:text-white">
            Telefone
          </Label>
          <Input
            id="cadastro-rapido-telefone"
            value={telefone}
            onChange={(event) => setTelefone(formatarTelefone(event.target.value))}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            className="h-10 rounded-integrallys"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="cadastro-rapido-nascimento"
              className="text-sm font-normal text-app-text-primary dark:text-white"
            >
              Data de nascimento
            </Label>
            <Input
              id="cadastro-rapido-nascimento"
              type="date"
              value={dataNascimento}
              onChange={(event) => setDataNascimento(event.target.value)}
              className="h-10 rounded-integrallys"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cadastro-rapido-cpf" className="text-sm font-normal text-app-text-primary dark:text-white">
              CPF
            </Label>
            <Input
              id="cadastro-rapido-cpf"
              value={cpf}
              onChange={(event) => setCpf(formatarCPF(event.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="h-10 rounded-integrallys"
              required
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 rounded-integrallys"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="h-9 rounded-integrallys bg-app-primary text-white hover:bg-app-primary-hover"
          >
            {isSubmitting ? 'Salvando…' : 'Salvar paciente'}
          </Button>
        </div>
      </div>
    </div>
  )
}
