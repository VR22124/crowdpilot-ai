import type { FC } from 'react'

interface DevMetricsPanelProps {
  source: 'firebase' | 'simulated'
  fps: number
  renderMs: number
  routeComputeMs: number
  predictionLatencyMs: number
}

export const DevMetricsPanel: FC<DevMetricsPanelProps> = ({
  source,
  fps,
  renderMs,
  routeComputeMs,
  predictionLatencyMs,
}) => {
  return (
    <article className="panel dev-metrics-card" data-testid="dev-metrics-panel">
      <h3>Performance Metrics</h3>
      <div className="analytics-grid">
        <article><span>Data Source</span><strong>{source}</strong></article>
        <article><span>FPS</span><strong>{fps}</strong></article>
        <article><span>Render Time</span><strong>{renderMs.toFixed(2)}ms</strong></article>
        <article><span>Route Compute</span><strong>{routeComputeMs.toFixed(2)}ms</strong></article>
        <article><span>Prediction Latency</span><strong>{predictionLatencyMs.toFixed(2)}ms</strong></article>
      </div>
    </article>
  )
}
