'use client'

import { useMemo, useState } from 'react'
import { Cake, CheckSquare, Square } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/shared/date-input'

interface Aniversariante {
  id: string
  nome: string
  dataNascimento: string
  idade: number
  telefone: string
  mensagemEnviada: boolean
}

interface AniversariantesModalProps {
  isOpen: boolean
  onClose: () => void
  aniversariantes?: Aniversariante[]
}

const formatDateBR = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function AniversariantesModal({
  isOpen,
  onClose,
  aniversariantes = [],
}: AniversariantesModalProps) {
  const hoje = new Date()
  const [modo, setModo] = useState<'dia' | 'mes'>('dia')
  const [dataFiltro, setDataFiltro] = useState(hoje.toISOString().split('T')[0])
  const [items, setItems] = useState<Aniversariante[]>(aniversariantes)

  const filtrados = useMemo(() => {
    const [, mes, dia] = dataFiltro.split('-').map(Number)
    return items.filter((item) => {
      const [, bm, bd] = item.dataNascimento.split('-').map(Number)
      if (modo === 'dia') return bm === mes && bd === dia
      return bm === mes
    })
  }, [items, dataFiltro, modo])

  const toggleMensagem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, mensagemEnviada: !item.mensagemEnviada } : item,
      ),
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg" className="bg-app-card dark:bg-app-card-dark rounded-integrallys-lg flex flex-col">
        <DialogHeader className="shrink-0 p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl app-status-info flex items-center justify-center border border-[var(--app-primary)]/20">
              <Cake className="h-6 w-6 text-[var(--app-primary)]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-normal text-app-text-primary dark:text-white">
                Lista de Aniversariantes
              </DialogTitle>
              <DialogDescription className="text-xs text-app-text-muted mt-0.5">
                Controle de mensagens de aniversario por dia ou mes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-4 flex gap-3">
          <div className="flex rounded-integrallys border border-app-border dark:border-app-border-dark overflow-hidden">
            <button
              type="button"
              onClick={() => setModo('dia')}
              className={`h-10 px-4 text-sm ${modo === 'dia' ? 'bg-app-primary text-white' : 'bg-app-card dark:bg-app-bg-dark text-app-text-secondary dark:text-white/80'}`}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => setModo('mes')}
              className={`h-10 px-4 text-sm ${modo === 'mes' ? 'bg-app-primary text-white' : 'bg-app-card dark:bg-app-bg-dark text-app-text-secondary dark:text-white/80'}`}
            >
              Mes
            </button>
          </div>
          <DateInput value={dataFiltro} onChange={setDataFiltro} className="h-10 max-w-[220px]" />
        </div>

        <div className="px-6 pb-6 overflow-auto">
          <div className="rounded-[12px] border border-app-border dark:border-app-border-dark overflow-hidden">
            <div className="grid grid-cols-12 bg-app-bg-secondary/60 dark:bg-app-bg-dark/60 border-b border-app-border dark:border-app-border-dark text-xs uppercase tracking-wider text-app-text-muted">
              <div className="col-span-4 px-4 py-3">Cliente</div>
              <div className="col-span-2 px-4 py-3">Nascimento</div>
              <div className="col-span-1 px-4 py-3">Idade</div>
              <div className="col-span-3 px-4 py-3">Telefone</div>
              <div className="col-span-2 px-4 py-3 text-center">OK mensagem</div>
            </div>

            {filtrados.length === 0 && (
              <div className="px-4 py-6 text-sm text-app-text-muted">
                Nenhum aniversariante para o filtro selecionado.
              </div>
            )}

            {filtrados.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 border-b last:border-b-0 border-app-border dark:border-app-border-dark items-center"
              >
                <div className="col-span-4 px-4 py-3 text-sm text-app-text-primary dark:text-white">
                  {item.nome}
                </div>
                <div className="col-span-2 px-4 py-3 text-sm text-app-text-secondary dark:text-white/80">
                  {formatDateBR(item.dataNascimento)}
                </div>
                <div className="col-span-1 px-4 py-3 text-sm text-app-text-secondary dark:text-white/80">
                  {item.idade}
                </div>
                <div className="col-span-3 px-4 py-3 text-sm text-app-text-secondary dark:text-white/80">
                  {item.telefone}
                </div>
                <div className="col-span-2 px-4 py-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggleMensagem(item.id)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-[8px] hover:bg-app-bg-secondary dark:hover:bg-app-bg-dark transition-colors"
                    title="Marcar mensagem enviada"
                  >
                    {item.mensagemEnviada ? (
                      <CheckSquare className="h-5 w-5 text-[var(--app-primary)]" />
                    ) : (
                      <Square className="h-5 w-5 text-app-text-muted" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-end">
          <Button variant="outline" onClick={onClose} className="h-10 px-5 rounded-integrallys">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
