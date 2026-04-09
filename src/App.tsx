import { useMemo, useRef, useState } from 'react'
import { STADIUM_ZONES } from './data/stadium'
import { AIOperationsBrain } from './components/AIOperationsBrain'
import { MatchControlPanel } from './components/MatchControlPanel'
import { RoutePlanner } from './components/RoutePlanner'
import { StadiumMap } from './components/StadiumMap'
import { useCrowdPilotSimulation } from './hooks/useCrowdPilotSimulation'
import type { EmergencyMode, ZoneId } from './types'
import './dashboard.css'

type DashboardTab = 'overview' | 'route' | 'control' | 'assist' | 'ai'

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'route', label: 'Route Optimization' },
  { id: 'control', label: 'Control Center' },
  { id: 'assist', label: 'Attendee Assist' },
  { id: 'ai', label: 'AI Brain Ops' },
]

function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [emergencyMode, setEmergencyMode] = useState<EmergencyMode>('normal')
  const [chatInput, setChatInput] = useState('')
  const expandedRef = useRef<HTMLElement | null>(null)

  const {
    now,
    phase,
    setMatchControl,
    metrics,
    waitTimes,
    queueLengths,
    alerts,
    suggestions,
    overall,
    kpis,
    operationsInsight,
    forecast,
    selectedFrom,
    selectedTo,
    setSelectedFrom,
    setSelectedTo,
    zoneOptions,
    routePlan,
    computeRoute,
    evacuationRoute,
    chatMessages,
    sendUserMessage,
  } = useCrowdPilotSimulation()

  const navigationPicks = useMemo(() => {
    const minByDensity = (zones: ZoneId[]) =>
      zones.reduce((best, zoneId) => (metrics[zoneId].density < metrics[best].density ? zoneId : best), zones[0])

    return {
      bestGate: minByDensity(['gateA', 'gateB', 'gateC']),
      bestExit: minByDensity(['exitA', 'exitB']),
      nearestRestroom: minByDensity(['restroomNorth', 'restroomSouth']),
      nearestFood: 'foodCourt' as ZoneId,
      leaveInMinutes: Math.max(4, Math.round((metrics.exitA.density + metrics.exitB.density) / 28)),
    }
  }, [metrics])

  const redistributionActive = useMemo(
    () => operationsInsight.recommendedAction.toLowerCase().includes('promote') || phase === 'preMatch' || phase === 'firstInnings',
    [operationsInsight.recommendedAction, phase],
  )
  const aiSavedTimeMinutes = routePlan?.timeSavedMinutes ?? 5.2
  const congestionReductionPercent = Math.max(8, Math.round((100 - kpis.congestionScore) * 0.32))
  const routeDistance = useMemo(() => {
    if (!routePlan || routePlan.primaryGeometry.length < 2) return 0
    let total = 0
    for (let i = 1; i < routePlan.primaryGeometry.length; i += 1) {
      const a = routePlan.primaryGeometry[i - 1]
      const b = routePlan.primaryGeometry[i]
      total += Math.hypot(b.x - a.x, b.y - a.y)
    }
    return Math.round(total * 5.9)
  }, [routePlan])

  const activateTab = (tab: DashboardTab) => {
    setActiveTab(tab)
    expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const sendChat = () => {
    const input = chatInput.trim()
    if (!input) return
    sendUserMessage(input)
    setChatInput('')
  }

  const radialStyle = (value: number) => ({ ['--value' as string]: `${Math.max(0, Math.min(100, value))}` })

  return (
    <div className="app-shell twin-app-shell" data-testid="app-shell">
      <main className="twin-layout">
        <section className="panel twin-viewport" aria-label="IPL Stadium Digital Twin viewport" data-testid="twin-viewport">
          <header className="twin-header-strip" data-testid="header-strip">
            <div>
              <p className="eyebrow">Live Event Control</p>
              <h1>CrowdPilot AI — IPL Match Operations</h1>
            </div>
            <div className="twin-header-metrics" data-testid="header-metrics">
              <article><span>Status</span><strong>{overall.label}</strong></article>
              <article><span>Density</span><strong>{Math.round(overall.averageDensity)}%</strong></article>
              <article><span>Time</span><strong>{new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></article>
              <article><span>Saved</span><strong>{aiSavedTimeMinutes.toFixed(1)}m</strong></article>
              <article><span>Congestion</span><strong>{congestionReductionPercent}% ↓</strong></article>
            </div>
          </header>

          <div className="twin-map-stage" data-testid="map-stage">
            <StadiumMap
              metrics={metrics}
              routePlan={routePlan}
              phase={phase}
              emergencyRoute={evacuationRoute}
              queueLengths={queueLengths}
              navigationPicks={navigationPicks}
              emergencyMode={emergencyMode}
              redistributionActive={redistributionActive}
            />
          </div>

          <div className="density-bottom-strip" aria-label="density bottom bar" data-testid="density-bottom-strip">
            {(['gateA', 'gateB', 'gateC', 'foodCourt', 'restroomNorth', 'restroomSouth'] as ZoneId[]).map((zoneId) => (
              <article key={`density-${zoneId}`}>
                <span>{STADIUM_ZONES[zoneId].label}</span>
                <div><i style={{ width: `${Math.round(metrics[zoneId].density)}%` }} /></div>
                <strong>{Math.round(metrics[zoneId].density)}%</strong>
              </article>
            ))}
          </div>

          <nav className="dashboard-tabs mini-tabs" aria-label="Dashboard tabs" data-testid="tabs-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`tab-${tab.id}`}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => activateTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </section>

        <section ref={expandedRef} className="panel expanded-tab-viewport" aria-live="polite" data-testid="expanded-tab-viewport">
          <div key={activeTab} className="expanded-tab-content tab-slide" data-testid="expanded-tab-content" data-active-tab={activeTab}>
          {activeTab === 'overview' ? (
            <section className="tab-grid overview-dash" data-testid="panel-overview">
              <article className="panel gauge-card">
                <h3>Experience Score</h3>
                <div className="radial-gauge" style={radialStyle(Math.round((100 - kpis.congestionScore) * 0.9))}><span>{Math.round((100 - kpis.congestionScore) * 0.9)}</span></div>
              </article>
              <article className="panel gauge-card">
                <h3>Flow Efficiency</h3>
                <div className="radial-gauge" style={radialStyle(kpis.flowEfficiency)}><span>{kpis.flowEfficiency}</span></div>
              </article>
              <article className="panel gauge-card">
                <h3>Congestion Reduction</h3>
                <div className="radial-gauge" style={radialStyle(congestionReductionPercent)}><span>{congestionReductionPercent}%</span></div>
              </article>

              <article className="panel bars-card">
                <h3>Crowd Heat</h3>
                {(['gateA', 'gateB', 'gateC'] as ZoneId[]).map((zoneId) => (
                  <div key={zoneId} className="bar-item">
                    <span>{STADIUM_ZONES[zoneId].label}</span>
                    <div><i style={{ width: `${metrics[zoneId].density}%` }} /></div>
                    <strong>{Math.round(metrics[zoneId].density)}%</strong>
                  </div>
                ))}
              </article>

              <article className="panel bars-card">
                <h3>Wait Times</h3>
                {waitTimes.slice(0, 5).map((item) => (
                  <div key={item.zoneId} className="bar-item">
                    <span>{item.label}</span>
                    <div><i style={{ width: `${Math.min(100, item.minutes * 8)}%` }} /></div>
                    <strong>{item.minutes}m</strong>
                  </div>
                ))}
              </article>

              <article className="panel action-card">
                <h3>AI Recommended Action</h3>
                <p>{operationsInsight.recommendedAction}</p>
              </article>
            </section>
          ) : null}

          {activeTab === 'route' ? (
            <section className="tab-grid route-dash" data-testid="panel-route">
              <article className="panel route-left">
                <h3>Route Optimization Agent</h3>
                <RoutePlanner
                  from={selectedFrom}
                  to={selectedTo}
                  zoneOptions={zoneOptions}
                  routePlan={routePlan}
                  onChangeFrom={setSelectedFrom}
                  onChangeTo={setSelectedTo}
                  onPlanRoute={computeRoute}
                />
              </article>

              <article className="panel route-center">
                <h3>Journey Preview</h3>
                <div className="journey-stepper">
                  {(routePlan?.primaryPath ?? [selectedFrom, selectedTo]).map((zoneId, index, arr) => (
                    <div key={`${zoneId}-${index}`} className="step">
                      <span className="dot">{index + 1}</span>
                      <strong>{STADIUM_ZONES[zoneId].label}</strong>
                      {index < arr.length - 1 ? <em>➜</em> : null}
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel route-right">
                <h3>Route Stats</h3>
                <div className="route-stat-grid">
                  <article><span>Walk Time</span><strong>{routePlan?.etaMinutes ?? '--'} min</strong></article>
                  <article><span>Time Saved</span><strong>{routePlan?.timeSavedMinutes ?? '--'} min</strong></article>
                  <article><span>Best Gate</span><strong>{STADIUM_ZONES[navigationPicks.bestGate].label}</strong></article>
                  <article><span>Distance</span><strong>{routeDistance || '--'} m</strong></article>
                  <article><span>Crowd Difficulty</span><strong>{routePlan?.congestionScore ?? '--'}</strong></article>
                </div>
              </article>
            </section>
          ) : null}

          {activeTab === 'control' ? (
            <section className="tab-grid control-dash" data-testid="panel-control">
              <article className="panel control-buttons-card">
                <h3>Control Center</h3>
                <MatchControlPanel phase={phase} onChangePhase={setMatchControl} />
              </article>

              <article className="panel alerts-card">
                <h3>Mode & Alerts</h3>
                <div className="mode-row">
                  <span className="mode-chip">Phase: {phase}</span>
                  <span className="mode-chip">Density: {overall.label}</span>
                </div>
                <ul>
                  {alerts.slice(0, 8).map((alert) => (
                    <li key={alert.id} className={alert.severity}>{alert.message}</li>
                  ))}
                </ul>
              </article>
            </section>
          ) : null}

          {activeTab === 'assist' ? (
            <section className="tab-grid assist-dash" data-testid="panel-assist">
              <article className="panel assist-left">
                <h3>AI Suggestions</h3>
                <div className="quick-ask-list">
                  {[`Best gate`, `Best exit`, `Nearest restroom`, `Food suggestion`, `Fastest route`, ...suggestions].slice(0, 8).map((item) => (
                    <button key={item} onClick={() => sendUserMessage(item)}>{item}</button>
                  ))}
                </div>

                <div className="assist-mini-cards">
                  <article><strong>Best Gate</strong><span>{STADIUM_ZONES[navigationPicks.bestGate].label}</span></article>
                  <article><strong>Best Exit</strong><span>{STADIUM_ZONES[navigationPicks.bestExit].label}</span></article>
                  <article><strong>Restroom</strong><span>{STADIUM_ZONES[navigationPicks.nearestRestroom].label}</span></article>
                </div>
              </article>

              <article className="panel assist-right">
                <h3>Attendee Copilot</h3>
                <div className="chat-stream enhanced">
                  {chatMessages.slice(-12).map((message) => (
                    <div key={message.id} className={`chat-bubble ${message.role}`}>
                      <strong>{message.role === 'assistant' ? 'AI' : 'You'}</strong>
                      <p>{message.text}</p>
                    </div>
                  ))}
                  <div className="typing-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="chat-input">
                  <input
                    data-testid="chat-input"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask: fastest gate, nearest restroom…"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') sendChat()
                    }}
                  />
                  <button onClick={sendChat} data-testid="chat-send">Send</button>
                </div>
              </article>
            </section>
          ) : null}

          {activeTab === 'ai' ? (
            <section className="tab-grid ai-dash" data-testid="panel-ai">
              <AIOperationsBrain
                insight={operationsInsight}
                phase={phase}
                evacuationRoute={evacuationRoute}
                navigationPicks={navigationPicks}
                kpis={kpis}
                routePlan={routePlan}
                forecast={forecast}
                emergencyMode={emergencyMode}
                onEmergencyModeChange={setEmergencyMode}
              />
            </section>
          ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
