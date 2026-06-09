'use client'

import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, BarChart3, Calendar, ChevronRight, Download, FileText, Loader2 } from 'lucide-react'
import { downloadBlob, gerarPdfDoElemento } from '@/features/documentacao-gerar/generate-pdf'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDre, type DreFiltersInput } from '@/features/financeiro/hooks/use-dre'

const createInitialDreFilters = (): DreFiltersInput => ({
  periodo: 'mensal',
  mesAno: new Date().toISOString().slice(0, 7),
  unidade: 'todas',
  visao: 'gerencial',
  busca: '',
  tipo: 'todos',
  categoria: 'todas',
})

const createClearedDreFilters = (): DreFiltersInput => ({
  periodo: 'mensal',
  mesAno: '',
  unidade: 'todas',
  visao: 'gerencial',
  busca: '',
  tipo: 'todos',
  categoria: 'todas',
})

const formatCurrency = (value: number) =>
  `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const formatCurrencySigned = (value: number) => {
  if (value === 0) return 'R$ 0,00'
  if (value < 0) return `(-) ${formatCurrency(value)}`
  return formatCurrency(value)
}

const formatMonthYear = (value: string) => {
  if (!value) return 'Período não definido'

  const [year, month] = value.split('-')
  if (!year || !month) return value

  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const getPeriodLabel = (periodo: string) => {
  if (periodo === 'trimestral') return 'trimestre'
  if (periodo === 'anual') return 'ano'
  if (periodo === 'diario') return 'dia'
  return 'mês'
}

const formatReferenceLabel = (value: string) => {
  if (!value) return 'Período'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR')
  }
  return formatMonthYear(value)
}

const VariacaoBadge = ({ pct }: { pct: number }) => {
  const positivo = pct >= 0
  const Icon = positivo ? ArrowUp : ArrowDown
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${
        positivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--app-danger-text)]'
      }`}
    >
      <Icon size={14} className="shrink-0" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

