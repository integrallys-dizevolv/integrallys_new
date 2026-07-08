'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUsuarios } from '@/hooks/use-usuarios'
import type { EstoqueItem, MovimentacaoEstoqueInput } from '../hooks/use-estoque'

interface BodyProps {
  items: EstoqueItem[]
  onConfirm: (payload: MovimentacaoEstoqueInput) => Promise<void>
  onClose: (open: boolean) => void
}

export function ConsumoInternoBody({ items, onConfirm, onClose }: BodyProps) {
  const { data: usuarios } = useUsuarios()
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState(0)
  const [justificativa, setJustificativa] = useState('')
  const [especialistaId, setEspecialistaId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === produtoId) ?? null,
    [items, produtoId],
  )

  const especialistas = useMemo(
    () => usuarios.filter((user) => (user.perfil ?? '').toLowerCase() === 'especialista'),
    [usuarios],
  )

  const submit = async () => {
    if (!produtoId || quantidade <= 0 || !justificativa.trim()) {
      toast.error('Preencha produto, quantidade e justificativa.')
      return
    }
    if (selectedItem && quantidade > selectedItem.quantidade) {
      toast.error('Quantidade excede o estoque disponível.')
      return
    }
    if (!selectedItem || quantidade > selectedItem.quantidade) {
      toast.error('Quantidade de consumo maior que o estoque disponível.')
      return
    }

    setIsSaving(true)
    try {
      const especialista = especialistaId
        ? especialistas.find((user) => user.id === especialistaId)
        : null
      await onConfirm({
        produtoId,
        quantidade,
        observacoes: justificativa.trim(),
        tipoMovimentacao: 'consumo_interno',
        vinculoTipo: especialista ? 'especialista' : null,
        vinculoId: especialista ? especialista.id : null,
        vinculoNome: especialista ? especialista.nome : null,
      })
      onClose(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível registrar o consumo interno.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="consumo-produto">Produto *</Label>
          <Select value={produtoId} onValueChange={setProdutoId}>
            <SelectTrigger id="consumo-produto" autoFocus>
              <SelectValue preferPlaceholder placeholder="Selecione o produto" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.produto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedItem && (
          <div className="flex items-center justify-between rounded-lg border border-app-border bg-app-bg-secondary/50 px-3 py-2 text-sm dark:border-app-border-dark dark:bg-app-card/5">
            <span className="text-app-text-secondary">Estoque atual</span>
            <span className={`font-medium tabular-nums ${quantidade > selectedItem.quantidade ? 'text-[var(--app-danger-text)]' : 'text-app-text-primary dark:text-white'}`}>
              {selectedItem.quantidade} un.
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="consumo-quantidade">Quantidade *</Label>
          <Input
            id="consumo-quantidade"
            type="number"
            min={1}
            value={quantidade}
            onChange={(event) => setQuantidade(Number(event.target.value) || 0)}
          />
          {selectedItem && quantidade > selectedItem.quantidade && (
            <p className="text-xs text-[var(--app-danger-text)] flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Quantidade excede o saldo disponível ({selectedItem.quantidade}).
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="consumo-justificativa">Justificativa *</Label>
          <Textarea
            id="consumo-justificativa"
            value={justificativa}
            onChange={(event) => setJustificativa(event.target.value)}
            placeholder="Ex: material de atendimento, uso administrativo, descarte por validade..."
            className="min-h-[96px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="consumo-especialista">Especialista que consumiu (opcional)</Label>
          <Select
            value={especialistaId || 'nenhum'}
            onValueChange={(value) => setEspecialistaId(value === 'nenhum' ? '' : value)}
          >
            <SelectTrigger id="consumo-especialista">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Não informar</SelectItem>
              {especialistas.length === 0 && (
                <SelectItem value="__empty_especialistas" disabled>
                  Nenhum especialista ativo
                </SelectItem>
              )}
              {especialistas.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-app-text-muted">
            Use apenas se quiser indicar quem consumiu o item — opcional, sem rastreabilidade obrigatória.
          </p>
        </div>
      </div>

      <DialogFooter className="border-t border-app-border dark:border-app-border-dark px-6 py-4 shrink-0 bg-app-card dark:bg-app-card-dark">
        <Button variant="outline" onClick={() => onClose(false)}>
          Cancelar
        </Button>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => void submit()}
          disabled={isSaving}
        >
          Salvar consumo
        </Button>
      </DialogFooter>
    </>
  )
}
