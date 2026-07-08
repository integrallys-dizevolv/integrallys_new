"use client"

import { useEffect } from "react"

import { AppErrorScreen } from "@/components/global/app-error-screen"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("APP_GLOBAL_ERROR", error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body>
        <AppErrorScreen
          title="O aplicativo encontrou uma falha inesperada"
          description="A sessão continua segura, mas esta parte da aplicação não conseguiu ser carregada. Tente novamente ou volte ao início."
          onRetry={reset}
        />
      </body>
    </html>
  )
}
