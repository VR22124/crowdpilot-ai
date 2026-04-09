import type { FC } from 'react'
import type { KpiMetrics } from '../types'

interface KpiDashboardProps {
  kpis: KpiMetrics
}

export const KpiDashboard: FC<KpiDashboardProps> = ({ kpis }) => {
  return (
    <section className="kpi-strip panel" aria-label="KPI dashboard">
      <article>
        <span>Total crowd</span>
        <strong>{kpis.totalCrowd.toLocaleString()}</strong>
      </article>
      <article>
        <span>Avg wait time</span>
        <strong>{kpis.avgWaitTime} min</strong>
      </article>
      <article>
        <span>Congestion score</span>
        <strong>{kpis.congestionScore}</strong>
      </article>
      <article>
        <span>Flow efficiency</span>
        <strong>{kpis.flowEfficiency}%</strong>
      </article>
      <article className={`risk ${kpis.riskLevel.toLowerCase()}`}>
        <span>Risk level</span>
        <strong>{kpis.riskLevel}</strong>
      </article>
    </section>
  )
}
