import type { FC } from 'react'

interface TopBarProps {
  eventName: string
  timestamp: number
  overallStatus: 'Stable' | 'Elevated' | 'Busy' | 'Critical'
  averageDensity: number
  aiSavedTimeMinutes: number
  fansOptimized: number
  congestionReductionPercent: number
}

export const TopBar: FC<TopBarProps> = ({
  eventName,
  timestamp,
  overallStatus,
  averageDensity,
  aiSavedTimeMinutes,
  fansOptimized,
  congestionReductionPercent,
}) => {
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <header className="top-bar panel">
      <div>
        <p className="eyebrow">Live Event Control</p>
        <h1>
          <span className="live-dot" aria-hidden="true" />
          {eventName}
        </h1>
      </div>
      <div className="top-metrics">
        <div className="metric-pill">
          <span>System status</span>
          <strong>{overallStatus}</strong>
        </div>
        <div className="metric-pill">
          <span>Avg density</span>
          <strong>{Math.round(averageDensity)}%</strong>
        </div>
        <div className="metric-pill">
          <span>Local time</span>
          <strong>{time}</strong>
        </div>
        <div className="metric-pill">
          <span>AI saved time</span>
          <strong>{aiSavedTimeMinutes.toFixed(1)} min</strong>
        </div>
        <div className="metric-pill">
          <span>Fans optimized</span>
          <strong>{fansOptimized.toLocaleString()}</strong>
        </div>
        <div className="metric-pill">
          <span>Congestion reduction</span>
          <strong>{congestionReductionPercent}%</strong>
        </div>
      </div>
    </header>
  )
}
