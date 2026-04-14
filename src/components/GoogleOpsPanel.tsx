import type { FC } from 'react'

interface GoogleOpsPanelProps {
  aiOpsSummary: string
  congestionExplanation: string
  strategyRecommendation: string
  staffRecommendation: string
  smartAlert: string
  predictionTimeline: number[]
  exportStatus: string
  isAiBusy: boolean
  onRegenerateSummary: () => void
  onExplainCongestion: () => void
  onGenerateStrategy: () => void
  onExportToSheets: () => void
  onLogSimulation: () => void
  onExportWaitTimes: () => void
  onSaveSimulation: () => void
  onDownloadSummary: () => void
}

export const GoogleOpsPanel: FC<GoogleOpsPanelProps> = ({
  aiOpsSummary,
  congestionExplanation,
  strategyRecommendation,
  staffRecommendation,
  smartAlert,
  predictionTimeline,
  exportStatus,
  isAiBusy,
  onRegenerateSummary,
  onExplainCongestion,
  onGenerateStrategy,
  onExportToSheets,
  onLogSimulation,
  onExportWaitTimes,
  onSaveSimulation,
  onDownloadSummary,
}) => {
  return (
    <article className="panel google-ops-panel" data-testid="google-ops-panel">
      <header>
        <h3>AI Insights Summary</h3>
        <p>{isAiBusy ? 'Generating intelligence...' : 'Gemini-powered operations insight with Google service actions.'}</p>
      </header>

      <div className="google-ops-grid">
        <section>
          <h4>Operations Recommendations</h4>
          <p>{aiOpsSummary}</p>
          <p>{staffRecommendation}</p>
          <p>{smartAlert}</p>
          <div className="google-ops-actions">
            <button onClick={onRegenerateSummary}>Generate AI Summary</button>
            <button onClick={onExplainCongestion}>Explain congestion</button>
            <button onClick={onGenerateStrategy}>Generate strategy</button>
          </div>
        </section>

        <section>
          <h4>Prediction Timeline</h4>
          <div className="timeline-bars" aria-label="Next 10 minute prediction timeline">
            {predictionTimeline.length ? predictionTimeline.map((value, index) => (
              <i key={`prediction-${index}`} style={{ height: `${Math.max(10, value)}%` }} title={`${value}%`} />
            )) : <p>No prediction timeline yet. Plan a route to generate one.</p>}
          </div>
          <p>{congestionExplanation}</p>
          <p>{strategyRecommendation}</p>
        </section>

        <section>
          <h4>Export & Reports</h4>
          <div className="google-ops-actions">
            <button onClick={onExportToSheets}>Export Report</button>
            <button onClick={onLogSimulation}>Log Simulation</button>
            <button onClick={onExportWaitTimes}>Export Wait Times</button>
            <button onClick={onSaveSimulation}>Save Simulation</button>
            <button onClick={onDownloadSummary}>Download AI Summary</button>
          </div>
          <p className="google-ops-status">{exportStatus}</p>
        </section>
      </div>
    </article>
  )
}
