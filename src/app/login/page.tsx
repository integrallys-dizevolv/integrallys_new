"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useDarkMode } from "@/hooks/use-dark-mode";

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializeAuth = useAuth((state) => state.initialize);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [view, setView] = useState<"login" | "forgot-password">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const accessError =
    searchParams?.get("inactive") === "1"
      ? "Seu acesso está inativo ou removido. Procure um administrador."
      : "";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizeEmail(email), password }),
    });

    setIsLoading(false);

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({ error: "E-mail ou senha incorretos" }))) as {
          error?: string;
        };
      setError(body.error ?? "E-mail ou senha incorretos");
      return;
    }

    const hydrated = await initializeAuth(true);
    if (!hydrated) {
      setError("Login realizado, mas a sessão não pôde ser carregada.");
      return;
    }

    const redirectTo = new URLSearchParams(window.location.search).get(
      "redirectTo",
    );
    const firstSidebarHref = useAuth
      .getState()
      .sidebarItems.find((item) => item.type !== "category" && item.href)?.href;

    router.replace(
      redirectTo && redirectTo.startsWith("/")
        ? redirectTo
        : (firstSidebarHref ?? "/"),
    );
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("Recuperação de senha não disponível nesta versão.");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Painel esquerdo: imagem + identidade ── */}
      <div className="relative hidden shrink-0 flex-col justify-between md:flex md:w-[68%]">
        <Image
          src="/images/login-background.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-r from-transparent to-black/80" />

        <div className="relative z-10 p-10" />

        <div className="relative z-10 flex flex-col items-start px-10 pb-6">
          <Image
            src="/images/Integrallys-Logo.png"
            alt="Integrallys"
            width={320}
            height={104}
            className="h-20 w-auto brightness-0 invert"
            style={{ filter: "drop-shadow(0 2px 24px rgba(0,0,0,0.6)) brightness(0) invert(1)" }}
          />
        </div>

        <div className="relative z-10 p-10">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Integrallys. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ── Painel direito: formulário ── */}
      <div
        className={`
          relative flex flex-1 flex-col justify-center overflow-y-auto
          transition-colors duration-300
          ${isDarkMode ? "bg-[#0f172a]" : "bg-white"}
        `}
      >
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className={`
            absolute top-5 right-5
            flex h-10 w-10 items-center justify-center
            rounded-integrallys border shadow-sm
            transition-all duration-300 hover:shadow-md
            sm:top-6 sm:right-6
            ${isDarkMode
              ? "border-[#1e3a5f] bg-[#0f172a] text-white hover:bg-[#1e293b]"
              : "border-app-border bg-white text-[var(--app-text-primary)] hover:bg-app-bg-secondary"
            }
          `}
          title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
          aria-label={isDarkMode ? "Alternar para modo claro" : "Alternar para modo escuro"}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="mx-auto w-full max-w-[420px] px-4 py-10 sm:px-8">
          {/* Logo — só no mobile */}
          <div className="mb-6 flex justify-center md:hidden">
            <Image
              src="/images/Integrallys-Logo.png"
              alt="Integrallys"
              width={130}
              height={42}
              className="h-10 w-auto"
            />
          </div>

          {/* Título e subtítulo */}
          <div className="mb-6 space-y-1.5">
            <h2
              className={`text-xl font-normal tracking-tight transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#0f172a]"}`}
            >
              {view === "login" ? "Bem-vindo de volta" : "Recuperar senha"}
            </h2>
            <p
              className={`text-sm transition-colors duration-300 ${isDarkMode ? "text-[#99a1af]" : "text-[#6a7282]"}`}
            >
              {view === "login"
                ? "Faça login para acessar sua conta"
                : "Digite seu e-mail cadastrado e enviaremos instruções para recuperar sua senha."}
            </p>
          </div>

          {/* ── View: Login ── */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label
                  className={`text-sm transition-colors duration-300 ${isDarkMode ? "text-[#d1d5dc]" : "text-[var(--app-text-primary)]"}`}
                >
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-[#717182] transition-colors duration-300" />
                  <Input
                    type="email"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 pl-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className={`text-sm transition-colors duration-300 ${isDarkMode ? "text-[#d1d5dc]" : "text-[var(--app-text-primary)]"}`}
                >
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-[#717182] transition-colors duration-300" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pl-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#717182] transition-colors hover:text-[var(--app-text-primary)]"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="text-left">
                <button
                  type="button"
                  onClick={() => { setView("forgot-password"); setError(""); }}
                  className={`text-sm transition-colors duration-300 ${isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-[var(--app-primary)] hover:text-[#002D7A]"}`}
                >
                  Esqueci minha senha
                </button>
              </div>

              {(error || accessError) && (
                <div
                  className={`rounded-lg border p-3 ${isDarkMode ? "border-red-800 bg-red-900/20" : "app-status-danger border-transparent"}`}
                >
                  <p className={`text-center text-sm ${isDarkMode ? "text-red-400" : "text-[var(--app-danger-text)]"}`}>
                    {error || accessError}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          )}

          {/* ── View: Recuperar senha ── */}
          {view === "forgot-password" && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <button
                type="button"
                onClick={() => { setView("login"); setError(""); }}
                className={`flex items-center gap-2 text-sm transition-colors duration-300 ${isDarkMode ? "text-[#99a1af] hover:text-white" : "text-[#6a7282] hover:text-[var(--app-text-primary)]"}`}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para login
              </button>

              <div className="space-y-2">
                <label
                  className={`text-sm transition-colors duration-300 ${isDarkMode ? "text-[#d1d5dc]" : "text-[var(--app-text-primary)]"}`}
                >
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-[#717182] transition-colors duration-300" />
                  <Input
                    type="email"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 pl-11"
                  />
                </div>
              </div>

              {error && (
                <div
                  className={`rounded-lg border p-3 ${isDarkMode ? "border-red-800 bg-red-900/20" : "app-status-danger border-transparent"}`}
                >
                  <p className={`text-center text-sm ${isDarkMode ? "text-red-400" : "text-[var(--app-danger-text)]"}`}>
                    {error}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Enviando..." : "Enviar instruções"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
