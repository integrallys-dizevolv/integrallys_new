'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/hooks/use-api'

type CampoDef = { id: string; label: string; tipo: 'texto' | 'numero' | 'booleano' }

/** Builder de campos personalizados de anamnese (configurações clínicas). */
export function AnamneseCamposBuilder() {
  const api = useApi()
  const [campos, setCampos] = useState<CampoDef[]>([])
  const [label, setLabel] = useState('')
  const [tipo, setTipo] = useState<CampoDef['tipo']>('texto')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void api
      .get<{ data: CampoDef[] }>('/api/anamnese/campos')
      .then((res) => setCampos(res.data ?? []))
      .catch(() => setCampos([]))
  }, [api])

  const save = async (next: CampoDef[]) => {
    setSaving(true)
    try {
      const res = await api.put<{ data: CampoDef[] }>('/api/anamnese/campos', { campos: next })
      setCampos(res.data ?? next)
      toast.success('Campos de anamnese atualizados.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar campos')
    } finally {
      setSaving(false)
    }
  }

  const addCampo = () => {
    const trimmed = label.trim()
    if (!trimmed) {
      toast.error('Informe o rótulo do campo.')
      return
    }
    const id = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
    if (!id) {
      toast.error('Rótulo inválido.')
      return
    }
    if (campos.some((c) => c.id === id)) {
      toast.error('Já existe um campo com esse identificador.')
      return
    }
    const next = [...campos, { id, label: trimmed, tipo }]
    setLabel('')
    void save(next)
  }

  const removeCampo = (id: string) => {
    void save(campos.filter((c) => c.id !== id))
  }

  return (
    <Card className="rounded-2xl border-app-border dark:border-app-border-dark">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-medium text-app-text-primary dark:text-white">
            Campos personalizados
          </h3>
          <p className="text-sm text-app-text-muted">
            Defina campos extras exibidos no formulário de anamnese (além de peso, IMC, gordura e queixa).
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <Label>Rótulo</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Alergias" />
          </div>
          <div className="w-full md:w-40 space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as CampoDef['tipo'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="texto">Texto</SelectItem>
                <SelectItem value="numero">Número</SelectItem>
                <SelectItem value="booleano">Sim/Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addCampo} disabled={saving} className="rounded-xl">
            Adicionar
          </Button>
        </div>
        <ul className="space-y-2">
          {campos.length === 0 ? (
            <li className="text-sm text-app-text-muted">Nenhum campo personalizado ainda.</li>
          ) : (
            campos.map((campo) => (
              <li
                key={campo.id}
                className="flex items-center justify-between rounded-xl border border-app-border px-3 py-2 dark:border-app-border-dark"
              >
                <span className="text-sm">
                  {campo.label}{' '}
                  <span className="text-app-text-muted">({campo.tipo} · {campo.id})</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => removeCampo(campo.id)} disabled={saving}>
                  Remover
                </Button>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
