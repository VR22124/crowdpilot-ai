import {
  ENTRY_ZONES,
  EXIT_ZONES,
  FACILITY_ZONES,
  RESTROOM_ZONES,
  STADIUM_ZONES,
  ZONE_SEQUENCE,
} from '../data/stadium'
import type {
  AlertItem,
  CrowdMetricsByZone,
  ForecastItem,
  KpiMetrics,
  MatchPhase,
  OperationsInsight,
  QueueByZone,
  ScenarioKey,
  WaitTimeItem,
  ZoneId,
} from '../types'

export function calculateWaitTimes(metrics: CrowdMetricsByZone, queues: QueueByZone): WaitTimeItem[] {
  const targets: ZoneId[] = [...ENTRY_ZONES, ...FACILITY_ZONES]

  return targets.map((zoneId) => {
    const zone = STADIUM_ZONES[zoneId]
    const density = metrics[zoneId].density
    const queueLength = queues[zoneId] ?? 0

    const base = zone.category === 'entry' ? 2.5 : zone.id === 'foodCourt' ? 4.5 : 2.2
    const multiplier = zone.category === 'entry' ? 0.17 : zone.id === 'foodCourt' ? 0.24 : 0.16
    const queuePenalty = zone.id === 'foodCourt' ? queueLength * 0.22 : queueLength * 0.18

    return {
      zoneId,
      label: zone.label,
      minutes: Math.round(base + density * multiplier + queuePenalty),
      classification: metrics[zoneId].classification,
      queueLength,
    }
  })
}

export function deriveAlerts(metrics: CrowdMetricsByZone, now: number, phase: MatchPhase): AlertItem[] {
  const alerts: AlertItem[] = []

  for (const zone of Object.values(STADIUM_ZONES)) {
    const current = metrics[zone.id]

    if (current.classification === 'Critical') {
      alerts.push({
        id: `${zone.id}-${now}-critical`,
        createdAt: now,
        severity: 'critical',
        message: `${zone.label} congested — avoid this zone and use alternatives.`,
      })
      continue
    }

    if (current.classification === 'High' && current.predictedClassification === 'Critical') {
      alerts.push({
        id: `${zone.id}-${now}-rising`,
        createdAt: now,
        severity: 'warning',
        message: `${zone.label} rising quickly — reroute before congestion peaks.`,
      })
    }
  }

  const bestGate = ['gateA', 'gateB', 'gateC'].reduce((best, current) =>
    metrics[current as ZoneId].density < metrics[best as ZoneId].density ? current : best,
  )
  alerts.push({
    id: `best-gate-${now}`,
    createdAt: now,
    severity: 'info',
    message: `${STADIUM_ZONES[bestGate as ZoneId].label} currently has the fastest entry flow.`,
  })

  if (phase === 'matchEnd') {
    const fastestExit = EXIT_ZONES.reduce((best, current) =>
      metrics[current].density < metrics[best].density ? current : best,
    )
    alerts.unshift({
      id: `match-end-${now}`,
      createdAt: now,
      severity: 'warning',
      message: `Match end surge — direct crowds toward ${STADIUM_ZONES[fastestExit].label}.`,
    })
  }

  return alerts.slice(0, 5)
}

export function getOverallCrowdStatus(metrics: CrowdMetricsByZone): {
  label: 'Stable' | 'Elevated' | 'Busy' | 'Critical'
  averageDensity: number
} {
  const values = Object.values(metrics)
  const averageDensity = values.reduce((sum, item) => sum + item.density, 0) / values.length

  if (averageDensity < 30) return { label: 'Stable', averageDensity }
  if (averageDensity < 50) return { label: 'Elevated', averageDensity }
  if (averageDensity < 70) return { label: 'Busy', averageDensity }
  return { label: 'Critical', averageDensity }
}

