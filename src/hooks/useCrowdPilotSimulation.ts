import { useEffect, useMemo, useState } from 'react'
import {
  generateCopilotReply,
  getQuickInsights,
} from '../agents/attendeeCopilotAgent'
import {
  initializeCrowdMetrics,
  updateCrowdMetrics,
} from '../agents/crowdIntelligenceAgent'
import { planSmartRoute } from '../agents/routeOptimizationAgent'
import { STADIUM_ZONES } from '../data/stadium'
import {
  buildNextTenMinuteForecast,
  calculateWaitTimes,
  deriveKpis,
  deriveOperationsInsight,
  deriveAlerts,
  estimateQueueLengths,
  getOverallCrowdStatus,
  scenarioLabel,
} from '../engine/simulationEngine'
import type {
  AlertItem,
  CopilotMessage,
  MatchPhase,
  RoutePlan,
  ScenarioKey,
  ZoneId,
} from '../types'

const SIMULATION_TICK_MS = 5000

export function useCrowdPilotSimulation() {
  const [now, setNow] = useState(() => Date.now())
  const [phase, setPhase] = useState<MatchPhase>('preMatch')
  const [scenario, setScenario] = useState<{ key: ScenarioKey; remainingTicks: number } | null>(null)
  const [metrics, setMetrics] = useState(initializeCrowdMetrics)
  const [selectedFrom, setSelectedFrom] = useState<ZoneId>('gateB')
  const [selectedTo, setSelectedTo] = useState<ZoneId>('seatingB')
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>(() => deriveAlerts(metrics, Date.now(), 'preMatch'))
  const [suggestions, setSuggestions] = useState<string[]>([
    'Leave now',
    'Use Gate C',
    'Food court busy?',
  ])
  const [chatMessages, setChatMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Welcome to CrowdPilot AI. I can recommend the best gate, route, food timing, restrooms, and exits using live stadium intelligence.',
      createdAt: Date.now(),
    },
  ])

  useEffect(() => {
    const clock = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMetrics((prev) => updateCrowdMetrics(prev, scenario?.key ?? null, phase))
      setScenario((prev) => {
        if (!prev) return prev
        if (prev.remainingTicks <= 1) return null
        return {
          key: prev.key,
          remainingTicks: prev.remainingTicks - 1,
        }
      })
    }, SIMULATION_TICK_MS)

    return () => window.clearInterval(timer)
  }, [scenario?.key, phase])

  const queueLengths = useMemo(() => estimateQueueLengths(metrics, phase), [metrics, phase])

  useEffect(() => {
    const generated = deriveAlerts(metrics, Date.now(), phase)
    setAlerts(generated)

    if (routePlan) {
      setRoutePlan(planSmartRoute(routePlan.from, routePlan.to, metrics, queueLengths))
    }
    const nextSuggestions = generated.slice(0, 3).map((item) => item.message.replace(' — ', ': '))
    setSuggestions(nextSuggestions)
  }, [metrics, phase, queueLengths, routePlan])

  const waitTimes = useMemo(() => calculateWaitTimes(metrics, queueLengths), [metrics, queueLengths])
  const overall = useMemo(() => getOverallCrowdStatus(metrics), [metrics])
  const quickInsights = useMemo(() => getQuickInsights(metrics), [metrics])
  const kpis = useMemo(() => deriveKpis(metrics, waitTimes), [metrics, waitTimes])
  const operationsInsight = useMemo(
    () => deriveOperationsInsight(metrics, waitTimes, phase, selectedTo),
    [metrics, waitTimes, phase, selectedTo],
  )
  const forecast = useMemo(() => buildNextTenMinuteForecast(metrics, phase), [metrics, phase])
  const evacuationExit = useMemo(
    () => (['exitA', 'exitB'] as ZoneId[]).reduce((best, current) => (metrics[current].density < metrics[best].density ? current : best)),
    [metrics],
  )
  const evacuationRoute = useMemo(
    () => (phase === 'matchEnd' ? planSmartRoute(selectedFrom, evacuationExit, metrics, queueLengths) : null),
    [phase, selectedFrom, evacuationExit, metrics, queueLengths],
  )

  function triggerScenario(key: ScenarioKey) {
    setScenario({ key, remainingTicks: 3 })
    const message: CopilotMessage = {
      id: `scenario-${Date.now()}`,
      role: 'assistant',
      text: `Simulation event triggered: ${scenarioLabel(key)}. Crowd dynamics are updating live.`,
      createdAt: Date.now(),
    }
    setChatMessages((prev) => [...prev.slice(-9), message])
  }

  function setMatchControl(nextPhase: MatchPhase) {
    setPhase(nextPhase)
    const scenarioByPhase: Partial<Record<MatchPhase, ScenarioKey>> = {
      preMatch: 'gateCrowd',
      inningsBreak: 'halftimeSurge',
      matchEnd: 'exitRush',
    }

    const linkedScenario = scenarioByPhase[nextPhase]
    if (linkedScenario) {
      triggerScenario(linkedScenario)
    }

    const guidance =
      nextPhase === 'preMatch'
        ? 'Pre-match inflow active. Optimize gate and tunnel balancing.'
        : nextPhase === 'firstInnings'
          ? 'First innings: seating bowl stabilizing with steady concourse usage.'
          : nextPhase === 'inningsBreak'
            ? 'Innings break: food and restroom surge expected on concourse ring.'
            : nextPhase === 'secondInnings'
              ? 'Second innings: stable occupancy with moderate circulation.'
              : 'Match end: exit surge underway. Prioritize fastest dispersal corridors.'

    setChatMessages((prev) => [
      ...prev.slice(-8),
      {
        id: `phase-${Date.now()}`,
        role: 'assistant',
        text: guidance,
        createdAt: Date.now(),
      },
    ])
  }

  function computeRoute() {
    const planned = planSmartRoute(selectedFrom, selectedTo, metrics, queueLengths)
    setRoutePlan(planned)
  }

  function sendUserMessage(input: string) {
    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: input,
      createdAt: Date.now(),
    }

    const assistantMessage: CopilotMessage = {
      id: `assistant-${Date.now() + 1}`,
      role: 'assistant',
      text: generateCopilotReply(input, {
        from: selectedFrom,
        metrics,
      }),
      createdAt: Date.now() + 1,
    }

    setChatMessages((prev) => [...prev.slice(-8), userMessage, assistantMessage])
  }

  const zoneOptions = Object.values(STADIUM_ZONES)

  return {
    now,
    phase,
    setMatchControl,
    metrics,
    waitTimes,
    queueLengths,
    alerts,
    suggestions,
    quickInsights,
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
    triggerScenario,
    scenario,
    evacuationRoute,
    chatMessages,
    sendUserMessage,
  }
}
