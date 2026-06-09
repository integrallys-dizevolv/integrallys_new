"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type AppErrorScreenProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showBackToHome?: boolean;
};

export function AppErrorScreen({
  title = "Algo saiu do fluxo esperado",
  description = "Encontramos uma falha ao carregar esta página. Você pode tentar novamente agora ou voltar para a tela inicial.",
  onRetry,
  showBackToHome = true,
}: AppErrorScreenProps) {
  return (
    <main className="relative flex min-h-[calc(100vh-2rem)] items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_32%),linear-gradient(180deg,_rgba(248,250,252,0.9)_0%,_rgba(241,245,249,0.95)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_30%),linear-gradient(180deg,_rgba(11,18,32,0.96)_0%,_rgba(15,23,42,0.98)_100%)]" />
      <div className="absolute right-0 top-0 h-48 w-48 animate-in fade-in rounded-full bg-red-200/40 blur-3xl duration-700 dark:bg-red-500/10" />
      <div className="absolute bottom-0 left-0 h-56 w-56 animate-pulse rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-500/10" />

      <section className="animate-in fade-in zoom-in-95 duration-500 relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/60 bg-white/85 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--app-danger-text)] to-transparent" />

        <div className="flex flex-col items-center text-center">
          <div className="animate-in fade-in slide-in-from-top-2 duration-500 mb-8">
            <Image
              src="/images/Integrallys-Logo.png"
              alt="Integrallys"
              width={180}
              height={56}
              className="h-12 w-auto sm:h-14"
              priority
            />
          </div>

          <div className="animate-in zoom-in duration-500 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/15">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <p className="animate-in fade-in slide-in-from-top-2 duration-500 mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-red-500">
            Oops
          </p>

          <h1 className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-3xl font-semibold tracking-[-0.03em] text-app-text-primary dark:text-white sm:text-5xl">
            {title}
          </h1>

          <p className="animate-in fade-in slide-in-from-bottom-2 duration-700 mt-5 max-w-xl text-sm leading-7 text-app-text-muted dark:text-white/65 sm:text-base">
            {description}
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {onRetry ? (
              <Button
                onClick={onRetry}
                className="rounded-2xl px-6 py-3 text-sm font-medium shadow-lg shadow-[var(--app-primary)]/20 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            ) : null}

            {showBackToHome ? (
              <Button
                asChild
                variant="outline"
                className="rounded-2xl border-app-border bg-white/80 px-6 py-3 text-sm font-medium text-app-text-primary transition-colors duration-200 hover:bg-app-bg-secondary dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao início
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
