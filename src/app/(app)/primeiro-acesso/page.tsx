'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApi } from '@/hooks/use-api'
import { useAuth } from '@/hooks/use-auth'

export default function PrimeiroAcessoPage() {
  const router = useRouter()
  const api = useApi()
  const { user, initialize } = useAuth()
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    setIsSubmitting(true)

    try {
      await api.put<{ data: { success: boolean } }>('/api/auth/password', {
        currentPassword: '',
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      })

      await initialize(true)
      toast.success('Senha definida com sucesso.')
      router.replace('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível definir a senha.'
      setFeedback(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10">
      <div className="w-full max-w-xl rounded-[24px] border border-app-border bg-app-card p-8 shadow-xl dark:border-app-border-dark dark:bg-app-card-dark">
        <div className="mb-8 space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-primary text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-app-text-primary dark:text-white">Definir senha de acesso</h1>
            <p className="text-sm text-app-text-secondary dark:text-white/65">
              {user?.name ? `${user.name},` : 'Bem-vindo,'} este é o seu primeiro acesso. Antes de continuar, escolha uma nova senha para entrar no portal com segurança.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-text-primary dark:text-white/75">Nova senha</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-5 w-5 text-app-text-muted" />
              <Input
                type="password"
                value={formData.newPassword}
                onChange={(event) => setFormData((prev) => ({ ...prev, newPassword: event.target.value }))}
                placeholder="Digite a nova senha"
                className="h-11 pl-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-app-text-primary dark:text-white/75">Confirmar nova senha</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-5 w-5 text-app-text-muted" />
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(event) => setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                placeholder="Repita a nova senha"
                className="h-11 pl-11"
                required
              />
            </div>
          </div>

          {feedback && (
            <div className="rounded-xl border border-transparent app-status-danger px-4 py-3">
              <p className="text-sm text-[var(--app-danger-text)]">{feedback}</p>
            </div>
          )}

          <div className="rounded-xl border border-app-border bg-app-bg-secondary px-4 py-3 text-sm text-app-text-secondary dark:border-app-border-dark dark:bg-app-hover dark:text-white/65">
            A nova senha deve ter pelo menos 4 caracteres. Depois de salvar, o acesso segue normalmente para o portal.
          </div>

          <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
            {isSubmitting ? 'Salvando senha...' : 'Definir senha e continuar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
