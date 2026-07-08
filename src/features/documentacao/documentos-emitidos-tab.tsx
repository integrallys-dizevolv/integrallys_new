'use client'

import { useMemo, useState } from 'react'
import { Download, ExternalLink, FileText, MessageCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDocumentosEmitidos } from './hooks/use-documentos-emitidos'
import type { DocumentoEmitidoItem } from './hooks/use-documentos-emitidos'

function formatarDataHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const TIPO_LABEL: Record<string, string> = {
  formulario: 'Formulário',
  declaracao: 'Declaração',
  laudo: 'Laudo',
  encaminhamento: 'Encaminhamento',
  procedimento: 'Procedimento',
  dieta: 'Dieta',
}

export function DocumentosEmitidosTab() {
  const { data, templates, isLoading, error, filtros, setFiltros } = useDocumentosEmitidos()
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return data
    return data.filter((item) => {
      return (
        item.paciente_nome.toLowerCase().includes(term) ||
        item.template_nome.toLowerCase().includes(term) ||
        item.profissional_nome.toLowerCase().includes(term)
      )
    })
  }, [data, searchTerm])

  const handleWhatsapp = (doc: DocumentoEmitidoItem) => {
    const mensagem = doc.pdf_url
      ? `Olá ${doc.paciente_nome}, segue o link do documento "${doc.template_nome}": ${doc.pdf_url}`
      : `Olá ${doc.paciente_nome}, seu documento "${doc.template_nome}" está disponível no portal.`
    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px_180px_180px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por paciente, documento ou profissional..."
            className="h-11 pl-9 bg-app-bg-secondary border-app-border dark:bg-app-hover dark:border-app-border-dark rounded-xl"
          />
        </div>
        <Select
          value={filtros.templateId ?? 'todos'}
          onValueChange={(value) =>
            setFiltros((prev) => ({ ...prev, templateId: value === 'todos' ? null : value }))
          }
        >
          <SelectTrigger className="h-11 bg-app-bg-secondary border-app-border dark:bg-app-hover dark:border-app-border-dark rounded-xl">
            <SelectValue placeholder="Todos os modelos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os modelos</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filtros.desde ?? ''}
          onChange={(event) =>
            setFiltros((prev) => ({ ...prev, desde: event.target.value || null }))
          }
          placeholder="Desde"
          className="h-11 bg-app-bg-secondary border-app-border dark:bg-app-hover dark:border-app-border-dark rounded-xl"
        />
        <Input
          type="date"
          value={filtros.ate ?? ''}
          onChange={(event) =>
            setFiltros((prev) => ({ ...prev, ate: event.target.value || null }))
          }
          placeholder="Até"
          className="h-11 bg-app-bg-secondary border-app-border dark:bg-app-hover dark:border-app-border-dark rounded-xl"
        />
      </div>

      <div className="rounded-[20px] border border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark overflow-hidden">
        {error && <div className="p-4 text-sm text-[var(--app-danger-text)]">{error}</div>}
        {isLoading && (
          <div className="p-6 text-sm text-app-text-secondary dark:text-white/60">
            Carregando documentos...
          </div>
        )}

        {!isLoading && filtered.length === 0 && !error && (
          <div className="p-10 text-center text-sm text-app-text-secondary dark:text-white/60">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhum documento emitido nos critérios selecionados.
          </div>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-app-bg-secondary dark:bg-app-hover/60">
                <tr className="text-left">
                  {['Documento', 'Paciente', 'Profissional', 'Emitido em', 'Portal', 'Ações'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-sm font-normal text-app-text-secondary dark:text-white/70"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t border-app-border dark:border-app-border-dark hover:bg-app-bg-secondary/40 dark:hover:bg-app-hover/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-app-bg-secondary dark:bg-app-hover flex items-center justify-center">
                          <FileText className="h-4 w-4 text-app-text-secondary dark:text-white/70" />
                        </div>
                        <div>
                          <div className="text-sm font-medium dark:text-white">
                            {doc.template_nome}
                          </div>
                          <div className="text-xs text-app-text-muted capitalize">
                            {TIPO_LABEL[doc.template_tipo] ?? doc.template_tipo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-white/80">{doc.paciente_nome}</td>
                    <td className="px-4 py-3 text-sm text-app-text-secondary dark:text-white/70">
                      {doc.profissional_nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-app-text-secondary dark:text-white/70">
                      {formatarDataHora(doc.gerado_em)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {doc.disponivel_no_portal ? (
                        <span className="text-app-primary">Sim</span>
                      ) : (
                        <span className="text-app-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {doc.pdf_url && (
                          <>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Baixar PDF"
                            >
                              <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Abrir"
                            >
                              <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Enviar WhatsApp"
                          onClick={() => handleWhatsapp(doc)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