export function DreView() {
  const [expandedDreItems, setExpandedDreItems] = useState<number[]>([])
  const [dreFilters, setDreFilters] = useState<DreFiltersInput>(createInitialDreFilters)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<DreFiltersInput>(createInitialDreFilters)
  const [compareMode, setCompareMode] = useState(false)
  const dre = useDre(appliedFilters)
  const tabelaRef = useRef<HTMLDivElement | null>(null)
  const isDiario = dreFilters.periodo === 'diario'

  const handlePeriodoChange = (value: string) => {
    const periodo = value as DreFiltersInput['periodo']
    setDreFilters((prev) => {
      let { mesAno, comparar } = prev
      if (periodo === 'diario' && /^\d{4}-\d{2}$/.test(mesAno)) mesAno = `${mesAno}-01`
      if (periodo !== 'diario' && /^\d{4}-\d{2}-\d{2}$/.test(mesAno)) mesAno = mesAno.slice(0, 7)
      if (comparar) {
        if (periodo === 'diario' && /^\d{4}-\d{2}$/.test(comparar)) comparar = `${comparar}-01`
        if (periodo !== 'diario' && /^\d{4}-\d{2}-\d{2}$/.test(comparar)) comparar = comparar.slice(0, 7)
      }
      return { ...prev, periodo, mesAno, comparar }
    })
  }

  const toggleCompareMode = () => {
    setCompareMode((on) => {
      const next = !on
      setDreFilters((prev) => ({
        ...prev,
        comparar: next ? prev.comparar ?? prev.mesAno : undefined,
      }))
      return next
    })
  }

  const dreItems = dre.data?.items ?? []
  const receitaBruta = dre.data?.resumo.receitaBruta ?? 0
  /**
   * Backend retorna a Receita líquida na chave `lucroBruto` (mantida por
   * retrocompatibilidade — ver comentário no /api/dre/route.ts). A UI exibe
   * como "Receita líquida" desde a CR-REV-I.
   */
  const receitaLiquida = dre.data?.resumo.lucroBruto ?? 0
  const ebitda = dre.data?.resumo.ebitda ?? 0
  const lucroLiquido = dre.data?.resumo.lucroLiquido ?? 0

  useEffect(() => {
    setExpandedDreItems([])
  }, [dre.data?.id])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedFilters((prev) => {
        const same =
          prev.periodo === dreFilters.periodo &&
          prev.mesAno === dreFilters.mesAno &&
          prev.unidade === dreFilters.unidade &&
          prev.visao === dreFilters.visao &&
          prev.busca === dreFilters.busca &&
          prev.tipo === dreFilters.tipo &&
          prev.categoria === dreFilters.categoria &&
          prev.comparar === dreFilters.comparar

        return same ? prev : dreFilters
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [dreFilters])

  useEffect(() => {
    const unitId = dre.scopedUnitId
    if (!unitId) return

    setDreFilters((prev) => (prev.unidade === unitId ? prev : { ...prev, unidade: unitId }))
    setAppliedFilters((prev) => (prev.unidade === unitId ? prev : { ...prev, unidade: unitId }))
  }, [dre.scopedUnitId])

  const toggleDreItem = (id: number) => {
    setExpandedDreItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    )
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await dre.reload(dreFilters, true)
      setAppliedFilters(dreFilters)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportPdf = async () => {
    if (isExporting) return
    if (!tabelaRef.current) {
      toast.error('Tabela DRE não está pronta para exportação.')
      return
    }
    setIsExporting(true)
    try {
      const safeMesAno = (appliedFilters.mesAno || new Date().toISOString().slice(0, 7)).replace(/[^0-9-]/g, '')
      const filename = `DRE_${safeMesAno}.pdf`
      const { blob } = await gerarPdfDoElemento(tabelaRef.current, filename)
      downloadBlob(blob, filename)
      toast.success(`DRE exportado: ${filename}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao exportar DRE')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="app-page app-page-loose">
      <PageHeader
        title="DRE"
        description="Consolide receitas, despesas e resultados no mesmo enquadramento visual do financeiro original."
      />

      {(dre.error || null) && (
        <Card className="rounded-integrallys-lg border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-4 text-sm text-[var(--app-danger-text)]">
          {dre.error}
        </Card>
      )}

      <Card className="rounded-[24px] border border-app-border bg-app-card p-6 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
        <div className="flex flex-wrap items-end gap-4">

          <div className="min-w-[150px] flex-1 space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Período</Label>
            <Select value={dreFilters.periodo} onValueChange={handlePeriodoChange}>
              <SelectTrigger className="h-11 rounded-xl border-app-border bg-app-bg-secondary text-sm font-medium dark:border-app-border-dark dark:bg-app-card-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Diário</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
              {isDiario ? 'Data' : 'Mês/Ano'}
            </Label>
            <div className="relative">
              <Input
                type={isDiario ? 'date' : 'month'}
                value={dreFilters.mesAno}
                onChange={(event) => setDreFilters((prev) => ({ ...prev, mesAno: event.target.value }))}
                className="h-11 rounded-xl border-app-border bg-app-bg-secondary pr-10 text-sm font-medium dark:border-app-border-dark dark:bg-app-card-dark"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={18} />
            </div>
          </div>

          {compareMode && (
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">
                {isDiario ? 'Data (comparar)' : 'Mês/Ano (comparar)'}
              </Label>
              <div className="relative">
                <Input
                  type={isDiario ? 'date' : 'month'}
                  value={dreFilters.comparar ?? ''}
                  onChange={(event) =>
                    setDreFilters((prev) => ({ ...prev, comparar: event.target.value || undefined }))
                  }
                  className="h-11 rounded-xl border-app-border bg-app-bg-secondary pr-10 text-sm font-medium dark:border-app-border-dark dark:bg-app-card-dark"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={18} />
              </div>
            </div>
          )}

          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Consolidação</Label>
            <Select
              value={dreFilters.unidade}
              disabled={Boolean(dre.scopedUnitId)}
              onValueChange={(value) => setDreFilters((prev) => ({ ...prev, unidade: value }))}
            >
              <SelectTrigger className="h-11 rounded-xl border-app-border bg-app-bg-secondary text-sm font-medium dark:border-app-border-dark dark:bg-app-card-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dre.unitOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px] flex-1 space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Visão</Label>
            <Select
              value={dreFilters.visao}
              onValueChange={(value) => setDreFilters((prev) => ({ ...prev, visao: value }))}
            >
              <SelectTrigger className="h-11 rounded-xl border-app-border bg-app-bg-secondary text-sm font-medium dark:border-app-border-dark dark:bg-app-card-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gerencial">Gerencial</SelectItem>
                <SelectItem value="contabil">Contábil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] flex-1 space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Tipo</Label>
            <Select
              value={dreFilters.tipo}
              onValueChange={(value) =>
                setDreFilters((prev) => ({ ...prev, tipo: value as DreFiltersInput['tipo'] }))
              }
            >
              <SelectTrigger className="h-11 rounded-xl border-app-border bg-app-bg-secondary text-sm font-medium dark:border-app-border-dark dark:bg-app-card-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label className="text-sm font-normal text-app-text-primary dark:text-white/80">Categoria</Label>
            <Select
              value={dreFilters.categoria}
              onValueChange={(value) => setDreFilters((prev) => ({ ...prev, categoria: value }))}
            >
              <SelectTrigger className="h-11 rounded-xl border-app-border bg-app-bg-secondary text-sm font-medium dark:border-app-border-dark dark:bg-app-card-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dre.categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={toggleCompareMode}
            aria-pressed={compareMode}
            className={`h-12 whitespace-nowrap rounded-xl px-6 font-normal ${
              compareMode ? 'border-app-primary text-app-primary' : ''
            }`}
          >
            {compareMode ? 'Comparando' : 'Comparar períodos'}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setCompareMode(false)
              setDreFilters(createClearedDreFilters())
            }}
            className="h-12 whitespace-nowrap rounded-xl px-6 font-normal"
          >
            Limpar filtros
          </Button>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex h-12 min-w-[180px] items-center gap-2 whitespace-nowrap rounded-xl bg-app-primary px-10 font-normal text-white shadow-lg shadow-[var(--app-primary)]/10 hover:bg-app-primary-hover"
          >
            {isGenerating ? (
              <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <BarChart3 size={20} className="shrink-0" />
            )}
            {isGenerating ? 'Gerando...' : 'Gerar DRE'}
          </Button>
        </div>
      </Card>

      {dre.comparativo && (
        <Card className="rounded-[24px] border border-app-border bg-app-card p-6 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-normal text-app-text-primary dark:text-white">Comparativo de períodos</h3>
              <p className="text-sm text-[var(--app-text-secondary)] dark:text-app-text-muted">
                Variação A vs B em receita bruta e lucro líquido.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Período A', res: dre.comparativo.periodoA, variacao: dre.comparativo.variacao },
              { label: 'Período B', res: dre.comparativo.periodoB, variacao: null as null | { receitaBruta: number; lucroLiquido: number } },
            ].map((coluna) => (
              <div
                key={coluna.label}
                className="rounded-2xl border border-app-border bg-app-bg-secondary p-6 dark:border-app-border-dark dark:bg-app-surface-muted"
              >
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-sm font-medium uppercase tracking-wide text-[var(--app-text-secondary)] dark:text-app-text-muted">
                    {coluna.label}
                  </span>
                  <span className="text-sm text-app-text-primary dark:text-white">
                    {formatReferenceLabel(coluna.res.label)}
                  </span>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--app-text-secondary)] dark:text-app-text-muted">Receita bruta</dt>
                    <dd className="flex items-center gap-3 text-app-text-primary dark:text-white">
                      <span>{formatCurrency(coluna.res.resumo.receitaBruta)}</span>
                      {coluna.variacao && <VariacaoBadge pct={coluna.variacao.receitaBruta} />}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--app-text-secondary)] dark:text-app-text-muted">Receita líquida</dt>
                    <dd className="text-app-text-primary dark:text-white">{formatCurrency(coluna.res.resumo.lucroBruto)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--app-text-secondary)] dark:text-app-text-muted">EBITDA</dt>
                    <dd className="text-app-text-primary dark:text-white">{formatCurrency(coluna.res.resumo.ebitda)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--app-text-secondary)] dark:text-app-text-muted">Lucro líquido</dt>
                    <dd className="flex items-center gap-3 text-app-text-primary dark:text-white">
                      <span>{formatCurrency(coluna.res.resumo.lucroLiquido)}</span>
                      {coluna.variacao && <VariacaoBadge pct={coluna.variacao.lucroLiquido} />}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-[24px] border border-app-border bg-app-card p-8 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
          <p className="mb-6 text-sm font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">Receita bruta</p>
          <p className="mb-2 text-3xl font-normal text-app-text-primary dark:text-white">{formatCurrency(receitaBruta)}</p>
          <p className="truncate text-xs text-[var(--app-text-secondary)] dark:text-app-text-muted">
            Total de entradas do {getPeriodLabel(appliedFilters.periodo)}
          </p>
        </Card>
        <Card className="rounded-[24px] border border-app-border bg-app-card p-8 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
          <p className="mb-6 text-sm font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">Receita líquida</p>
          <p className="mb-2 text-3xl font-normal text-app-text-primary dark:text-white">{formatCurrency(receitaLiquida)}</p>
          <p className="truncate text-xs text-[var(--app-text-secondary)] dark:text-app-text-muted">
            {receitaBruta > 0 ? `Margem de ${((receitaLiquida / receitaBruta) * 100).toFixed(1)}%` : 'Sem margem calculável'}
          </p>
        </Card>
        <Card className="rounded-[24px] border border-app-border bg-app-card p-8 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
          <p className="mb-6 text-sm font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">EBITDA</p>
          <p className="mb-2 text-3xl font-normal text-app-text-primary dark:text-white">{formatCurrency(ebitda)}</p>
          <p className="truncate text-xs text-[var(--app-text-secondary)] dark:text-app-text-muted">
            {receitaBruta > 0 ? `Margem de ${((ebitda / receitaBruta) * 100).toFixed(1)}%` : 'Sem margem calculável'}
          </p>
        </Card>
        <Card className="rounded-[24px] border border-app-border bg-app-card p-8 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark">
          <p className="mb-6 text-sm font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">Lucro líquido</p>
          <p className="mb-2 text-3xl font-normal text-app-text-primary dark:text-white">{formatCurrency(lucroLiquido)}</p>
          <p className="truncate text-xs text-[var(--app-text-secondary)] dark:text-app-text-muted">
            {receitaBruta > 0 ? `Margem líquida de ${((lucroLiquido / receitaBruta) * 100).toFixed(1)}%` : 'Sem margem líquida calculável'}
          </p>
        </Card>
      </div>

      <Card
        ref={tabelaRef}
        id="dre-tabela"
        className="overflow-hidden rounded-[24px] border border-app-border bg-app-card p-0 shadow-sm dark:border-app-border-dark dark:bg-app-card-dark"
      >
        <div className="border-b border-app-border p-8 dark:border-app-border-dark">
          <h3 className="mb-1 text-xl font-normal text-app-text-primary dark:text-white">Demonstrativo de resultados do exercício</h3>
          <p className="text-sm text-[var(--app-text-secondary)] dark:text-app-text-muted">
            {formatReferenceLabel(appliedFilters.mesAno)} - {String(dre.data?.filters.unidadeLabel ?? dre.unitOptions.find((option) => option.value === appliedFilters.unidade)?.label ?? 'Todas as unidades')}
          </p>
        </div>

        <div className="space-y-4 p-8">
          {dre.isLoading && (
            <p className="text-sm text-app-text-secondary dark:text-app-text-muted">Carregando DRE...</p>
          )}

          {!dre.isLoading &&
            dreItems.map((item) => (
              <div
                key={item.id}
                onClick={() => item.expandable && toggleDreItem(item.id)}
                className={`
                  relative cursor-pointer rounded-2xl border p-6 transition-all
                  ${item.type === 'result' ? 'border-[var(--app-primary)] bg-app-primary text-white shadow-lg shadow-[var(--app-primary)]/20' : ''}
                  ${item.type === 'summary' ? 'border-[#94A3B8]/20 bg-[#F1F5F9] dark:border-app-border-dark dark:bg-app-surface-muted' : ''}
                  ${['positive', 'negative', 'neutral'].includes(item.type) ? 'border-app-border bg-app-card hover:bg-app-bg-secondary dark:border-app-border-dark dark:bg-app-card-dark dark:hover:bg-app-hover' : ''}
                  ${item.type === 'total' ? 'border-[#94A3B8]/20 bg-[#F1F5F9] ring-1 ring-[#94A3B8]/10 dark:border-app-border-dark dark:bg-app-hover dark:ring-app-border-dark/60' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {item.expandable ? (
                      <ChevronRight
                        size={20}
                        className={`text-app-text-muted transition-transform duration-200 ${expandedDreItems.includes(item.id) ? 'rotate-90' : ''}`}
                      />
                    ) : (
                      <div className="w-5" />
                    )}

                    <div className={['total', 'summary', 'result'].includes(item.type) ? 'pl-2' : ''}>
                      <p className={`text-xl font-normal ${item.type === 'result' ? 'mb-0.5 text-lg text-white' : 'text-app-text-primary dark:text-white'}`}>
                        {item.label}
                      </p>
                      <div className="flex flex-col">
                        {item.sub && (
                          <p className={`text-sm ${item.type === 'result' ? 'text-white/70' : 'text-[var(--app-text-secondary)] dark:text-app-text-muted'}`}>
                            {item.sub}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-2xl font-normal ${
                        item.type === 'result'
                          ? 'text-3xl text-white'
                          : item.type === 'negative'
                            ? 'text-[var(--app-danger-text)]'
                            : 'text-app-text-primary dark:text-white'
                      }`}
                    >
                      {formatCurrencySigned(item.value)}
                    </p>
                  </div>
                </div>

                {item.sub2 && item.type === 'result' && (
                  <div className="mt-1 pl-14">
                    <p className="text-sm text-white/70">{item.sub2}</p>
                  </div>
                )}

                {item.expandable && expandedDreItems.includes(item.id) && item.details && item.details.length > 0 && (
                  <div className="animate-in slide-in-from-top-2 mt-6 space-y-3 border-t border-app-border pl-14 pt-6 fade-in dark:border-app-border-dark">
                    {item.details.map((detail, index) => (
                      <div key={`${item.id}-${index}`} className="flex items-center justify-between text-sm">
                        <span className="font-normal text-[var(--app-text-secondary)] dark:text-app-text-muted">{detail.label}</span>
                        <span className={`${item.type === 'negative' ? 'text-[var(--app-danger-text)]' : 'text-app-text-primary dark:text-white'} font-normal`}>
                          {formatCurrency(detail.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {!dre.isLoading && dreItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-app-border bg-app-bg-secondary/30 p-8 text-center text-sm text-app-text-muted dark:border-app-border-dark dark:bg-app-hover/20">
              Nenhum lançamento financeiro encontrado para montar a DRE neste período.
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-app-border bg-app-bg-secondary/30 p-8 dark:border-app-border-dark dark:bg-app-surface-muted sm:flex-row">
          <div className="space-y-1">
            <h4 className="text-lg font-normal text-app-text-primary dark:text-white">Exportar DRE</h4>
            <p className="text-sm text-[var(--app-text-secondary)] dark:text-app-text-muted">
              Baixe o demonstrativo para {formatReferenceLabel(appliedFilters.mesAno)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => void handleExportPdf()}
              disabled={isExporting || dre.isLoading || dreItems.length === 0}
              className="flex h-11 items-center whitespace-nowrap rounded-xl border-app-border px-6 font-normal text-app-text-primary hover:bg-app-card dark:border-app-border-dark dark:text-white dark:hover:bg-app-card/5"
            >
              {isExporting ? (
                <Loader2 size={18} className="mr-2 shrink-0 animate-spin" />
              ) : (
                <Download size={18} className="mr-2 shrink-0" />
              )}
              {isExporting ? 'Gerando PDF...' : 'Exportar PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info(`Exportação do DRE em XLSX para ${formatMonthYear(appliedFilters.mesAno)} disponível em breve.`)}
              className="flex h-11 items-center whitespace-nowrap rounded-xl border-app-border px-6 font-normal text-app-text-primary hover:bg-app-card dark:border-app-border-dark dark:text-white dark:hover:bg-app-card/5"
            >
              <FileText size={18} className="mr-2 shrink-0" /> Exportar XLSX
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
