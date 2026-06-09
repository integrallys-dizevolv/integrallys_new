'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'

const DEFAULT_PAGE_SIZE = 20

interface DataTableProps<T> {
  /** Array completo de dados. A paginação é feita internamente. */
  data: T[]
  /** Recebe a fatia da página atual e retorna o JSX da tabela completa
   *  (incluindo <Table>, <TableHeader>, <TableBody>). */
  children: (pageData: T[], startIndex: number) => React.ReactNode
  /** Quantidade de registros por página. Padrão: 20. */
  pageSize?: number
  /** Quando `data` muda (ex: filtro aplicado), volta para a página 1. Padrão: true. */
  resetOnDataChange?: boolean
  /** Classe CSS extra aplicada ao container externo. */
  className?: string
}

export function DataTable<T>({
  data,
  children,
  pageSize = DEFAULT_PAGE_SIZE,
  resetOnDataChange = true,
  className,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))

  // Volta para página 1 quando os dados mudam (filtro, busca, troca de aba)
  useEffect(() => {
    if (resetOnDataChange) setPage(1)
  }, [data, resetOnDataChange])

  // Garante que a página atual nunca ultrapasse o total após filtro reduzir dados
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, page, pageSize])

  const startIndex = (page - 1) * pageSize
  const from = data.length === 0 ? 0 : startIndex + 1
  const to = Math.min(startIndex + pageSize, data.length)

  return (
    <div className={className}>
      {/* Wrapper de overflow horizontal — tabelas largas não devem extravasar
          em viewports < 768px. Paginação fica fora para não scrollar junto. */}
      <div className="w-full overflow-x-auto">
        {children(pageData, startIndex)}
      </div>

      <div className="flex items-center justify-between border-t border-app-border px-6 py-4 dark:border-app-border-dark">
        <span className="text-sm text-app-text-muted">
          {data.length === 0
            ? 'Nenhum registro'
            : `${from}–${to} de ${data.length} registros`}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-app-border dark:border-app-border-dark"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="min-w-[80px] text-center text-sm text-app-text-secondary dark:text-white/60">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-app-border dark:border-app-border-dark"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
