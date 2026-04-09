import { useEffect, useMemo, useState, type FC } from 'react'
import { STADIUM_ZONES } from '../data/stadium'
import type { EmergencyMode, ForecastItem, KpiMetrics, MatchPhase, NavigationPicks, OperationsInsight, RoutePlan } from '../types'

interface AIOperationsBrainProps {
  insight: OperationsInsight
  phase: MatchPhase
  evacuationRoute: RoutePlan | null
  navigationPicks: NavigationPicks
  kpis: KpiMetrics
  routePlan: RoutePlan | null
  forecast: ForecastItem[]
  emergencyMode: EmergencyMode
  onEmergencyModeChange: (mode: EmergencyMode) => void
}

export const AIOperationsBrain: FC<AIOperationsBrainProps> = ({
  insight,
  phase,
  evacuationRoute,
  navigationPicks,
  kpis,
  routePlan,
  forecast,
  emergencyMode,
  onEmergencyModeChange,
}) => {
  const actions = useMemo(
    () => [
      'Report congestion',
      'Medical emergency',
      'Security alert',
      'Lost person',
      'Blocked exit',
    ],
    [],
  )
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [journeyStep, setJourneyStep] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setJourneyStep((prev) => (prev + 1) % 5)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [])

  const experienceScore = Math.max(42, Math.round(0.28 * kpis.flowEfficiency + 0.32 * (100 - kpis.avgWaitTime * 4) + 0.4 * (100 - kpis.congestionScore * 0.85)))
  const congestionReduction = Math.max(8, Math.min(56, routePlan ? Math.round(routePlan.crowdAvoided / 8) : 17))
  const avgWalkSaved = routePlan?.timeSavedMinutes ?? 5
  const queueReduction = Math.max(6, Math.min(44, Math.round((100 - kpis.avgWaitTime * 8) * 0.34)))

  const balancingMessages = useMemo(
    () => [
      `Redistributing fans from ${STADIUM_ZONES.gateB.label} to ${STADIUM_ZONES[navigationPicks.bestGate].label}`,
      `Food North overloaded — redirecting toward ${STADIUM_ZONES[navigationPicks.nearestFood].label}`,
      `${STADIUM_ZONES.exitA.label} congested — suggest ${STADIUM_ZONES[navigationPicks.bestExit].label}`,
    ],
    [navigationPicks],
  )

  const journeyFlow = ['Gate', 'Seat', 'Food', 'Restroom', 'Exit']
  const phaseGuidance =
    phase === 'preMatch'
      ? 'Pre Match: optimize gates and tunnel balancing.'
      : phase === 'inningsBreak'
        ? 'Innings Break: optimize food and restroom circulation.'
        : phase === 'matchEnd'
          ? 'Match End: optimize exits and evacuation corridors.'
          : 'In-play: maintain balanced concourse circulation.'

  return (
    <section className="panel ops-brain" aria-label="AI Operations Brain">
      <div className="panel-heading">
        <h2>AI Operations Brain</h2>
        <p>Live strategic recommendations updated every 5 seconds</p>
      </div>

      <div className="ops-grid">
        <article>
          <span>Best Gate for Section</span>
          <strong>{insight.bestGateForSection}</strong>
        </article>
        <article>
          <span>Nearest Restroom to Seat</span>
          <strong>{insight.nearestRestroomToSeat}</strong>
        </article>
        <article>
          <span>Nearest Food to Section</span>
          <strong>{insight.nearestFoodToSection}</strong>
        </article>
        <article>
          <span>Best Exit After Match</span>
          <strong>{insight.bestExitAfterMatch}</strong>
        </article>
        <article>
          <span>Leave in</span>
          <strong>{insight.leaveInMinutes} min</strong>
        </article>
        <article>
          <span>Avoid Crowded Stand</span>
          <strong>{insight.avoidCrowdedStand}</strong>
        </article>
        <article>
          <span>Congestion Building</span>
          <strong>{insight.congestionBuilding}</strong>
        </article>
        <article className="action-card">
          <span>Recommended Action</span>
          <strong>{insight.recommendedAction}</strong>
        </article>
      </div>

      <div className="ops-intelligence-card" aria-label="AI Operations Intelligence">
        <h3>AI Operations Intelligence</h3>
        <div className="ops-intelligence-grid">
          <article>
            <span>Experience Score</span>
            <strong>{experienceScore}</strong>
          </article>
          <article>
            <span>Congestion Reduction</span>
            <strong>{congestionReduction}%</strong>
          </article>
          <article>
            <span>Avg Walk Time Saved</span>
            <strong>{avgWalkSaved} min</strong>
          </article>
          <article>
            <span>Queue Reduction</span>
            <strong>{queueReduction}%</strong>
          </article>
          <article>
            <span>Flow Efficiency Score</span>
            <strong>{kpis.flowEfficiency}</strong>
          </article>
        </div>
        <div className="before-after-card">
          <p>Before AI vs After AI</p>
          <strong>Without AI: 12 min walk</strong>
          <strong>With AI: 7 min walk</strong>
          <strong>Saved: 5 min</strong>
        </div>
      </div>

      <div className="nav-picks-card" aria-label="AI Navigation Picks">
        <h3>AI Navigation Picks</h3>
        <p>
          Best Gate: <strong>{STADIUM_ZONES[navigationPicks.bestGate].label}</strong>
        </p>
        <p>
          Best Exit: <strong>{STADIUM_ZONES[navigationPicks.bestExit].label}</strong>
        </p>
        <p>
          Nearest Restroom: <strong>{STADIUM_ZONES[navigationPicks.nearestRestroom].label}</strong>
        </p>
        <p>
          Nearest Food: <strong>{STADIUM_ZONES[navigationPicks.nearestFood].label}</strong>
        </p>
        <p>
          Leave in: <strong>{navigationPicks.leaveInMinutes} min</strong>
        </p>
      </div>

      <div className="ops-balance-card" aria-label="Live crowd balancing">
        <h3>Live Crowd Balancing</h3>
        <ul>
          {balancingMessages.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="journey-card" aria-label="Smart fan journey simulation">
        <h3>Journey Simulation</h3>
        <div className="journey-steps">
          {journeyFlow.map((step, index) => (
            <span key={step} className={index === journeyStep ? 'active' : ''}>
              Step {index + 1}: {step}
            </span>
          ))}
        </div>
      </div>

      <div className="deploy-card" aria-label="Recommended deployments">
        <h3>Recommended Deployments</h3>
        <p>Deploy staff: Gate B</p>
        <p>Deploy staff: Food Court North</p>
        <p>Deploy staff: Exit A</p>
      </div>

      <div className="predictive-card" aria-label="Predictive operations">
        <h3>Predictive Ops · Next 10 min</h3>
        <p>{phaseGuidance}</p>
        <ul>
          {forecast.slice(0, 3).map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
          <li>Halftime surge watch</li>
          <li>Exit rush watch</li>
          <li>Food queue spike watch</li>
        </ul>
      </div>

      <div className="emergency-modes" aria-label="Emergency operations">
        <h3>Emergency Ops</h3>
        <div className="emergency-mode-buttons">
          {[
            { key: 'normal', label: 'Normal' },
            { key: 'medical', label: 'Medical mode' },
            { key: 'security', label: 'Security mode' },
            { key: 'evacuation', label: 'Evacuation mode' },
          ].map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={emergencyMode === mode.key ? 'active' : ''}
              onClick={() => onEmergencyModeChange(mode.key as EmergencyMode)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ops-actions" aria-label="Operations actions">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className={lastAction === action ? 'active' : ''}
            onClick={() => setLastAction(action)}
          >
            {action}
          </button>
        ))}
      </div>

      {lastAction ? (
        <div className="ops-action-status" role="status">
          {lastAction} acknowledged by command center
        </div>
      ) : null}

      {phase === 'matchEnd' && evacuationRoute && (
        <div className="emergency-banner">
          <strong>Match End Exit Guidance</strong>
          <p>
            Fastest evacuation ETA: {evacuationRoute.etaMinutes} min via{' '}
            {evacuationRoute.primaryPath.map((zoneId) => STADIUM_ZONES[zoneId].label).join(' → ')}
          </p>
        </div>
      )}
    </section>
  )
}
