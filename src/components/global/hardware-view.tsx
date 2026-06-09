'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Camera, Loader2, Lock, Play, Printer, RefreshCw, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function readPreference(key: string) {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) ?? ''
}

function savePreference(key: string, value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : ''
}

function getErrorName(error: unknown) {
  return typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string'
    ? error.name
    : ''
}

export function HardwareView() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [cameraStatus, setCameraStatus] = useState<'undetected' | 'connected' | 'error'>('undetected')
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewResolution, setPreviewResolution] = useState('')
  const [cameraMessage, setCameraMessage] = useState('')
  const [printerProfile, setPrinterProfile] = useState('thermal_60x40')
  const [marginTop, setMarginTop] = useState('0')
  const [marginLeft, setMarginLeft] = useState('0')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const selectedCameraRef = useRef('')
  const isSecure = typeof window !== 'undefined' && window.isSecureContext

  const availableCameras = cameras.filter((camera) => camera.deviceId && camera.deviceId.trim() !== '')
  const selectedCameraLabel = availableCameras.find((camera) => camera.deviceId === selectedCamera)?.label || ''

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setPreviewResolution('')
    setIsStreaming(false)
  }, [])

  const syncPermissionState = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraPermission('unsupported')
      return
    }

    if (!navigator.permissions?.query) {
      setCameraPermission('unknown')
      return
    }

    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
      const update = () => setCameraPermission(result.state as 'prompt' | 'granted' | 'denied')
      update()
      result.onchange = update
    } catch {
      setCameraPermission('unknown')
    }
  }, [])

  const detectCameras = useCallback(async (requestLabels = false) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setCameraStatus('error')
      setCameraPermission('unsupported')
      setCameraMessage('Seu navegador não oferece suporte à API de câmera.')
      return
    }

    let tempStream: MediaStream | null = null

    try {
      if (requestLabels) {
        tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
        setCameraPermission('granted')
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const validDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .filter((device) => device.deviceId && device.deviceId.trim() !== '')

      setCameras(validDevices)

      if (validDevices.length > 0) {
        setCameraStatus('connected')
        setCameraMessage('Câmera pronta para uso.')

        const currentSelectedCamera = selectedCameraRef.current
        const stillExists = validDevices.some((device) => device.deviceId === currentSelectedCamera)
        if (!currentSelectedCamera || currentSelectedCamera === 'none' || !stillExists) {
          setSelectedCamera(validDevices[0].deviceId)
        }
      } else {
        setCameraStatus('undetected')
        setSelectedCamera('none')
        setCameraMessage('Nenhuma câmera disponível foi encontrada.')
      }
    } catch (error: unknown) {
      setCameraStatus('error')
      if (getErrorName(error) === 'NotAllowedError' || getErrorName(error) === 'PermissionDeniedError') {
        setCameraPermission('denied')
        setCameraMessage('Permissão de câmera negada. Libere o acesso para continuar.')
      } else {
        setCameraMessage('Não foi possível detectar as câmeras disponíveis.')
      }
    } finally {
      if (tempStream) {
        tempStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startSelectedCamera = useCallback(async (deviceId: string) => {
    const constraints: MediaStreamConstraints = deviceId && deviceId !== 'none'
      ? { video: { deviceId: { exact: deviceId } } }
      : { video: { facingMode: 'user' } }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    streamRef.current = stream

    const videoTrack = stream.getVideoTracks()[0]
    const settings = videoTrack?.getSettings()
    if (settings?.width && settings?.height) {
      setPreviewResolution(`${settings.width} x ${settings.height}`)
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.setAttribute('playsinline', 'true')
      await videoRef.current.play()
    }

    setCameraPermission('granted')
    setCameraStatus('connected')
    setCameraMessage('Preview ativo e câmera pronta para uso.')
    setIsStreaming(true)
  }, [])

  useEffect(() => {
    selectedCameraRef.current = selectedCamera
  }, [selectedCamera])

  useEffect(() => {
    const savedCamera = readPreference('pref_webcam_id')
    const savedPrinter = readPreference('pref_printer_profile')
    const savedMarginTop = readPreference('pref_print_margin_top')
    const savedMarginLeft = readPreference('pref_print_margin_left')

    if (savedCamera) setSelectedCamera(savedCamera)
    if (savedPrinter) setPrinterProfile(savedPrinter)
    if (savedMarginTop) setMarginTop(savedMarginTop)
    if (savedMarginLeft) setMarginLeft(savedMarginLeft)

    selectedCameraRef.current = savedCamera || ''

    void syncPermissionState()
    void detectCameras()

    const handleDeviceChange = () => {
      void detectCameras(false)
    }

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
      stopCamera()
    }
  }, [detectCameras, stopCamera, syncPermissionState])

  useEffect(() => {
    if (selectedCamera) {
      savePreference('pref_webcam_id', selectedCamera)
    }
  }, [selectedCamera])

  useEffect(() => {
    if (!isStreaming || !selectedCamera || selectedCamera === 'none') {
      return
    }

    const currentTrack = streamRef.current?.getVideoTracks?.()[0]
    const currentDeviceId = currentTrack?.getSettings?.().deviceId

    if (currentDeviceId === selectedCamera) {
      return
    }

    let cancelled = false

    const restartPreview = async () => {
      try {
        setIsLoading(true)
        stopCamera()
        await startSelectedCamera(selectedCamera)
        if (!cancelled) {
          toast.success('Preview atualizado para a câmera selecionada.')
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setCameraStatus('error')
          setCameraMessage(getErrorMessage(error) || 'Não foi possível trocar a câmera selecionada.')
          toast.error('Não foi possível trocar a câmera selecionada.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void restartPreview()

    return () => {
      cancelled = true
    }
  }, [isStreaming, selectedCamera, startSelectedCamera, stopCamera])

  const startCamera = async () => {
    if (isStreaming) {
      stopCamera()
      return
    }

    if (!isSecure) {
      toast.error('O acesso à câmera requer uma conexão segura (HTTPS).')
      return
    }

    setIsLoading(true)

    try {
      stopCamera()

      if (!selectedCamera || selectedCamera === 'none') {
        await detectCameras(true)
      }

      const targetCamera = selectedCamera && selectedCamera !== 'none'
        ? selectedCamera
        : availableCameras[0]?.deviceId

      if (!targetCamera) {
        toast.error('Nenhuma câmera selecionada ou disponível.')
        return
      }

      await startSelectedCamera(targetCamera)
      setSelectedCamera(targetCamera)
      await detectCameras(false)
      toast.success('Câmera iniciada com sucesso!')
    } catch (error: unknown) {
      setIsStreaming(false)

      if (getErrorName(error) === 'NotAllowedError' || getErrorName(error) === 'PermissionDeniedError') {
        setCameraPermission('denied')
        setCameraMessage('Permissão de câmera negada. Libere o acesso para continuar.')
        toast.error('Acesso à câmera negado. Clique no cadeado do navegador para permitir.', {
          duration: 6000,
        })
      } else if (getErrorName(error) === 'NotFoundError') {
        setCameraStatus('undetected')
        setCameraMessage('Dispositivo de câmera não encontrado.')
        toast.error('Dispositivo de câmera não encontrado.')
      } else {
        setCameraStatus('error')
        setCameraMessage(getErrorMessage(error) || 'Falha ao iniciar a câmera.')
        toast.error(`Erro ao acessar a webcam: ${getErrorMessage(error) || 'falha desconhecida'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePreferences = () => {
    savePreference('pref_printer_profile', printerProfile)
    savePreference('pref_print_margin_top', marginTop)
    savePreference('pref_print_margin_left', marginLeft)
    toast.success('Configurações de hardware salvas!')
  }

  const handlePrintTest = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=400')
    if (!printWindow) {
      toast.error('O bloqueador de pop-ups impediu a impressão de teste.')
      return
    }

    const printHtml = `
      <html>
        <head>
          <style>
            @page { size: ${printerProfile === 'thermal_60x40' ? '60mm 40mm' : 'A4'}; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; display: flex; align-items: flex-start; justify-content: flex-start; }
            .print-container {
              width: ${printerProfile === 'thermal_60x40' ? '60mm' : '210mm'};
              height: ${printerProfile === 'thermal_60x40' ? '40mm' : '297mm'};
              padding-top: ${marginTop}mm;
              padding-left: ${marginLeft}mm;
              box-sizing: border-box;
            }
            .label-content {
              border: 1px dashed #ccc;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              padding: 2mm;
              box-sizing: border-box;
              font-size: 8pt;
            }
            .header { font-weight: bold; font-size: 10pt; border-bottom: 0.5pt solid #000; margin-bottom: 1mm; }
            .info { margin-bottom: 2mm; }
            .test-text { font-size: 7pt; color: #666; }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="label-content">
              <div class="header">Teste de Impressão</div>
              <div class="info">
                <strong>Paciente:</strong> João da Silva Teste<br/>
                <strong>Perfil:</strong> ${printerProfile === 'thermal_60x40' ? 'Térmica 60x40mm' : 'Jato de Tinta A4'}<br/>
                <strong>Alinhamento:</strong> T: ${marginTop}mm | L: ${marginLeft}mm
              </div>
              <div class="test-text">Validando alinhamento e margens configuradas no sistema Integrallys.</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printHtml)
    printWindow.document.close()
  }

  return (
    <div className="app-page app-page-loose">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-app-primary" />
              <h3 className="text-lg font-normal text-app-text-primary dark:text-white">Webcam para atendimento</h3>
            </div>
            <p className="text-sm text-app-text-secondary dark:text-white/60 font-normal">Configure a câmera utilizada para captura de fotos de pacientes e telemedicina.</p>
          </div>
          <div className="flex items-center gap-2">
            {!isSecure && (
              <Badge className="app-status-warning font-normal px-3 py-1 rounded-full gap-1">
                <Lock className="w-3 h-3" /> Sem HTTPS
              </Badge>
            )}
            {cameraStatus === 'connected' ? (
              <Badge className="app-status-success font-normal px-3 py-1 rounded-full">Conectado</Badge>
            ) : cameraStatus === 'undetected' ? (
              <Badge className="app-status-danger">Dispositivo não detectado</Badge>
            ) : (
              <Badge className="app-status-warning">Erro de acesso</Badge>
            )}
            {cameraPermission === 'granted' && <Badge className="app-status-info">Permissão ok</Badge>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void detectCameras(true)}
              className="h-9 w-9 rounded-full hover:bg-app-hover dark:hover:bg-app-hover"
            >
              <RefreshCw className="h-4 w-4 text-app-text-muted" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-secondary dark:text-white/60">Selecione o dispositivo</Label>
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger className="h-11 rounded-xl bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark font-normal">
                  <SelectValue preferPlaceholder placeholder="Buscando câmeras..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId} className="font-normal text-sm">
                      {camera.label || `Câmera ${camera.deviceId.slice(0, 5)}`}
                    </SelectItem>
                  ))}
                  {availableCameras.length === 0 && <SelectItem value="none">Nenhuma câmera encontrada</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => void startCamera()}
                disabled={isLoading}
                className={`w-full h-11 rounded-xl font-normal gap-2 transition-all ${isStreaming ? 'app-status-danger' : 'bg-app-primary hover:bg-app-primary-hover'} text-white shadow-sm`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : isStreaming ? (
                  <>Parar preview</>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Iniciar / testar câmera
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div className="app-surface-muted rounded-xl p-3">
                <span className="mb-1 block text-app-text-muted">Câmera ativa</span>
                <span className="text-app-text-primary dark:text-white">{selectedCameraLabel || 'Nenhuma selecionada'}</span>
              </div>
              <div className="app-surface-muted rounded-xl p-3">
                <span className="mb-1 block text-app-text-muted">Preview</span>
                <span className="text-app-text-primary dark:text-white">{previewResolution || 'Aguardando inicialização'}</span>
              </div>
            </div>

            <div className="p-4 app-status-info rounded-xl border border-transparent">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-[var(--app-info-text)]" />
                <p className="text-xs font-normal leading-relaxed text-[var(--app-info-text)]">
                  {cameraMessage || 'A câmera selecionada será usada em todos os fluxos de atendimento do portal do especialista.'}
                </p>
              </div>
            </div>
          </div>

          <div className="relative aspect-video bg-app-bg-secondary dark:bg-app-surface-muted rounded-2xl overflow-hidden border border-app-border dark:border-app-border-dark flex items-center justify-center">
            {!isSecure && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-app-bg-secondary/90 dark:bg-app-bg-dark/80 text-center p-6 backdrop-blur-sm">
                <Lock className="mb-2 h-10 w-10 text-[var(--app-warning-text)]" />
                <h4 className="mb-1 font-normal text-app-text-primary dark:text-white">Conexão Não Segura</h4>
                <p className="text-sm text-app-text-secondary dark:text-white/60">A webcam requer HTTPS. Verifique suas configurações de servidor.</p>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
              style={{ transform: 'scaleX(-1)' }}
            />

            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-app-bg-secondary/50 dark:bg-app-bg-dark/50 backdrop-blur-sm">
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-app-primary" />
                <span className="text-sm font-medium text-app-primary dark:text-white">Iniciando câmera...</span>
              </div>
            )}

            {!isStreaming && !isLoading && (
              <div className="flex flex-col items-center gap-3 overflow-hidden text-app-text-muted">
                <Camera className="h-12 w-12 stroke-[1px]" />
                <span className="text-sm font-normal">Preview da câmera</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-app-border dark:bg-app-border-dark" />

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-app-primary" />
              <h3 className="text-lg font-normal text-app-text-primary dark:text-white">Impressora e etiquetas</h3>
            </div>
            <p className="text-sm text-app-text-secondary dark:text-white/60 font-normal">Gerencie perfis de impressão e ajustes finos de alinhamento.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-normal text-app-text-secondary dark:text-white/60">Perfil de impressão padrão</Label>
              <Select value={printerProfile} onValueChange={setPrinterProfile}>
                <SelectTrigger className="h-11 rounded-xl bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark font-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thermal_60x40" className="font-normal text-sm">Impressora térmica (60x40mm)</SelectItem>
                  <SelectItem value="a4_inkjet" className="font-normal text-sm">Jato de tinta / laser (a4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-normal text-app-text-secondary dark:text-white/60">Ajuste fino de margens (mm)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-app-text-muted dark:text-app-text-secondary font-normal">Margem superior</span>
                  <div className="relative">
                    <Input
                      type="number"
                      value={marginTop}
                      onChange={(event) => setMarginTop(event.target.value)}
                      className="h-11 rounded-xl bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark font-normal pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted text-xs font-normal">mm</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-app-text-muted dark:text-app-text-secondary font-normal">Margem esquerda</span>
                  <div className="relative">
                    <Input
                      type="number"
                      value={marginLeft}
                      onChange={(event) => setMarginLeft(event.target.value)}
                      className="h-11 rounded-xl bg-app-card dark:bg-app-card-dark border-app-border dark:border-app-border-dark font-normal pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted text-xs font-normal">mm</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handlePrintTest}
                className="w-full h-11 rounded-xl font-normal gap-2 border-[var(--app-primary)]/20 hover:bg-app-primary/5 dark:border-app-border-dark dark:hover:bg-app-hover dark:text-white"
              >
                <Printer className="h-4 w-4" />
                Imprimir página de teste
              </Button>
            </div>
          </div>

          <div className="bg-app-bg-secondary dark:bg-black/10 rounded-2xl p-6 border border-app-border dark:border-app-border-dark space-y-4">
            <div className="mb-2 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-app-text-muted" />
              <span className="text-sm font-normal text-app-text-secondary dark:text-white/60">Log de detecção</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-app-border/50 py-2 dark:border-app-border-dark">
                <span className="text-xs font-normal text-app-text-secondary">Sistema operacional</span>
                <span className="text-xs font-normal dark:text-white/70">Windows / macOS / Linux</span>
              </div>
              <div className="flex items-center justify-between border-b border-app-border/50 py-2 dark:border-app-border-dark">
                <span className="text-xs font-normal text-app-text-secondary">Drivers de impressão</span>
                <Badge className="app-status-success border-none font-normal text-xs px-2 py-0">Genérico / PCL</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-normal text-app-text-secondary">Resolução de preview</span>
                <span className="text-xs font-normal dark:text-white/70">1280 x 720 (HD)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 border-t border-app-border pt-6 dark:border-app-border-dark">
        <Button
          variant="outline"
          className="h-11 px-6 rounded-xl font-normal border-app-border dark:border-app-border-dark dark:text-white"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSavePreferences}
          className="h-11 px-10 rounded-xl bg-app-primary hover:bg-app-primary-hover text-white font-normal shadow-sm"
        >
          Salvar configurações
        </Button>
      </div>
    </div>
  )
}
