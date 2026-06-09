'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, MousePointer2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void
  onCancel: () => void
}

export function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
  }, [])

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    draw(event)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.beginPath()
  }

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const point = 'touches' in event ? event.touches[0] : event
    const x = point.clientX - rect.left
    const y = point.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)

    if (!hasSignature) {
      setHasSignature(true)
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSave = () => {
    if (!canvasRef.current || !hasSignature) return
    onSave(canvasRef.current.toDataURL('image/png'))
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-app-border bg-app-bg-secondary cursor-crosshair dark:border-app-border-dark dark:bg-app-surface-muted">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="block h-64 w-full"
          style={{ touchAction: 'none' }}
        />
        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-app-text-muted dark:text-app-text-muted">
            <MousePointer2 className="mb-2 h-8 w-8 opacity-20" />
            <p className="text-sm">Assine aqui</p>
          </div>
        )}
        {hasSignature && (
          <div className="pointer-events-none absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-[var(--app-success-bg)] px-2 py-1 text-xs font-medium text-[var(--app-success-text)]">
            <Check className="h-3 w-3" />
            Assinatura capturada
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onCancel} className="text-app-text-muted hover:text-app-text-primary dark:text-app-text-muted dark:hover:text-white">
          Cancelar
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={clear} disabled={!hasSignature} className="gap-2 border-app-border dark:border-app-border-dark">
            <RotateCcw className="h-4 w-4" /> Limpar
          </Button>
          <Button onClick={handleSave} disabled={!hasSignature} className="gap-2 bg-app-primary px-6 text-white hover:bg-app-primary-hover">
            <Check className="h-4 w-4" /> Confirmar Assinatura
          </Button>
        </div>
      </div>
    </div>
  )
}
