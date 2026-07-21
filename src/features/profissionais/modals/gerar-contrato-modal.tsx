'use client'

import { Download, FileText, Loader2, Printer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DocumentPreview,
  downloadBlob,
  gerarPdfDoElemento,
  type PreenchimentoContexto,
} from '@/features/documentacao-gerar'
import { useApi } from '@/hooks/use-api'
import type { DocumentoTemplate, TemplateConteudo } from '@/lib/documentos'
import type { ProfissionalItem } from '@/types/profissional'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  profissional: ProfissionalItem | null
  /** Templates tipo `contrato` ativos já carregados pela listagem. */
  templates: DocumentoTemplate[]
  /** Quando só há 1 template, a view pode pedir geração automática ao abrir. */
  autoGenerate?: boolean
}

interface GerarContratoResponse {
  data: {
    id: string
    template_id: string
    conteudo_preenchido: TemplateConteudo
    template_nome: string
    profissional_nome: string
    pdf_url: string | null
  }
}

interface ClinicaResponse {
  data: {
    nome?: string
    cidade_uf?: string | null
    endereco?: string | null
    cep?: string | null
    telefone?: string | null
    logo_url?: string | null
    cor_primaria?: string
  } | null
}

type Step = 'select' | 'preview'

export function GerarContratoModal({
  open,
  onOpenChange,
  profissional,
  templates,
  autoGenerate = false,
}: Props) {
  const api = useApi()
  const previewRef = useRef<HTMLDivElement>(null)
  const autoStartedRef = useRef(false)

  const [step, setStep] = useState<Step>('select')
  const [templateId, setTemplateId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [generated, setGenerated] = useState<GerarContratoResponse['data'] | null>(null)
  const [clinica, setClinica] = useState<PreenchimentoContexto['clinica']>(undefined)

  const reset = useCallback(() => {
    setStep('select')
    setTemplateId(templates.length === 1 ? templates[0].id : '')
    setIsGenerating(false)
    setIsDownloading(false)
    setGenerated(null)
  }, [templates])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    setTemplateId(templates.length === 1 ? templates[0].id : '')
    setStep('select')
    setGenerated(null)

    let mounted = true
    void (async () => {
      try {
        const res = await api.get<ClinicaResponse>('/api/clinica-config')
        if (!mounted) return
        setClinica({
          nome: res.data?.nome ?? undefined,
          cidade_uf: res.data?.cidade_uf ?? undefined,
          endereco: res.data?.endereco ?? undefined,
          cep: res.data?.cep ?? undefined,
          telefone: res.data?.telefone ?? undefined,
          logo_url: res.data?.logo_url ?? null,
          cor_primaria: res.data?.cor_primaria,
        })
      } catch {
        // Preview sem dados da clínica ainda funciona.
      }
    })()
    return () => {
      mounted = false
    }
  }, [open, templates, api, reset])

  const gerar = useCallback(
    async (id: string) => {
      if (!profissional || !id) return
      setIsGenerating(true)
      try {
        const res = await api.post<GerarContratoResponse>(
          `/api/profissionais/${encodeURIComponent(profissional.id)}/gerar-contrato`,
          { templateId: id },
        )
        setGenerated(res.data)
        setStep('preview')
        toast.success('Contrato gerado com sucesso.')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Não foi possível gerar o contrato.')
      } finally {
        setIsGenerating(false)
      }
    },
    [api, profissional],
  )

  // Um único modelo: gera direto ao abrir (quando a view pede autoGenerate).
  // Ref evita double-fire do Strict Mode criando dois snapshots.
  useEffect(() => {
    if (!open) {
      autoStartedRef.current = false
      return
    }
    if (!autoGenerate || !profissional) return
    if (templates.length !== 1) return
    if (autoStartedRef.current || generated || isGenerating) return
    autoStartedRef.current = true
    void gerar(templates[0].id)
  }, [open, autoGenerate, profissional, templates, generated, isGenerating, gerar])

  const previewTemplate = useMemo((): DocumentoTemplate | null => {
    if (!generated) return null
    const base = templates.find((t) => t.id === generated.template_id)
    return {
      id: generated.template_id,
      unidade_id: base?.unidade_id ?? '',
      slug: base?.slug ?? 'contrato',
      nome: generated.template_nome,
      tipo: 'contrato',
      conteudo: generated.conteudo_preenchido,
      ativo: true,
      editavel_pelo_especialista: base?.editavel_pelo_especialista ?? false,
      disponivel_portal_paciente: false,
      created_at: base?.created_at ?? '',
      updated_at: base?.updated_at ?? '',
    }
  }, [generated, templates])

  const contexto: PreenchimentoContexto = useMemo(
    () => ({
      profissional: profissional
        ? { nome: profissional.nome, conselho: profissional.conselho }
        : undefined,
      clinica,
    }),
    [profissional, clinica],
  )

  const handleImprimir = useCallback(() => {
    if (!previewRef.current) return
    const printContent = previewRef.current.outerHTML
    const win = window.open('', '_blank', 'width=900,height=1200')
    if (!win) {
      toast.error('Habilite pop-ups para imprimir')
      return
    }
    win.document.write(
      `<!doctype html><html><head><title>Contrato</title></head><body style="margin:0">${printContent}</body></html>`,
    )
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      win.close()
    }, 300)
  }, [])

  const handleDownload = useCallback(async () => {
    if (!previewRef.current || !profissional) return
    setIsDownloading(true)
    try {
      const nome = generated?.template_nome?.replace(/[^\w\- ]+/g, '').trim() || 'contrato'
      const { blob, filename } = await gerarPdfDoElemento(
        previewRef.current,
        `${nome}-${profissional.nome}.pdf`,
      )
      downloadBlob(blob, filename)
      if (generated?.id) {
        try {
          const form = new FormData()
          form.append('file', blob, filename)
          await fetch(`/api/documentos/pdf/${encodeURIComponent(generated.id)}`, {
            method: 'POST',
            credentials: 'include',
            body: form,
          })
        } catch {
          // Download local ok mesmo se o upload do PDF falhar.
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao gerar PDF')
    } finally {
      setIsDownloading(false)
    }
  }, [profissional, generated])

  const title =
    step === 'preview'
      ? (generated?.template_nome ?? 'Contrato gerado')
      : 'Gerar contrato de parceria'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="2xl"
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[24px] border border-app-border bg-app-card p-0 shadow-lg dark:border-app-border-dark dark:bg-app-card-dark"
      >
        <DialogHeader className="space-y-1 border-b border-app-border px-6 py-5 text-left dark:border-app-border-dark">
          <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="font-normal text-app-text-secondary dark:text-white/60">
            {profissional
              ? `Profissional: ${profissional.nome}`
              : 'Selecione o modelo e gere o contrato com dados e repasse do parceiro.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {step === 'select' && (
            <div className="space-y-4">
              {templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-app-border px-4 py-10 text-center text-sm text-app-text-secondary dark:border-app-border-dark dark:text-white/60">
                  Nenhum modelo de contrato cadastrado. Crie um em{' '}
                  <strong>Configurações → Templates de Documentos</strong> com tipo{' '}
                  <strong>Contrato</strong>.
                </div>
              ) : isGenerating && autoGenerate && templates.length === 1 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-app-text-secondary dark:text-white/60">
                  <Loader2 className="h-8 w-8 animate-spin text-app-primary" />
                  Gerando contrato…
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-[var(--app-text-primary)] dark:text-white">
                      Modelo de contrato
                    </Label>
                    <Select value={templateId} onValueChange={setTemplateId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Selecione o modelo…" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-app-text-muted">
                    O documento usa os dados cadastrais e a regra de repasse ativa deste
                    profissional. Variáveis como{' '}
                    <code className="text-[11px]">#PROFISSIONAL_NOME#</code> e{' '}
                    <code className="text-[11px]">#REPASSE_PERCENTUAL#</code> são preenchidas
                    automaticamente.
                  </p>
                </>
              )}
            </div>
          )}

          {step === 'preview' && previewTemplate && (
            <div className="overflow-x-auto rounded-xl bg-app-bg-secondary p-4 dark:bg-app-hover/20">
              <div className="mx-auto" style={{ maxWidth: '210mm' }}>
                <DocumentPreview
                  ref={previewRef}
                  template={previewTemplate}
                  valores={{}}
                  contexto={contexto}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-app-border px-6 py-4 dark:border-app-border-dark sm:justify-between">
          <Button
            variant="outline"
            className="rounded-xl border-app-border font-normal dark:border-app-border-dark"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Fechar
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {step === 'select' &&
              templates.length > 0 &&
              !(autoGenerate && templates.length === 1) && (
                <Button
                  className="rounded-xl bg-app-primary font-normal text-white"
                  disabled={!templateId || isGenerating || !profissional}
                  onClick={() => void gerar(templateId)}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando…
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Gerar contrato
                    </>
                  )}
                </Button>
              )}
            {step === 'preview' && (
              <>
                <Button
                  variant="outline"
                  className="rounded-xl border-app-border font-normal dark:border-app-border-dark"
                  onClick={handleImprimir}
                  disabled={isDownloading}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  className="rounded-xl bg-app-primary font-normal text-white"
                  onClick={() => void handleDownload()}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Baixar PDF
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
