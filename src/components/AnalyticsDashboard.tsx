import type { FC } from 'react'

interface AnalyticsDashboardProps {
  routeUsageCount: number
  chatInteractions: number
  popularGate: string
  avgWaitTime: number
  densityHistory: number[]
}

export const AnalyticsDashboard: FC<AnalyticsDashboardProps> = ({
  routeUsageCount,
  chatInteractions,
  popularGate,
  avgWaitTime,
  densityHistory,
}) => {
  const max = Math.max(1, ...densityHistory)

  return (
    <article className="panel analytics-card" data-testid="analytics-dashboard">
      <h3>Realtime Analytics</h3>
      <div className="analytics-grid">
        <article><span>Route Usage</span><strong>{routeUsageCount}</strong></article>
        <article><span>Chat Interactions</span><strong>{chatInteractions}</strong></article>
        <article><span>Popular Gate</span><strong>{popularGate}</strong></article>
        <article><span>Avg Wait</span><strong>{avgWaitTime.toFixed(1)}m</strong></article>
      </div>
      <div className="analytics-trend" aria-label="Density history trend">
        {densityHistory.map((value, index) => (
          <i key={`density-${index}`} style={{ height: `${Math.max(10, (value / max) * 100)}%` }} />
        ))}
      </div>
    </article>
  )
}
