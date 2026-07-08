'use client'

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import type { DocumentoTemplate } from '@/lib/documentos'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useApi } from '@/hooks/use-api'
import { DocumentPreview, type PreenchimentoContexto } from '@/features/documentacao-gerar'

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

interface MeResponse {
  user: { id: string; name: string }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: DocumentoTemplate | null
}

const SAMPLE_CLIENTE = {
  nome: 'Maria Aparecida da Silva',
  cpf: '123.456.789-00',
}

const SAMPLE_AGENDAMENTO = {
  data_hora: new Date().toISOString(),
}

export function VisualizarTemplateModal({ open, onOpenChange, template }: Props) {
  const api = useApi()
  const [contexto, setContexto] = useState<PreenchimentoContexto>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !template) return
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const [clinicaRes, meRes] = await Promise.all([
          api.get<ClinicaResponse>('/api/clinica-config').catch(() => ({ data: null })),
          api.get<MeResponse>('/api/auth/me').catch(() => ({ user: null })),
        ])
        if (!mounted) return
        const c = clinicaRes.data
        setContexto({
          cliente: SAMPLE_CLIENTE,
          agendamento: SAMPLE_AGENDAMENTO,
          profissional: meRes.user
            ? { nome: meRes.user.name }
            : { nome: 'Profissional responsável' },
          clinica: c
            ? {
                nome: c.nome ?? '',
                cidade_uf: c.cidade_uf ?? '',
                endereco: c.endereco ?? '',
                cep: c.cep ?? '',
                telefone: c.telefone ?? '',
                logo_url: c.logo_url ?? null,
                cor_primaria: c.cor_primaria ?? '#111827',
              }
            : undefined,
        })
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [open, template, api])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex flex-col rounded-[24px] p-0">
        <div className="px-8 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-app-text-secondary dark:text-white/70" />
              Pré-visualizar template
            </DialogTitle>
            <DialogDescription>
              {template ? (
                <>
                  Modelo <strong>{template.nome}</strong> renderizado com dados de exemplo do
                  paciente. Variáveis automáticas (logo, dados da clínica, profissional, data) usam
                  a configuração real desta unidade.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto bg-app-bg-secondary dark:bg-app-hover/20 p-6">
          {isLoading || !template ? (
            <p className="text-sm text-app-text-secondary dark:text-white/60 text-center py-10">
              Carregando pré-visualização...
            </p>
          ) : (
            <div className="mx-auto" style={{ maxWidth: '210mm' }}>
              <DocumentPreview template={template} valores={{}} contexto={contexto} />
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-4 border-t border-app-border dark:border-app-border-dark bg-app-card dark:bg-app-card-dark">
          <Button
            variant="outline"
            className="rounded-xl border-app-border dark:border-app-border-dark"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
