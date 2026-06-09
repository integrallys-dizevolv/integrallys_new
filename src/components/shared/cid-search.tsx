'use client'

import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface CIDSearchProps {
  onSelect: (code: string) => void
  disabled?: boolean
}

interface CIDItem {
  id: string
  code: string
  description: string
}

export function CIDSearch({ onSelect, disabled }: CIDSearchProps) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<CIDItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (value: string) => {
    setTerm(value)
    if (!value.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
        <Input
          placeholder="Buscar diagnóstico (CID-11)..."
          value={term}
          onChange={(event) => void handleSearch(event.target.value)}
          disabled={disabled}
          className="h-11 rounded-integrallys pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--app-primary)]" />
        )}
      </div>

      {results.length > 0 && !disabled && (
        <div className="animate-in fade-in zoom-in-95 duration-200 absolute z-50 mt-1 w-full overflow-hidden rounded-integrallys border border-app-border bg-app-card shadow-xl dark:border-app-border-dark dark:bg-app-card-dark">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(`${item.code} - ${item.description}`)
                setTerm(`${item.code} - ${item.description}`)
                setResults([])
              }}
              className="w-full border-b border-app-border p-3 text-left transition-colors last:border-0 hover:bg-app-bg-secondary dark:border-app-border-dark dark:hover:bg-app-bg-dark"
            >
              <span className="font-bold text-[var(--app-primary)] dark:text-[#4da885]">{item.code}</span>
              <span className="ml-2 text-app-text-primary dark:text-white">{item.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
