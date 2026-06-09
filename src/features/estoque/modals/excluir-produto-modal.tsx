'use client'

import { AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { EstoqueItem } from '../hooks/use-estoque'
import { useState } from 'react'

interface ExcluirProdutoModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  produto: EstoqueItem | null
  onConfirm: (produto: EstoqueItem) => Promise<void>
}

export function ExcluirProdutoModal({ isOpen, onClose, produto, onConfirm }: ExcluirProdutoModalProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleConfirm = async () => {
    if (!produto) return

    setIsSaving(true)
    try {
      await onConfirm(produto)
      onClose(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir o produto.')
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
            <div className="h-10 w-10 rounded-xl app-status-danger dark:bg-transparent flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-app-text-primary dark:text-white">Excluir Produto</h2>
              <p className="text-sm text-app-text-secondary dark:text-white/60">Esta ação não pode ser desfeita</p>
            </div>
          </div>
          <button
            onClick={() => onClose(false)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-app-text-muted hover:text-app-text-secondary hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="app-status-danger dark:bg-transparent border border-transparent dark:border-red-900/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-[var(--app-danger-text)] dark:text-red-300">
              Você está prestes a excluir o produto <strong>&quot;{produto.produto}&quot;</strong>.
              Todos os dados relacionados a este produto serão removidos permanentemente.
            </p>
          </div>

          <div className="bg-app-bg-secondary dark:bg-app-hover rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-app-text-secondary dark:text-white/60">Produto:</span>
              <span className="text-app-text-primary dark:text-white font-medium">{produto.produto}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-app-text-secondary dark:text-white/60">Categoria:</span>
              <span className="text-app-text-primary dark:text-white">{produto.categoria}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-app-text-secondary dark:text-white/60">Quantidade atual:</span>
              <span className="text-app-text-primary dark:text-white">{produto.quantidade}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => onClose(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              className="flex-1 bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white"
              disabled={isSaving}
            >
              Excluir Produto
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
