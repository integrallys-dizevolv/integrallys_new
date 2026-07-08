'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Pill, Calendar, AlertCircle, ArrowRight } from 'lucide-react'
import { PrescricaoAtiva, salvarAjustePosologia } from '@/services/especialistaPrescricoes.service'

export function AjustePosologiaModal({
  isOpen,
  onClose,
  prescricao,
}: {
  isOpen: boolean
  onClose: () => void
  prescricao: PrescricaoAtiva | null
}) {
  const [observacao, setObservacao] = useState('')
  const [produtos, setProdutos] = useState<PrescricaoAtiva['produtos']>([])

  useEffect(() => {
    if (!prescricao) return
    setProdutos(prescricao.produtos.map(p => ({ ...p })))
    setObservacao(prescricao.observacao || '')
  }, [prescricao])

  const handleSave = () => {
    if (!prescricao) return
    salvarAjustePosologia(prescricao.id, produtos, observacao)
    onClose()
  }

  const hasChanges = prescricao
    ? produtos.some((p, i) => {
        const original = prescricao.produtos[i]
        return (
          original &&
          ((p.posologia || '').trim() !== (original.posologia || '').trim() ||
            p.quantidade !== original.quantidade)
        )
      })
    : false

  if (!prescricao) return null

  const dataFormatada = prescricao.data
    ? new Date(prescricao.data + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton={true}
        className="sm:max-w-[700px] p-0 rounded-integrallys-lg overflow-hidden border-none shadow-2xl"
      >
        <div className="bg-app-card dark:bg-app-card-dark custom-scrollbar">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-app-border dark:border-app-border-dark">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-app-primary" />
                  <h2 className="text-2xl font-normal text-app-text-primary dark:text-white leading-tight">
                    Ajuste de posologia
                  </h2>
                </div>
                <p className="text-app-text-muted text-base">
                  Altere a forma de uso dos produtos da prescrição de{' '}
                  <span className="font-medium text-app-text-primary dark:text-white">
                    {prescricao.paciente}
                  </span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-app-border dark:border-app-border-dark bg-white dark:bg-transparent hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-colors shrink-0"
              >
                <X className="h-4 w-4 text-app-text-muted" />
              </button>
            </div>

            {/* Contexto da prescrição */}
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-integrallys bg-app-bg-secondary dark:bg-app-table-header-dark border border-app-border dark:border-app-border-dark">
              <Calendar className="h-4 w-4 text-app-text-muted shrink-0" />
              <span className="text-sm text-app-text-secondary dark:text-white/70">
                Última prescrição:
              </span>
              <span className="text-sm font-medium text-app-text-primary dark:text-white">
                {dataFormatada}
              </span>
              <Badge
                variant="outline"
                className="ml-auto rounded-full border-app-border dark:border-app-border-dark text-app-text-muted font-normal text-xs px-2.5 py-0.5"
              >
                {prescricao.tipo === 'complementar' ? 'Complementar' : 'Normal'}
              </Badge>
            </div>
          </div>

          {/* Produtos */}
          <div className="px-8 py-6 space-y-4">
            <h3 className="text-sm font-normal text-app-text-muted uppercase tracking-wider">
              Produtos prescritos — {produtos.length}{' '}
              {produtos.length === 1 ? 'item' : 'itens'}
            </h3>

            <div className="space-y-4">
              {produtos.map((item, index) => {
                const original = prescricao.produtos[index]
                const posologiaAlterada =
                  original &&
                  (item.posologia || '').trim() !== (original.posologia || '').trim()
                const quantidadeAlterada =
                  original && item.quantidade !== original.quantidade

                return (
                  <div
                    key={item.id}
                    className={`rounded-[12px] border p-5 transition-colors ${
                      posologiaAlterada || quantidadeAlterada
                        ? 'border-[var(--app-primary)]/40 bg-[var(--app-primary)]/[0.03] dark:bg-[var(--app-primary)]/[0.05]'
                        : 'border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark'
                    }`}
                  >
                    {/* Nome do produto */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-normal text-app-text-primary dark:text-white text-base">
                          {item.nome}
                        </h4>
                        {(posologiaAlterada || quantidadeAlterada) && (
                          <span className="text-xs text-[var(--app-primary)] font-medium mt-0.5 block">
                            Posologia alterada
                          </span>
                        )}
                      </div>
                      {(posologiaAlterada || quantidadeAlterada) && (
                        <div className="h-6 w-6 rounded-full bg-[var(--app-primary)]/10 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-3.5 w-3.5 text-[var(--app-primary)]" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Quantidade */}
                      <div className="space-y-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                          Quantidade
                        </Label>
                        {original && quantidadeAlterada && (
                          <div className="flex items-center gap-1 text-xs text-app-text-muted mb-1">
                            <span className="line-through">{original.quantidade}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="text-[var(--app-primary)] font-medium">
                              {item.quantidade}
                            </span>
                          </div>
                        )}
                        <Input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) => {
                            const value = Number(e.target.value) || 1
                            setProdutos((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, quantidade: value } : p)),
                            )
                          }}
                          className="h-11 bg-app-bg-secondary/50 dark:bg-app-table-header-dark border-app-border dark:border-app-border-dark rounded-integrallys font-normal"
                        />
                      </div>

                      {/* Posologia */}
                      <div className="md:col-span-3 space-y-2">
                        <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                          Posologia
                        </Label>

                        {/* Posologia anterior */}
                        {original && (
                          <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-app-bg-secondary dark:bg-app-table-header-dark border border-dashed border-app-border dark:border-app-border-dark">
                            <span className="text-xs text-app-text-muted shrink-0 mt-0.5">Atual:</span>
                            <span
                              className={`text-xs flex-1 ${
                                posologiaAlterada
                                  ? 'text-app-text-muted line-through'
                                  : 'text-app-text-secondary dark:text-white/70'
                              }`}
                            >
                              {original.posologia || 'Não informada'}
                            </span>
                          </div>
                        )}

                        <Input
                          placeholder="Ex: Tomar 1 cápsula 2x ao dia, após refeições"
                          value={item.posologia}
                          onChange={(e) => {
                            const value = e.target.value
                            setProdutos((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, posologia: value } : p)),
                            )
                          }}
                          className="h-11 px-4 bg-app-bg-secondary/50 dark:bg-app-table-header-dark border-app-border dark:border-app-border-dark rounded-integrallys font-normal"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Observação */}
          <div className="px-8 pb-6 space-y-2">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white">
              Observação do Dr.
            </Label>
            <Textarea
              placeholder="Registre aqui o motivo do ajuste ou orientações adicionais ao paciente..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="min-h-[90px] p-4 bg-app-bg-secondary/50 dark:bg-app-table-header-dark border-app-border dark:border-app-border-dark rounded-integrallys font-normal resize-none"
            />
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-app-border dark:border-app-border-dark flex items-center justify-between gap-3 bg-app-bg-secondary/30 dark:bg-app-table-header-dark/40">
            <div className="text-sm text-app-text-muted">
              {hasChanges ? (
                <span className="text-[var(--app-primary)] font-medium">
                  Alterações pendentes para salvar
                </span>
              ) : (
                <span>Nenhuma alteração feita</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-11 px-6 rounded-integrallys border-app-border dark:border-app-border-dark text-app-text-secondary dark:text-app-text-muted hover:bg-app-bg-secondary dark:hover:bg-app-hover font-normal"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="h-11 px-8 rounded-integrallys bg-app-primary hover:bg-app-primary-hover text-white font-normal shadow-lg shadow-[var(--app-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
              >
                Salvar ajuste
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
