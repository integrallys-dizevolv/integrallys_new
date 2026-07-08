'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, ExternalLink, QrCode } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SegmentedControl } from '@/components/shared/segmented-control'
import { useApi } from '@/hooks/use-api'

interface CobrarOnlineModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  agendamentoId?: string
  lancamentoId?: string
  valor: number
  descricao: string
}

type Metodo = 'pix' | 'cartao_credito' | 'cartao_debito'

interface GerarResponse {
  pagamentoId?: string
  qrCode?: string
  qrCodeCopiaECola?: string
  linkPagamento?: string
  error?: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function CobrarOnlineModal({
  isOpen,
  onClose,
  agendamentoId,
  lancamentoId,
  valor,
  descricao,
}: CobrarOnlineModalProps) {
  const api = useApi()
  const [metodo, setMetodo] = useState<Metodo>('pix')
  const [parcelas, setParcelas] = useState('1')
  const [isGenerating, setIsGenerating] = useState(false)
  const [pagamentoId, setPagamentoId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [copiaCola, setCopiaCola] = useState('')
  const [link, setLink] = useState('')
  const [status, setStatus] = useState<'idle' | 'pendente' | 'pago' | 'expirado'>('idle')
  const [secondsLeft, setSecondsLeft] = useState(60 * 60)
  // UI-20: feedback inline pro botão "Copiar" do Pix copia-e-cola (auto-reset em 2s).
  const [pixCopied, setPixCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const reset = useCallback(() => {
    setMetodo('pix')
    setParcelas('1')
    setIsGenerating(false)
    setPagamentoId(null)
    setQrCode('')
    setCopiaCola('')
    setLink('')
    setStatus('idle')
    setSecondsLeft(60 * 60)
    setPixCopied(false)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isOpen) reset()
  }, [isOpen, reset])

  // Polling de status a cada 10s enquanto pendente.
  useEffect(() => {
    if (!pagamentoId || status !== 'pendente') return
    const interval = setInterval(async () => {
      try {
        const res = await api.post<{ status: string }>('/api/pagamentos/online', {
          action: 'consultar',
          pagamentoOnlineId: pagamentoId,
        })
        if (res.status === 'capturado') {
          setStatus('pago')
          toast.success('Pagamento confirmado! ✅')
          setTimeout(() => onClose(false), 1500)
        } else if (res.status === 'cancelado') {
          setStatus('expirado')
        }
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }, 10_000)
    pollRef.current = interval
    return () => clearInterval(interval)
  }, [pagamentoId, status, api, onClose])

  // Contagem regressiva (apenas Pix).
  useEffect(() => {
    if (status !== 'pendente' || metodo !== 'pix') return
    const tick = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setStatus('expirado')
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [status, metodo])

  const handleGerar = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const res = await api.post<GerarResponse>('/api/pagamentos/online', {
        action: 'gerar_cobranca',
        gateway: metodo === 'pix' ? 'sicredi' : 'cielo',
        tipo: metodo,
        agendamentoId,
        lancamentoId,
        valor,
        descricao,
        parcelas: metodo === 'pix' ? undefined : Number(parcelas),
      })
      if (res.error || !res.pagamentoId) {
        toast.error(res.error ?? 'Não foi possível gerar a cobrança.')
        return
      }
      setPagamentoId(res.pagamentoId)
      setQrCode(res.qrCode ?? '')
      setCopiaCola(res.qrCodeCopiaECola ?? '')
      setLink(res.linkPagamento ?? '')
      setStatus('pendente')
      setSecondsLeft(60 * 60)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao gerar cobrança')
    } finally {
      setIsGenerating(false)
    }
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copiado!')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  // UI-20: copy do Pix com feedback inline (ícone Check + texto "Copiado!" 2s).
  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(copiaCola)
      setPixCopied(true)
      setTimeout(() => setPixCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  const statusBadge = () => {
    if (status === 'pago') {
      return <span className="rounded-full bg-[var(--app-success-bg)] px-3 py-1 text-xs font-medium text-[var(--app-success-text)]">Pago</span>
    }
    if (status === 'expirado') {
      return <span className="rounded-full bg-[var(--app-danger-bg)] px-3 py-1 text-xs font-medium text-[var(--app-danger-text)]">Expirado</span>
    }
    if (status === 'pendente') {
      return <span className="rounded-full bg-[var(--app-warning-bg)] px-3 py-1 text-xs font-medium text-[var(--app-warning-text)]">Pendente</span>
    }
    return null
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[var(--app-primary)]" />
            Cobrar online — {formatCurrency(valor)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <SegmentedControl
            options={[
              { value: 'pix', label: 'Pix' },
              { value: 'cartao_credito', label: 'Crédito' },
              { value: 'cartao_debito', label: 'Débito' },
            ]}
            value={metodo}
            onChange={(value) => {
              setMetodo(value as Metodo)
              setStatus('idle')
              setPagamentoId(null)
              setQrCode('')
              setCopiaCola('')
              setLink('')
            }}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">{descricao}</span>
            {statusBadge()}
          </div>

          {metodo === 'pix' ? (
            <div className="space-y-3">
              {status === 'idle' && (
                <Button
                  onClick={() => void handleGerar()}
                  disabled={isGenerating}
                  className="h-11 w-full rounded-xl bg-app-primary text-white hover:bg-app-primary-hover"
                >
                  {isGenerating ? 'Gerando...' : 'Gerar QR Code'}
                </Button>
              )}
              {status !== 'idle' && (
                <div className="space-y-3">
                  {qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code Pix"
                      className="mx-auto h-48 w-48 rounded-xl border border-app-border dark:border-app-border-dark"
                    />
                  ) : (
                    <p className="rounded-xl border border-dashed border-app-border p-3 text-center text-xs text-app-text-secondary dark:border-app-border-dark dark:text-white/60">
                      QR Code não disponível — use o código copia e cola abaixo.
                    </p>
                  )}
                  {copiaCola && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-app-text-secondary dark:text-white/70">Pix copia e cola</span>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={copiaCola}
                          className="h-10 flex-1 rounded-xl border border-app-border bg-app-bg-secondary px-3 text-xs dark:border-app-border-dark dark:bg-app-hover"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleCopyPix()}
                          className="h-10 shrink-0 gap-2 rounded-xl"
                        >
                          {pixCopied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {pixCopied ? 'Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {status === 'pendente' && (
                    <p className="text-center text-xs text-app-text-muted dark:text-white/40">
                      Expira em {mm}:{ss}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-sm font-medium text-app-text-secondary dark:text-white/70">Parcelas</span>
                <Select value={parcelas} onValueChange={setParcelas} disabled={metodo === 'cartao_debito'}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}×
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {status === 'idle' ? (
                <Button
                  onClick={() => void handleGerar()}
                  disabled={isGenerating}
                  className="h-11 w-full rounded-xl bg-app-primary text-white hover:bg-app-primary-hover"
                >
                  {isGenerating ? 'Gerando...' : 'Gerar link'}
                </Button>
              ) : (
                link && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={link}
                        className="h-10 flex-1 rounded-xl border border-app-border bg-app-bg-secondary px-3 text-xs dark:border-app-border-dark dark:bg-app-hover"
                      />
                      <Button variant="outline" className="h-10 rounded-xl" onClick={() => void copy(link)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 w-full rounded-xl"
                      onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir no navegador
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
