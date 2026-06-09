'use client'

import { useMemo, useState } from 'react'
import { PlayCircle, Search } from 'lucide-react'
import { useAgenda } from '@/hooks/use-agenda'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { AtendimentoView } from '@/features/agenda/atendimento-view'

export function AgendaPessoalView() {
  const { data, error, isLoading } = useAgenda()
  const [search, setSearch] = useState('')
  const [activePaciente, setActivePaciente] = useState<string | null>(null)

  const filtered = useMemo(
    () => data.filter((item) => item.paciente.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  )

  if (activePaciente) {
    return <AtendimentoView patientName={activePaciente} onBack={() => setActivePaciente(null)} />
  }

  return (
    <div className="app-page">
      <PageHeader
        title="Agenda medica"
        description="Consulte seus horarios e inicie atendimentos"
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar paciente..." className="h-11 pl-9" />
      </div>

      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}
      {isLoading && <p className="text-app-text-secondary">Carregando agenda pessoal...</p>}
      {!isLoading && filtered.length === 0 && <p className="text-app-text-secondary">Nenhum atendimento na agenda.</p>}

      <div className="space-y-3">
        {filtered.map((item) => (
          <Card key={item.id} className="rounded-[16px] border-app-border dark:border-app-border-dark">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-app-text-primary dark:text-white">{item.paciente}</p>
                <p className="text-xs text-app-text-secondary">{item.horario} · {item.status}</p>
              </div>
              <Button onClick={() => setActivePaciente(item.paciente)} className="bg-app-primary hover:bg-app-primary-hover text-white">
                <PlayCircle className="mr-2 h-4 w-4" />
                Iniciar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