export function scenarioLabel(key: ScenarioKey): string {
  return {
    gateCrowd: 'Increase gate crowd',
    foodRush: 'Food rush',
    halftimeSurge: 'Halftime surge',
    exitRush: 'Match end exit rush',
  }[key]
}

export function deriveOperationsInsight(
  metrics: CrowdMetricsByZone,
  waitTimes: WaitTimeItem[],
  phase: MatchPhase,
  targetSection: ZoneId,
): OperationsInsight {
  const bestEntry = getLowestDensity(ENTRY_ZONES, metrics)
  const bestExit = getLowestDensity(EXIT_ZONES, metrics)
  const bestRestroom = getLowestDensity(RESTROOM_ZONES, metrics)
  const worstProjected = ZONE_SEQUENCE.reduce((worst, current) => {
    const currentScore = metrics[current].density + Math.max(metrics[current].trend, 0) * 2.5
    const worstScore = metrics[worst].density + Math.max(metrics[worst].trend, 0) * 2.5
    return currentScore > worstScore ? current : worst
  }, ZONE_SEQUENCE[0])

  const foodWait = waitTimes.find((item) => item.zoneId === 'foodCourt')
  const bestFoodOption = foodWait
    ? `Food Court ~${foodWait.minutes} min (${foodWait.classification})`
    : 'Food Court stable'

  const nearestRestroom =
    targetSection === 'seatingC'
      ? `Restroom C/D cluster (${STADIUM_ZONES[bestRestroom].label})`
      : targetSection === 'seatingA'
        ? `Restroom A/B cluster (${STADIUM_ZONES[bestRestroom].label})`
        : `Restroom B/C cluster (${STADIUM_ZONES[bestRestroom].label})`
  const nearestFood =
    targetSection === 'seatingC'
      ? `Food East / Food South (${bestFoodOption})`
      : targetSection === 'seatingA'
        ? `Food West / Food North (${bestFoodOption})`
        : `Food North / Food South (${bestFoodOption})`
  const avoidStand = metrics.seatingB.classification === 'High' || metrics.seatingB.classification === 'Critical' ? 'Avoid Middle Tier · North Stand (B2/B3)' : 'Avoid Upper Tier sections with rising density'

  const recommendedAction =
    phase === 'inningsBreak'
      ? 'Open all food/restroom queues on concourse ring and stagger return announcements.'
      : phase === 'matchEnd'
        ? `Pre-open perimeter gates and route exits through ${STADIUM_ZONES[bestExit].label}.`
        : `Promote ${STADIUM_ZONES[bestEntry].label} for the target section and keep tunnels balanced.`

  return {
    bestGateForSection: STADIUM_ZONES[bestEntry].label,
    nearestRestroomToSeat: nearestRestroom,
    nearestFoodToSection: nearestFood,
    bestExitAfterMatch: STADIUM_ZONES[bestExit].label,
    avoidCrowdedStand: avoidStand,
    leaveInMinutes: Math.max(2, Math.round((100 - metrics[bestExit].density) / 8)),
    congestionBuilding: `${STADIUM_ZONES[worstProjected].label} trending to ${metrics[worstProjected].predictedClassification}`,
    recommendedAction,
  }
}

export function estimateQueueLengths(metrics: CrowdMetricsByZone, phase: MatchPhase): QueueByZone {
  const phaseBoost =
    phase === 'inningsBreak'
      ? { food: 8, restroom: 7, gate: -2 }
      : phase === 'matchEnd'
        ? { food: -2, restroom: 1, gate: -1 }
        : phase === 'preMatch'
          ? { food: 1, restroom: 0, gate: 5 }
          : { food: -1, restroom: -1, gate: 0 }

  return {
    gateA: queueFromDensity(metrics.gateA.density, phaseBoost.gate),
    gateB: queueFromDensity(metrics.gateB.density, phaseBoost.gate + 2),
    gateC: queueFromDensity(metrics.gateC.density, phaseBoost.gate),
    foodCourt: queueFromDensity(metrics.foodCourt.density, phaseBoost.food + 4),
    restroomNorth: queueFromDensity(metrics.restroomNorth.density, phaseBoost.restroom),
    restroomSouth: queueFromDensity(metrics.restroomSouth.density, phaseBoost.restroom),
  }
}

