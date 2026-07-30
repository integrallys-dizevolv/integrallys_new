import type { StatusConsulta } from '@/hooks/use-consulta-cep'
import { cn } from '@/lib/utils'

// Feedback visual compartilhado das consultas automáticas de CEP e CNPJ.
// Reaproveita o spinner inline e os tokens de cor já usados nos formulários —
// sem introduzir componente visual novo.

/** Spinner inline posicionado dentro de um `<div className="relative">`. */
export function SpinnerCampo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-app-primary border-t-transparent',
        className,
      )}
    />
  )
}

type FeedbackConsultaProps = {
  status: StatusConsulta
  /** Texto exibido no sucesso — normalmente a razão social ou o logradouro encontrado. */
  encontrado?: string
  /** Mensagem de "não encontrado". Deve deixar claro que o cadastro pode seguir. */
  naoEncontrado: string
  /** Mensagem exibida enquanto a consulta está em andamento. */
  buscando: string
  /** Mensagem de documento com dígito verificador inválido. */
  invalido?: string
}

/**
 * Mensagem de estado da consulta. Nenhum estado aqui é bloqueante: "não
 * encontrado" e "erro" são apenas informativos, porque a busca é enriquecimento
 * de cadastro e não obrigatoriedade.
 */
export function FeedbackConsulta({
  status,
  encontrado,
  naoEncontrado,
  buscando,
  invalido,
}: FeedbackConsultaProps) {
  if (status === 'inativo') return null

  const base = 'mt-1 text-xs leading-snug'

  if (status === 'buscando') {
    return <p className={cn(base, 'text-app-text-muted')}>{buscando}</p>
  }

  if (status === 'invalido') {
    return invalido ? <p className={cn(base, 'text-[var(--app-danger-text)]')}>{invalido}</p> : null
  }

  if (status === 'encontrado') {
    return encontrado ? (
      <p className={cn(base, 'font-medium text-[var(--app-success-text)]')}>{encontrado}</p>
    ) : null
  }

  if (status === 'nao-encontrado') {
    return <p className={cn(base, 'text-[var(--app-warning-text)]')}>{naoEncontrado}</p>
  }

  return (
    <p className={cn(base, 'text-app-text-muted')}>
      Não foi possível consultar agora — preencha os campos manualmente.
    </p>
  )
}
