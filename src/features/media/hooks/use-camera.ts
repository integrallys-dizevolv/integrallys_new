'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useCamera(storageKey = 'pref_webcam_id') {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [cameraStatus, setCameraStatus] = useState<'undetected' | 'connected' | 'error'>('undetected')
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewResolution, setPreviewResolution] = useState('')
  const [cameraMessage, setCameraMessage] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const selectedCameraRef = useRef('')
  const isSecure = typeof window !== 'undefined' && window.isSecureContext

  const availableCameras = useMemo(
    () => cameras.filter((camera) => camera.deviceId && camera.deviceId.trim() !== ''),
    [cameras]
  )

  const selectedCameraLabel = useMemo(
    () => availableCameras.find((camera) => camera.deviceId === selectedCamera)?.label || '',
    [availableCameras, selectedCamera]
  )

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
      setCameraMessage('Seu navegador nao oferece suporte a API de camera.')
      return [] as MediaDeviceInfo[]
    }

    let tempStream: MediaStream | null = null

    try {
      if (requestLabels) {
        tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
        setCameraPermission('granted')
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const validDevices = devices.filter((device) => device.kind === 'videoinput' && device.deviceId && device.deviceId.trim() !== '')

      setCameras(validDevices)

      if (validDevices.length > 0) {
        setCameraStatus('connected')
        setCameraMessage('Camera pronta para uso.')

        const currentSelectedCamera = selectedCameraRef.current
        const stillExists = validDevices.some((device) => device.deviceId === currentSelectedCamera)
        if (!currentSelectedCamera || currentSelectedCamera === 'none' || !stillExists) {
          setSelectedCamera(validDevices[0].deviceId)
        }
      } else {
        setCameraStatus('undetected')
        setSelectedCamera('none')
        setCameraMessage('Nenhuma camera disponivel foi encontrada.')
      }

      return validDevices
    } catch (error) {
      setCameraStatus('error')
      const permissionError =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
      if (permissionError) {
        setCameraPermission('denied')
        setCameraMessage('Permissao de camera negada. Libere o acesso para continuar.')
      } else {
        setCameraMessage('Nao foi possivel detectar as cameras disponiveis.')
      }
      return [] as MediaDeviceInfo[]
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
    setCameraMessage('Preview ativo e camera pronta para uso.')
    setIsStreaming(true)
  }, [])

  const startCamera = useCallback(async () => {
    if (isStreaming) {
      stopCamera()
      return
    }

    if (!isSecure) {
      throw new Error('O acesso a camera requer uma conexao segura (HTTPS) ou localhost.')
    }

    setIsLoading(true)
    try {
      stopCamera()
      let devices = availableCameras
      if (!selectedCamera || selectedCamera === 'none') {
        devices = await detectCameras(true)
      }

      const targetCamera = selectedCamera && selectedCamera !== 'none'
        ? selectedCamera
        : devices[0]?.deviceId

      if (!targetCamera) {
        throw new Error('Nenhuma camera selecionada ou disponivel.')
      }

      await startSelectedCamera(targetCamera)
      setSelectedCamera(targetCamera)
      await detectCameras(false)
      return targetCamera
    } finally {
      setIsLoading(false)
    }
  }, [availableCameras, detectCameras, isSecure, isStreaming, selectedCamera, startSelectedCamera, stopCamera])

  useEffect(() => {
    selectedCameraRef.current = selectedCamera
  }, [selectedCamera])

  useEffect(() => {
    const savedCamera = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) ?? '' : ''
    if (savedCamera) {
      setSelectedCamera(savedCamera)
      selectedCameraRef.current = savedCamera
    }

    syncPermissionState()
    detectCameras()

    const handleDeviceChange = () => {
      detectCameras(false)
    }

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
      stopCamera()
    }
  }, [detectCameras, stopCamera, storageKey, syncPermissionState])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, selectedCamera)
    }
  }, [selectedCamera, storageKey])

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
      } catch (error) {
        if (!cancelled) {
          setCameraStatus('error')
          const message = error instanceof Error ? error.message : 'Nao foi possivel trocar a camera selecionada.'
          setCameraMessage(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    restartPreview()
    return () => {
      cancelled = true
    }
  }, [isStreaming, selectedCamera, startSelectedCamera, stopCamera])

  return {
    videoRef,
    streamRef,
    cameras,
    availableCameras,
    selectedCamera,
    selectedCameraLabel,
    setSelectedCamera,
    cameraStatus,
    cameraPermission,
    isStreaming,
    isLoading,
    previewResolution,
    cameraMessage,
    isSecure,
    detectCameras,
    startCamera,
    startSelectedCamera,
    stopCamera,
  }
}