export function buildNextTenMinuteForecast(
  metrics: CrowdMetricsByZone,
  phase: MatchPhase,
): ForecastItem[] {
  const highestGateTrend = ENTRY_ZONES.reduce((best, current) =>
    metrics[current].trend > metrics[best].trend ? current : best,
  )

  const bestFutureExit = EXIT_ZONES.reduce((best, current) => {
    const projected = metrics[current].density + metrics[current].trend * 2
    const bestProjected = metrics[best].density + metrics[best].trend * 2
    return projected < bestProjected ? current : best
  })

  const foodSignal = metrics.foodCourt.trend > 0.6 || phase === 'inningsBreak'

  return [
    {
      id: 'gate-trend',
      text: `${STADIUM_ZONES[highestGateTrend].label} will become crowded in the next 10 min.`,
      confidence: clampConfidence(0.68 + Math.max(metrics[highestGateTrend].trend, 0) * 0.05),
    },
    {
      id: 'food-forecast',
      text: foodSignal ? 'Food Court surge expected — deploy overflow queue lanes.' : 'Food Court demand likely to remain moderate.',
      confidence: foodSignal ? 0.84 : 0.63,
    },
    {
      id: 'exit-forecast',
      text: `${STADIUM_ZONES[bestFutureExit].label} projected optimal in ~6 min.`,
      confidence: clampConfidence(0.66 + (1 - metrics[bestFutureExit].density / 100) * 0.2),
    },
  ]
}

export function deriveKpis(metrics: CrowdMetricsByZone, waitTimes: WaitTimeItem[]): KpiMetrics {
  const totalCapacity = Object.values(STADIUM_ZONES).reduce((sum, zone) => sum + zone.capacity, 0)
  const crowdLoad = Object.values(metrics).reduce(
    (sum, zoneMetric, index) => sum + (zoneMetric.density / 100) * Object.values(STADIUM_ZONES)[index].capacity,
    0,
  )
  const avgWaitTime = waitTimes.reduce((sum, item) => sum + item.minutes, 0) / waitTimes.length
  const criticalCount = Object.values(metrics).filter((zone) => zone.classification === 'Critical').length
  const highCount = Object.values(metrics).filter((zone) => zone.classification === 'High').length
  const congestionScore = Math.min(
    100,
    (Object.values(metrics).reduce((sum, zone) => sum + zone.density, 0) / Object.keys(metrics).length) +
      criticalCount * 9 +
      highCount * 3,
  )
  const flowEfficiency = Math.max(8, 100 - congestionScore * 0.78)

  return {
    totalCrowd: Math.round(Math.min(crowdLoad, totalCapacity)),
    avgWaitTime: Number(avgWaitTime.toFixed(1)),
    congestionScore: Number(congestionScore.toFixed(1)),
    flowEfficiency: Number(flowEfficiency.toFixed(1)),
    riskLevel:
      criticalCount >= 3 ? 'Critical' : criticalCount >= 1 || highCount >= 4 ? 'High' : highCount >= 2 ? 'Medium' : 'Low',
  }
}

function getLowestDensity(candidates: ZoneId[], metrics: CrowdMetricsByZone): ZoneId {
  return candidates.reduce((best, current) =>
    metrics[current].density < metrics[best].density ? current : best,
  )
}

function clampConfidence(value: number): number {
  return Number(Math.max(0.55, Math.min(0.98, value)).toFixed(2))
}

function queueFromDensity(density: number, phaseBoost: number): number {
  return Math.max(1, Math.round(density * 0.18 + phaseBoost))
}
