'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Search, Plus, Check, Trash2 } from 'lucide-react'
import { salvarPrescricaoComplementar } from '@/services/especialistaPrescricoes.service'

interface EstoqueProduto {
  id: number
  nome: string
  categoria: string
  total: number
}

const STOCK_ITEMS: EstoqueProduto[] = []

interface ProdutoSelecionado {
  id: number
  nome: string
  categoria: string
  quantidade: number
  valorUnitario: number
  posologia: string
}

type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'consumo'

export function PrescricaoComplementarModal({
  isOpen,
  onClose,
  paciente,
}: {
  isOpen: boolean
  onClose: () => void
  paciente: string
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selecionados, setSelecionados] = useState<ProdutoSelecionado[]>([])
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')

  const handleAddProduto = (item: EstoqueProduto) => {
    if (selecionados.find((p) => p.id === item.id)) return
    setSelecionados((prev) => [
      ...prev,
      {
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        quantidade: 1,
        valorUnitario: 0,
        posologia: '',
      },
    ])
  }

  const handleRemoveProduto = (id: number) => {
    setSelecionados((prev) => prev.filter((p) => p.id !== id))
  }

  const handleUpdateProduto = (
    id: number,
    field: keyof Omit<ProdutoSelecionado, 'id' | 'nome' | 'categoria'>,
    value: string | number,
  ) => {
    setSelecionados((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    )
  }

  const handleSave = async () => {
    if (selecionados.length === 0) return
    await salvarPrescricaoComplementar(
      paciente,
      selecionados.map((p) => ({
        nome: p.nome,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
        posologia: p.posologia,
      })),
      formaPagamento,
    )
    setSelecionados([])
    setSearchTerm('')
    setFormaPagamento('pix')
    onClose()
  }

  const totalGeral = selecionados.reduce(
    (acc, p) => acc + p.quantidade * p.valorUnitario,
    0,
  )

  const filteredStock = STOCK_ITEMS.filter(
    (item) =>
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton={true}
        className="sm:max-w-[760px] p-0 rounded-integrallys-lg overflow-hidden border-none shadow-2xl"
      >
        <div className="bg-app-card dark:bg-app-card-dark custom-scrollbar">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-app-border dark:border-app-border-dark">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-app-primary" />
                  <h2 className="text-2xl font-normal text-app-text-primary dark:text-white leading-tight">
                    Prescrição complementar
                  </h2>
                </div>
                <p className="text-app-text-muted text-base">
                  Adicione novos produtos para{' '}
                  <span className="font-medium text-app-text-primary dark:text-white">
                    {paciente}
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
          </div>

          <div className="px-8 py-6 space-y-6">
            {/* Produtos selecionados */}
            {selecionados.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-normal text-app-text-muted uppercase tracking-wider">
                  Produtos adicionados — {selecionados.length}{' '}
                  {selecionados.length === 1 ? 'item' : 'itens'}
                </h3>

                <div className="space-y-3">
                  {selecionados.map((item) => (
                    <div
                      key={item.id}
                      className="bg-app-card dark:bg-app-card-dark border border-app-border dark:border-app-border-dark rounded-[12px] p-5 relative animate-in slide-in-from-top-2"
                    >
                      {/* Cabeçalho do produto */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-normal text-app-text-primary dark:text-white text-base">
                            {item.nome}
                          </h4>
                          <p className="text-xs text-app-text-muted mt-0.5">{item.categoria}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveProduto(item.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:text-[var(--app-danger-text)] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Quantidade */}
                        <div className="space-y-2">
                          <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                            Quantidade
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantidade}
                            onChange={(e) =>
                              handleUpdateProduto(item.id, 'quantidade', Number(e.target.value) || 1)
                            }
                            className="h-11 bg-app-bg-secondary/50 dark:bg-app-table-header-dark border-app-border dark:border-app-border-dark rounded-integrallys font-normal"
                          />
                        </div>

                        {/* Valor unitário */}
                        <div className="space-y-2">
                          <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                            Valor unitário (R$)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.valorUnitario}
                            onChange={(e) =>
                              handleUpdateProduto(
                                item.id,
                                'valorUnitario',
                                Number(e.target.value) || 0,
                              )
                            }
                            className="h-11 bg-app-bg-secondary/50 dark:bg-app-table-header-dark border-app-border dark:border-app-border-dark rounded-integrallys font-normal"
                          />
                        </div>

                        {/* Posologia */}
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                            Posologia *
                          </Label>
                          <Input
                            placeholder="Ex: Tomar 1 cápsula 2x ao dia, após refeições"
                            value={item.posologia}
                            onChange={(e) =>
                              handleUpdateProduto(item.id, 'posologia', e.target.value)
                            }
                            className="h-11 px-4 bg-app-bg-secondary/50 dark:bg-app-table-header-dark border-app-border dark:border-app-border-dark rounded-integrallys font-normal"
                          />
                        </div>
                      </div>

                      {/* Subtotal */}
                      {item.valorUnitario > 0 && (
                        <div className="mt-3 flex justify-end">
                          <span className="text-xs text-app-text-muted">
                            Subtotal:{' '}
                            <span className="font-medium text-app-text-primary dark:text-white">
                              R${' '}
                              {(item.quantidade * item.valorUnitario).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Busca no estoque */}
            <div className="space-y-3">
              <h3 className="text-sm font-normal text-app-text-muted uppercase tracking-wider">
                Estoque disponível — {filteredStock.length} produtos
              </h3>

              <div className="relative">
                <Input
                  placeholder="Buscar produto por nome ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 bg-app-bg-secondary dark:bg-app-table-header-dark border-app-border dark:border-app-border-dark rounded-integrallys font-normal"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted pointer-events-none" />
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredStock.map((item) => {
                  const isAdded = selecionados.some((p) => p.id === item.id)
                  return (
                    <div
                      key={item.id}
                      className="bg-app-card dark:bg-app-card-dark border border-app-border dark:border-app-border-dark p-4 rounded-[12px] flex items-center justify-between hover:border-app-border dark:hover:border-gray-600 transition-all"
                    >
                      <div>
                        <h4 className="font-normal text-app-text-primary dark:text-white text-sm">
                          {item.nome}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="rounded-full border-app-border dark:border-app-border-dark text-app-text-muted font-normal text-xs px-2 py-0"
                          >
                            {item.categoria}
                          </Badge>
                          <span className="text-xs text-app-text-muted">
                            Estoque: {item.total}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant={isAdded ? 'ghost' : 'outline'}
                        size="sm"
                        onClick={() => !isAdded && handleAddProduto(item)}
                        disabled={isAdded}
                        className={`h-9 px-4 rounded-integrallys font-normal gap-2 shrink-0 ${
                          isAdded
                            ? 'text-app-text-muted cursor-default hover:bg-transparent'
                            : 'border-app-border dark:border-app-border-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover text-app-text-primary dark:text-gray-200'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Adicionado
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Forma de pagamento */}
            {selecionados.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-app-border dark:border-app-border-dark">
                <Label className="text-sm font-normal text-app-text-primary dark:text-white">
                  Forma de pagamento
                </Label>
                <Select
                  value={formaPagamento}
                  onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}
                >
                  <SelectTrigger className="h-11 bg-app-bg-secondary/50 dark:bg-app-table-header-dark border-app-border dark:border-app-border-dark rounded-integrallys font-normal">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de débito</SelectItem>
                    <SelectItem value="consumo">Consumo interno (sem cobrança)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-app-border dark:border-app-border-dark flex items-center justify-between gap-3 bg-app-bg-secondary/30 dark:bg-app-table-header-dark/40">
            <div className="text-sm text-app-text-muted">
              {selecionados.length > 0 && totalGeral > 0 ? (
                <span>
                  Total:{' '}
                  <span className="font-medium text-app-text-primary dark:text-white">
                    R${' '}
                    {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </span>
              ) : selecionados.length > 0 ? (
                <span>{selecionados.length} produto(s) selecionado(s)</span>
              ) : (
                <span>Nenhum produto selecionado</span>
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
                disabled={selecionados.length === 0}
                className="h-11 px-8 rounded-integrallys bg-app-primary hover:bg-app-primary-hover text-white font-normal shadow-lg shadow-[var(--app-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
              >
                Salvar prescrição
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
