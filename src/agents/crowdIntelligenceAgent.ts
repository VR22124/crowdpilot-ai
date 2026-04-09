import type {
  CrowdMetricsByZone,
  DensityClassification,
  MatchPhase,
  ScenarioKey,
  ZoneId,
  ZoneMetrics,
} from '../types'
import { STADIUM_ZONES } from '../data/stadium'

const CLASSIFICATION_THRESHOLDS = {
  low: 30,
  medium: 55,
  high: 75,
}

const SCENARIO_BIAS: Record<ScenarioKey, Partial<Record<ZoneId, number>>> = {
  gateCrowd: {
    gateA: 16,
    gateB: 10,
    gateC: 4,
    seatingA: 6,
    seatingB: 8,
  },
  foodRush: {
    foodCourt: 22,
    seatingA: 6,
    seatingB: 8,
    seatingC: 6,
    restroomNorth: 5,
    restroomSouth: 5,
  },
  halftimeSurge: {
    foodCourt: 16,
    restroomNorth: 14,
    restroomSouth: 14,
    seatingA: -6,
    seatingB: -8,
    seatingC: -6,
  },
  exitRush: {
    exitA: 18,
    exitB: 18,
    seatingA: 10,
    seatingB: 14,
    seatingC: 10,
  },
}

const BASELINE_BY_CATEGORY = {
  entry: 34,
  facility: 42,
  seating: 48,
  exit: 26,
}

const PHASE_BIAS: Record<MatchPhase, Partial<Record<ZoneId, number>>> = {
  preMatch: {
    gateA: 8,
    gateB: 12,
    gateC: 7,
    seatingA: 6,
    seatingB: 10,
    seatingC: 6,
  },
  firstInnings: {
    seatingA: 11,
    seatingB: 14,
    seatingC: 11,
    foodCourt: -8,
    restroomNorth: -6,
    restroomSouth: -6,
  },
  inningsBreak: {
    seatingA: -10,
    seatingB: -12,
    seatingC: -10,
    foodCourt: 18,
    restroomNorth: 16,
    restroomSouth: 16,
  },
  secondInnings: {
    seatingA: 10,
    seatingB: 13,
    seatingC: 10,
    foodCourt: -4,
    restroomNorth: -3,
    restroomSouth: -3,
  },
  matchEnd: {
    exitA: 20,
    exitB: 20,
    seatingA: 10,
    seatingB: 14,
    seatingC: 10,
    gateA: -8,
    gateB: -8,
    gateC: -8,
  },
}

export function classifyDensity(density: number): DensityClassification {
  if (density < CLASSIFICATION_THRESHOLDS.low) return 'Low'
  if (density < CLASSIFICATION_THRESHOLDS.medium) return 'Medium'
  if (density < CLASSIFICATION_THRESHOLDS.high) return 'High'
  return 'Critical'
}

export function initializeCrowdMetrics(): CrowdMetricsByZone {
  const snapshot = {} as CrowdMetricsByZone

  for (const zone of Object.values(STADIUM_ZONES)) {
    const baseline = BASELINE_BY_CATEGORY[zone.category]
    const density = clampDensity(baseline + jitter(12))
    snapshot[zone.id] = {
      density,
      classification: classifyDensity(density),
      predictedClassification: classifyDensity(density + jitter(8)),
      trend: 0,
    }
  }

  return snapshot
}

export function updateCrowdMetrics(
  previous: CrowdMetricsByZone,
  scenario: ScenarioKey | null,
  phase: MatchPhase,
): CrowdMetricsByZone {
  const nextSnapshot = {} as CrowdMetricsByZone

  for (const zone of Object.values(STADIUM_ZONES)) {
    const currentDensity = previous[zone.id].density
    const neighborPressure =
      zone.neighbors.reduce((acc, neighborId) => acc + previous[neighborId].density, 0) /
      zone.neighbors.length
    const scenarioBoost = scenario ? (SCENARIO_BIAS[scenario][zone.id] ?? 0) : 0
    const phaseBoost = PHASE_BIAS[phase][zone.id] ?? 0
    const naturalDrift = jitter(8)
    const reversionToMean = (BASELINE_BY_CATEGORY[zone.category] - currentDensity) * 0.1

    const nextDensity = clampDensity(
      currentDensity +
        reversionToMean +
        naturalDrift +
        scenarioBoost * 0.22 +
        phaseBoost * 0.28 +
        (neighborPressure - currentDensity) * 0.08,
    )

    const trend = nextDensity - currentDensity
    const projectedDensity = clampDensity(nextDensity + trend * 1.2)

    nextSnapshot[zone.id] = {
      density: nextDensity,
      classification: classifyDensity(nextDensity),
      predictedClassification: classifyDensity(projectedDensity),
      trend,
    } satisfies ZoneMetrics
  }

  return nextSnapshot
}

function jitter(range: number): number {
  return (Math.random() - 0.5) * range
}

function clampDensity(value: number): number {
  return Math.max(4, Math.min(100, Number(value.toFixed(1))))
}
