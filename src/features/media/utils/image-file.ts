export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function isAcceptedImage(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type)
}

export function createPreviewUrl(file: File) {
  return URL.createObjectURL(file)
}

export async function canvasToImageFile(canvas: HTMLCanvasElement, fileName = 'camera-capture.jpg') {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))

  if (!blob) {
    throw new Error('Nao foi possivel gerar a imagem capturada.')
  }

  return new File([blob], fileName, { type: 'image/jpeg' })
}
