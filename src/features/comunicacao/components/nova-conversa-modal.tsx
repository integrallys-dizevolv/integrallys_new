'use client'

import { useMemo, useState } from 'react'
import { Search, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useApi } from '@/hooks/use-api'
import { usePacientes } from '@/hooks/use-pacientes'

interface Props {
  open: boolean
  onClose: () => void
  /** chamado após enviar com sucesso, para abrir o fio da conversa */
  onSent: (telefone: string, paciente: string | null) => void
}

export function NovaConversaModal({ open, onClose, onSent }: Props) {
  const api = useApi()
  const { data: pacientes } = usePacientes()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualTelefone, setManualTelefone] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [sending, setSending] = useState(false)

  const lista = useMemo(() => {
    const term = search.toLowerCase()
    return pacientes
      .filter((p) => p.telefone)
      .filter(
        (p) =>
          !term || p.nome.toLowerCase().includes(term) || p.telefone.toLowerCase().includes(term),
      )
  }, [pacientes, search])

  const selecionado = pacientes.find((p) => p.id === selectedId) ?? null

  const reset = () => {
    setSearch('')
    setSelectedId(null)
    setManualTelefone('')
    setMensagem('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSend = async () => {
    if (sending) return
    const usandoManual = manualTelefone.trim().length > 0
    const telefone = usandoManual ? manualTelefone.trim() : (selecionado?.telefone ?? '')
    if (!telefone || !mensagem.trim()) {
      toast.error('Escolha um paciente (ou digite um número) e escreva a mensagem.')
      return
    }
    setSending(true)
    try {
      await api.post<{ data: { telefone: string } }>('/api/whatsapp/mensagens', {
        telefone,
        conteudo: mensagem.trim(),
        pacienteId: usandoManual ? undefined : selecionado?.id,
      })
      toast.success('Mensagem enviada.')
      onSent(telefone, usandoManual ? null : (selecionado?.nome ?? null))
      reset()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar a mensagem.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent size="lg" className="rounded-[24px]">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
              Paciente
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
              <Input
                placeholder="Buscar paciente por nome ou telefone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 rounded-xl pl-10"
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto rounded-xl border border-app-border dark:border-app-border-dark">
              {lista.length === 0 ? (
                <p className="p-4 text-center text-sm text-app-text-secondary dark:text-white/60">
                  Nenhum paciente com telefone cadastrado.
                </p>
              ) : (
                lista.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id)
                      setManualTelefone('')
                    }}
                    className={`flex w-full items-center justify-between gap-3 border-b border-app-border/50 px-4 py-2 text-left last:border-b-0 hover:bg-app-bg-secondary/50 dark:border-app-border-dark dark:hover:bg-app-hover ${
                      selectedId === p.id ? 'bg-app-primary/5' : ''
                    }`}
                  >
                    <span className="text-sm font-normal text-app-text-primary dark:text-white">
                      {p.nome}
                    </span>
                    <span className="text-xs text-app-text-secondary dark:text-white/60">
                      {p.telefone}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
              Ou número avulso (com DDD)
            </span>
            <Input
              placeholder="Ex.: 11912345678"
              value={manualTelefone}
              onChange={(event) => {
                setManualTelefone(event.target.value)
                if (event.target.value.trim()) setSelectedId(null)
              }}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">
              Mensagem
            </span>
            <Textarea
              value={mensagem}
              onChange={(event) => setMensagem(event.target.value)}
              className="min-h-[120px] rounded-xl"
              placeholder="Escreva a primeira mensagem..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSend()}
            disabled={sending}
            className="bg-app-primary text-white hover:bg-app-primary-hover"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Enviando...' : 'Enviar e abrir conversa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
