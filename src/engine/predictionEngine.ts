import type { CrowdMetricsByZone, MatchPhase, QueueByZone, ZoneId } from '../types'
import { crowdMlEngine } from '../ml/crowdMlEngine'

const ALL_GATES: ZoneId[] = ['gateA', 'gateB', 'gateC']
const ALL_EXITS: ZoneId[] = ['exitA', 'exitB']

export interface CrowdPrediction {
  gateSuggestion: ZoneId
  exitSuggestion: ZoneId
  queuePressureIndex: number
  growthIndex: number
  balancingSuggestion: string
}

export function predictCrowdState(
  metrics: CrowdMetricsByZone,
  queues: QueueByZone,
  phase: MatchPhase,
): CrowdPrediction {
  const phaseMultiplier =
    phase === 'preMatch' ? 1.18 : phase === 'inningsBreak' ? 1.24 : phase === 'matchEnd' ? 1.3 : 1.05

  const growthIndex = Number(
    (
      Object.values(metrics).reduce((sum, zone) => sum + Math.max(zone.trend, 0), 0) /
      Object.values(metrics).length *
      phaseMultiplier *
      100
    ).toFixed(2),
  )

  const queuePressureIndex = Number(
    (
      Object.values(queues).reduce((sum, value) => sum + (value ?? 0), 0) /
      Math.max(1, Object.keys(queues).length)
    ).toFixed(2),
  )

  const heuristicGateSuggestion = ALL_GATES.reduce((best, candidate) =>
    metrics[candidate].density + metrics[candidate].trend * 10 < metrics[best].density + metrics[best].trend * 10 ? candidate : best,
  )

  const heuristicExitSuggestion = ALL_EXITS.reduce((best, candidate) =>
    metrics[candidate].density + metrics[candidate].trend * 10 < metrics[best].density + metrics[best].trend * 10 ? candidate : best,
  )

  // Train a tiny online model from live feedback, then blend with heuristic baseline.
  crowdMlEngine.train(metrics, queues, phase)
  const mlGate = crowdMlEngine.chooseGate(metrics, queues, phase)
  const mlExit = crowdMlEngine.chooseExit(metrics, queues, phase)

  const gateSuggestion =
    metrics[mlGate].density <= metrics[heuristicGateSuggestion].density + 6 ? mlGate : heuristicGateSuggestion
  const exitSuggestion =
    metrics[mlExit].density <= metrics[heuristicExitSuggestion].density + 6 ? mlExit : heuristicExitSuggestion

  const balancingSuggestion =
    growthIndex > 45
      ? `ML-assisted balancing: shift fans toward ${gateSuggestion} and clear lanes to ${exitSuggestion}.`
      : `ML-assisted flow stable. Keep dynamic signage aligned to ${gateSuggestion}.`

  return {
    gateSuggestion,
    exitSuggestion,
    queuePressureIndex,
    growthIndex,
    balancingSuggestion,
  }
}
