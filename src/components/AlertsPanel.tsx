import type { FC } from 'react'
import type { AlertItem } from '../types'

interface AlertsPanelProps {
  alerts: AlertItem[]
}

export const AlertsPanel: FC<AlertsPanelProps> = ({ alerts }) => {
  return (
    <section className="panel alerts" aria-label="Real-time alerts">
      <div className="panel-heading compact">
        <h3>Real-Time Alert System</h3>
      </div>
      <ul>
        {alerts.map((alert) => (
          <li key={alert.id} className={alert.severity}>
            {alert.message}
          </li>
        ))}
      </ul>
    </section>
  )
}
