'use client'

import { useEffect, useState } from 'react'
import { Package, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EstoqueInput, EstoqueItem } from '../hooks/use-estoque'

interface EditarProdutoModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  produto: EstoqueItem | null
  onSave: (payload: EstoqueInput) => Promise<void>
}

export function EditarProdutoModal({ isOpen, onClose, produto, onSave }: EditarProdutoModalProps) {
  const [produtoNome, setProdutoNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [quantidade, setQuantidade] = useState(0)
  const [status, setStatus] = useState('Disponível')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (produto) {
      setProdutoNome(produto.produto)
      setCategoria(produto.categoria)
      setQuantidade(produto.quantidade)
      setStatus(produto.status)
    }
  }, [produto])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!produto) return
    if (!produtoNome.trim() || !categoria.trim()) {
      toast.error('Preencha produto e categoria para continuar.')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        id: produto.id,
        produto: produtoNome.trim(),
        categoria: categoria.trim(),
        quantidade,
        status: status.trim() || 'Disponível',
      })
      onClose(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar o produto.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !produto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-app-bg-dark/50 backdrop-blur-sm" onClick={() => onClose(false)} />

      <div className="relative bg-app-card dark:bg-app-card-dark rounded-2xl shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-app-border dark:border-app-border-dark">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl app-status-info dark:app-status-info flex items-center justify-center">
              <Package className="h-5 w-5 text-[var(--app-primary)] dark:text-[var(--app-success-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-app-text-primary dark:text-white">Editar Produto</h2>
              <p className="text-sm text-app-text-secondary dark:text-white/60">Atualize as informações do produto</p>
            </div>
          </div>
          <button
            onClick={() => onClose(false)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-app-text-muted hover:text-app-text-secondary hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-text-primary dark:text-white/70">Nome do Produto</label>
            <Input value={produtoNome} onChange={(event) => setProdutoNome(event.target.value)} placeholder="Nome do produto" className="w-full" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-app-text-primary dark:text-white/70">Categoria</label>
              <Input value={categoria} onChange={(event) => setCategoria(event.target.value)} placeholder="Categoria" className="w-full" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-app-text-primary dark:text-white/70">Status</label>
              <Input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Disponível" className="w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-app-text-primary dark:text-white/70">Quantidade Atual</label>
            <Input type="number" value={quantidade} onChange={(event) => setQuantidade(Number(event.target.value) || 0)} min={0} className="w-full" required />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onClose(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-app-primary hover:bg-app-primary-hover text-white" disabled={isSaving}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
