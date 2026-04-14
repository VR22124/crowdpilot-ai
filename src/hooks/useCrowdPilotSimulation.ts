import { useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { appEnv } from '../config/env'
import { getPerfSnapshot, setPredictionLatencyMs, setRouteComputeMs, startFpsTracking } from '../engine/perfMetrics'
import { crowdMlEngine } from '../ml/crowdMlEngine'
import { requestPredictionEngine } from '../services/googleCloud'
import { initializeFirebaseServices, startPerformanceTrace, trackAnalyticsEvent } from '../services/firebaseClient'
import { initializeWebPushMessaging } from '../services/firebaseMessaging'
import { askGeminiForCrowdAdvice } from '../services/geminiService'
import { createRateLimiter, sanitizeInput } from '../services/security'
import { startLivePipeline } from '../realtime/livePipeline'
import { useLiveCrowdStore } from '../realtime/liveCrowdStore'
import { selectAverageDensity } from '../store/selectors'
import type {
  AlertItem,
  CopilotMessage,
  MatchPhase,
  RoutePlan,
  ScenarioKey,
  ZoneId,
} from '../types'

export function useCrowdPilotSimulation() {
  const rateLimiter = useRef(createRateLimiter(8, 60_000))
  const [densityHistory, setDensityHistory] = useState<number[]>([])
  const [routeUsageCount, setRouteUsageCount] = useState(0)
  const [chatInteractions, setChatInteractions] = useState(0)
  const [lastPredictionLatencyMs, setLastPredictionLatencyMs] = useState(0)
  const [selectedFrom, setSelectedFrom] = useState<ZoneId>('gateB')
  const [selectedTo, setSelectedTo] = useState<ZoneId>('seatingB')
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null)
  const [plannedRoute, setPlannedRoute] = useState<{ from: ZoneId; to: ZoneId } | null>(null)

  const liveSnapshot = useLiveCrowdStore()
  const [now, setNow] = useState(() => Date.now())
  const [phase, setPhase] = useState<MatchPhase>('preMatch')
  const [scenario, setScenario] = useState<{ key: ScenarioKey; remainingTicks: number } | null>(null)
  const [metrics, setMetrics] = useState(initializeCrowdMetrics)
  const [queueLengths, setQueueLengths] = useState(() => estimateQueueLengths(metrics, 'preMatch'))
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
    if (appEnv.enableTinyLocalMl) {
      void crowdMlEngine.initializeFromHostedModel()
    }

    void initializeFirebaseServices().then(() => {
      void initializeWebPushMessaging()
    })
    const stopTracking = startFpsTracking()

    return () => stopTracking()
  }, [])

  useEffect(() => {
    const stop = startLivePipeline({ phase })
    return () => stop()
  }, [phase])

  useEffect(() => {
    if (!liveSnapshot) return
    setMetrics(liveSnapshot.metrics)
    setQueueLengths(liveSnapshot.queues)
    setNow(liveSnapshot.updatedAt)

    const avgDensity = selectAverageDensity(liveSnapshot.metrics)

    setDensityHistory((prev) => [...prev.slice(-19), Number(avgDensity.toFixed(1))])
  }, [liveSnapshot])

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
    }, 5000)

    return () => window.clearInterval(timer)
  }, [scenario?.key, phase])

  useEffect(() => {
    const generated = deriveAlerts(metrics, Date.now(), phase)
    setAlerts(generated)

    if (plannedRoute) {
      const started = performance.now()
      const updated = planSmartRoute(plannedRoute.from, plannedRoute.to, metrics, queueLengths)
      setRoutePlan(updated)
      setRouteComputeMs(performance.now() - started)
    }

    const nextSuggestions = generated.slice(0, 3).map((item) => item.message.replace(' — ', ': '))
    setSuggestions(nextSuggestions)
  }, [metrics, phase, queueLengths, plannedRoute])

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
    trackAnalyticsEvent('scenario_triggered', { scenario: key })

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
    trackAnalyticsEvent('phase_changed', { phase: nextPhase })

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

  async function computeRoute() {
    const selected = { from: selectedFrom, to: selectedTo }
    setPlannedRoute(selected)

    const routeTrace = startPerformanceTrace('route_compute')
    const started = performance.now()
    const planned = planSmartRoute(selected.from, selected.to, metrics, queueLengths)
    setRoutePlan(planned)
    setRouteUsageCount((count) => count + 1)
    setRouteComputeMs(performance.now() - started)
    routeTrace.stop()
    trackAnalyticsEvent('route_computed', { from: selected.from, to: selected.to })

    const prediction = await requestPredictionEngine({
      metrics,
      queues: queueLengths,
      phase,
      from: selected.from,
      to: selected.to,
      timestamp: Date.now(),
    })

    if (prediction) {
      setPredictionLatencyMs(prediction.latencyMs)
      setLastPredictionLatencyMs(prediction.latencyMs)
      setSuggestions((prev) => [prediction.reason, ...prev].slice(0, 6))
    }
  }

  async function sendUserMessage(input: string) {
    const cleaned = sanitizeInput(input)
    if (!cleaned) return
    if (!rateLimiter.current.canProceed()) {
      setChatMessages((prev) => [
        ...prev.slice(-8),
        {
          id: `assistant-rate-${Date.now()}`,
          role: 'assistant',
          text: 'Rate limit reached. Please wait a moment before sending more requests.',
          createdAt: Date.now(),
        },
      ])
      return
    }

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleaned,
      createdAt: Date.now(),
    }

    setChatInteractions((count) => count + 1)
    trackAnalyticsEvent('chat_message_sent', { length: cleaned.length })
    setChatMessages((prev) => [...prev.slice(-9), userMessage])

    const geminiReply = await askGeminiForCrowdAdvice({
      question: cleaned,
      quickInsights,
      fromLabel: STADIUM_ZONES[selectedFrom].label,
    })

    if (geminiReply) {
      setChatMessages((prev) => [
        ...prev.slice(-9),
        {
          id: `assistant-gemini-${Date.now() + 2}`,
          role: 'assistant',
          text: `${geminiReply} (Gemini)`,
          createdAt: Date.now() + 2,
        },
      ])
      trackAnalyticsEvent('gemini_response_used', { chars: geminiReply.length })
      return
    }

    setChatMessages((prev) => [
      ...prev.slice(-9),
      {
        id: `assistant-gemini-unavailable-${Date.now() + 3}`,
        role: 'assistant',
        text: 'Gemini is temporarily unavailable. Please try again in a moment.',
        createdAt: Date.now() + 3,
      },
    ])
  }

  const zoneOptions = Object.values(STADIUM_ZONES)
  const perf = getPerfSnapshot()
  const predictedGate = liveSnapshot?.prediction?.gateSuggestion ?? 'gateB'

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
    routeUsageCount,
    chatInteractions,
    densityHistory,
    popularGate: STADIUM_ZONES[predictedGate].label,
    liveSource: liveSnapshot?.source ?? 'simulated',
    perfMetrics: {
      fps: perf.fps,
      renderMs: perf.avgRenderMs,
      routeComputeMs: perf.routeComputeMs,
      predictionLatencyMs: perf.predictionLatencyMs || lastPredictionLatencyMs,
    },
    showDevMetrics: appEnv.enableDevMetricsPanel,
  }
}
