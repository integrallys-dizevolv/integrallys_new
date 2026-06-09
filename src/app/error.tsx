'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('APP_ROUTE_ERROR', error)
  }, [error])

  return (
    <main className="relative flex min-h-[calc(100vh-2rem)] items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_32%),linear-gradient(180deg,_rgba(248,250,252,0.9)_0%,_rgba(241,245,249,0.95)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_30%),linear-gradient(180deg,_rgba(11,18,32,0.96)_0%,_rgba(15,23,42,0.98)_100%)]" />
      <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-red-200/40 blur-3xl animate-in fade-in duration-700 dark:bg-red-500/10" />
      <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-orange-200/40 blur-3xl animate-pulse dark:bg-orange-500/10" />

      <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/60 bg-white/85 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500 dark:border-white/10 dark:bg-white/5 sm:p-10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--app-danger)] to-transparent" />

        <div className="flex flex-col items-center text-center">
          <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
            <Image
              src="/images/Integrallys-Logo.png"
              alt="Integrallys"
              width={180}
              height={56}
              className="h-12 w-auto sm:h-14"
              priority
            />
          </div>

          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/15 animate-in zoom-in duration-500">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-red-500 animate-in fade-in slide-in-from-top-2 duration-500">
            Oops
          </p>

          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-app-text-primary animate-in fade-in slide-in-from-bottom-2 duration-500 dark:text-white sm:text-5xl">
            Algo deu errado nesta area.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-app-text-muted animate-in fade-in slide-in-from-bottom-2 duration-700 dark:text-white/65 sm:text-base">
            Tivemos uma falha ao carregar esta pagina. Voce pode tentar novamente agora ou voltar para uma rota segura.
          </p>

          <div className="mt-4 w-full max-w-xl rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-left text-sm text-red-700 animate-in fade-in slide-in-from-bottom-2 duration-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {error.message || 'Erro inesperado na aplicacao.'}
          </div>

          <div className="mt-8 flex w-full flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700 sm:w-auto sm:flex-row">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-app-primary px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--app-primary)]/20 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-app-primary-hover"
            >
              <RefreshCcw className="h-4 w-4" />
              Tentar novamente
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-app-border bg-white/80 px-6 py-3 text-sm font-medium text-app-text-primary transition-colors duration-200 hover:bg-app-bg-secondary dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
