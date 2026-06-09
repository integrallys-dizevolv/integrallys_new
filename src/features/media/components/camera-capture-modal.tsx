'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCamera } from '@/features/media/hooks/use-camera'
import { canvasToImageFile, createPreviewUrl } from '@/features/media/utils/image-file'
import type { MediaSelectionResult } from '@/features/media/types'

interface CameraCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (result: MediaSelectionResult) => void
}

export function CameraCaptureModal({ open, onOpenChange, onCapture }: CameraCaptureModalProps) {
  const {
    videoRef,
    availableCameras,
    selectedCamera,
    setSelectedCamera,
    cameraPermission,
    isStreaming,
    isLoading,
    previewResolution,
    cameraMessage,
    isSecure,
    detectCameras,
    startCamera,
    stopCamera,
  } = useCamera()
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!open) {
      setCapturedPreview(null)
      stopCamera()
      return
    }

    detectCameras(true).catch(() => undefined)
  }, [detectCameras, open, stopCamera])

  const handleStart = async () => {
    try {
      await startCamera()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel iniciar a camera.'
      toast.error(message)
    }
  }

  const handleCapture = async () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const context = canvas.getContext('2d')

    if (!context) {
      toast.error('Nao foi possivel capturar a imagem.')
      return
    }

    context.save()
    context.scale(-1, 1)
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    context.restore()

    try {
      const file = await canvasToImageFile(canvas)
      const previewUrl = createPreviewUrl(file)
      setCapturedPreview(previewUrl)
      stopCamera()
      onCapture({ file, previewUrl, source: 'camera' })
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel salvar a captura.'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0 overflow-hidden bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark rounded-[24px]">
        <div className="p-6 relative space-y-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 p-2 text-app-text-muted hover:text-app-text-primary dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-app-text-primary dark:text-white">Capturar foto</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[240px,1fr] gap-4">
            <div className="space-y-3">
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger>
                  <SelectValue preferPlaceholder placeholder="Selecione a câmera" />
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Câmera ${camera.deviceId.slice(0, 5)}`}
                    </SelectItem>
                  ))}
                  {availableCameras.length === 0 && <SelectItem value="none">Nenhuma câmera encontrada</SelectItem>}
                </SelectContent>
              </Select>

              <Button type="button" variant="outline" className="w-full" onClick={() => detectCameras(true)}>
                <RefreshCw className="h-4 w-4 mr-2" /> Atualizar câmeras
              </Button>

              <Button type="button" className="w-full" onClick={handleStart} disabled={isLoading || !isSecure}>
                <Camera className="h-4 w-4 mr-2" /> {isStreaming ? 'Reiniciar preview' : 'Iniciar preview'}
              </Button>

              <Button type="button" variant="outline" className="w-full" onClick={handleCapture} disabled={!isStreaming}>
                Capturar foto
              </Button>

              <div className="text-xs text-app-text-muted space-y-1">
                <p>Permissão: {cameraPermission}</p>
                <p>Preview: {previewResolution || 'Nao iniciado'}</p>
                <p>{cameraMessage}</p>
              </div>
            </div>

            <div className="relative aspect-video bg-app-bg-secondary dark:bg-app-surface-muted rounded-2xl overflow-hidden border border-app-border dark:border-app-border-dark flex items-center justify-center">
              {capturedPreview ? (
                <Image src={capturedPreview} alt="Captura" fill unoptimized className="object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {!isStreaming && (
                    <div className="flex flex-col items-center gap-3 text-app-text-muted overflow-hidden">
                      <Camera className="h-12 w-12 stroke-[1px]" />
                      <span className="text-sm font-normal">Preview da câmera</span>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
