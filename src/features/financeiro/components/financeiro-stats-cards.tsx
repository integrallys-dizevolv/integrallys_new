'use client'

import { StatCard } from '@/components/shared/stat-card'
import type { useFinanceiroStats } from '../hooks/use-financeiro-stats'

interface Props {
  cards: ReturnType<typeof useFinanceiroStats>['cards']
}

export function FinanceiroStatsCards({ cards }: Props) {
  return (
    <div className="app-grid-stats md:grid-cols-4">
      {cards.map((stat) => (
        <StatCard
          key={stat.title}
          label={stat.title}
          value={stat.value}
          sub={stat.subtitle}
          icon={stat.icon}
        />
      ))}
    </div>
  )
}
