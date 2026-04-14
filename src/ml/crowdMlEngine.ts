import type { CrowdMetricsByZone, MatchPhase, QueueByZone, ZoneId } from '../types'
import { TinyLinearModel, type TinyLinearModelState } from './tinyLinearModel'
import { loadHostedTfliteSeedWeights } from './hostedTfliteSeed'

const MODEL_VERSION = 'v1'
const STORAGE_KEY = `crowdpilot.ml.${MODEL_VERSION}`

interface PersistedState {
  gateModel: TinyLinearModelState
  exitModel: TinyLinearModelState
}

const GATES: ZoneId[] = ['gateA', 'gateB', 'gateC']
const EXITS: ZoneId[] = ['exitA', 'exitB']

function phaseToSignal(phase: MatchPhase): number {
  return phase === 'preMatch' ? 0.2 : phase === 'inningsBreak' ? 0.6 : phase === 'matchEnd' ? 1 : 0.4
}

function queueSignal(queues: QueueByZone): number {
  const values = Object.values(queues).map((value) => value ?? 0)
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length / 30
}

function normalizeDensity(value: number): number {
  return Math.max(0, Math.min(1, value / 100))
}

function buildFeatures(metrics: CrowdMetricsByZone, queues: QueueByZone, phase: MatchPhase, candidate: ZoneId): number[] {
  const candidateDensity = normalizeDensity(metrics[candidate].density)
  const candidateTrend = Math.max(-1, Math.min(1, metrics[candidate].trend / 3))
  const gateMean = GATES.reduce((sum, gate) => sum + normalizeDensity(metrics[gate].density), 0) / GATES.length
  const exitMean = EXITS.reduce((sum, exit) => sum + normalizeDensity(metrics[exit].density), 0) / EXITS.length
  return [
    candidateDensity,
    candidateTrend,
    gateMean,
    exitMean,
    queueSignal(queues),
    phaseToSignal(phase),
    1,
  ]
}

class CrowdMlEngine {
  private gateModel = new TinyLinearModel(7, 0.03)
  private exitModel = new TinyLinearModel(7, 0.03)
  private initializedFromHostedSeed = false

  constructor() {
    this.load()
  }

  async initializeFromHostedModel(): Promise<void> {
    if (this.initializedFromHostedSeed) return

    const gateWeights = await loadHostedTfliteSeedWeights(7)
    if (!gateWeights) return

    const exitWeights = gateWeights.map((value, index) => Number((value * (index % 2 === 0 ? 0.92 : 1.08)).toFixed(5)))
    this.gateModel.importState({
      weights: gateWeights,
      bias: 0,
      learningRate: 0.03,
    })
    this.exitModel.importState({
      weights: exitWeights,
      bias: 0,
      learningRate: 0.03,
    })

    this.initializedFromHostedSeed = true
  }

  chooseGate(metrics: CrowdMetricsByZone, queues: QueueByZone, phase: MatchPhase): ZoneId {
    return GATES.reduce((best, current) => {
      const bestScore = this.gateModel.predict(buildFeatures(metrics, queues, phase, best))
      const currentScore = this.gateModel.predict(buildFeatures(metrics, queues, phase, current))
      return currentScore > bestScore ? current : best
    }, GATES[0])
  }

  chooseExit(metrics: CrowdMetricsByZone, queues: QueueByZone, phase: MatchPhase): ZoneId {
    return EXITS.reduce((best, current) => {
      const bestScore = this.exitModel.predict(buildFeatures(metrics, queues, phase, best))
      const currentScore = this.exitModel.predict(buildFeatures(metrics, queues, phase, current))
      return currentScore > bestScore ? current : best
    }, EXITS[0])
  }

  train(metrics: CrowdMetricsByZone, queues: QueueByZone, phase: MatchPhase): void {
    for (const gate of GATES) {
      const target = 1 - normalizeDensity(metrics[gate].density)
      this.gateModel.train(buildFeatures(metrics, queues, phase, gate), target)
    }

    for (const exit of EXITS) {
      const target = 1 - normalizeDensity(metrics[exit].density)
      this.exitModel.train(buildFeatures(metrics, queues, phase, exit), target)
    }

    this.persist()
  }

  private persist(): void {
    if (typeof window === 'undefined') return

    const payload: PersistedState = {
      gateModel: this.gateModel.exportState(),
      exitModel: this.exitModel.exportState(),
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore persistence failures.
    }
  }

  private load(): void {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as PersistedState
      this.gateModel.importState(parsed.gateModel)
      this.exitModel.importState(parsed.exitModel)
    } catch {
      // Ignore invalid persisted model state.
    }
  }
}

export const crowdMlEngine = new CrowdMlEngine()
