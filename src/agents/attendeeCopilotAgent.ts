import {
  ENTRY_ZONES,
  EXIT_ZONES,
  RESTROOM_ZONES,
  STADIUM_ZONES,
  ZONE_SEQUENCE,
} from '../data/stadium'
import type { CrowdMetricsByZone, RoutePlan, ZoneId } from '../types'
import { planSmartRoute } from './routeOptimizationAgent'

interface CopilotContext {
  from: ZoneId
  metrics: CrowdMetricsByZone
}

export function generateCopilotReply(question: string, context: CopilotContext): string {
  const q = question.toLowerCase()
  const { from, metrics } = context

  if (q.includes('food')) {
    return buildRouteRecommendation(from, 'foodCourt', metrics, 'Food Court')
  }

  if (q.includes('fastest gate') || q.includes('best gate') || q.includes('entry')) {
    const bestGate = getLeastCrowded(ENTRY_ZONES, metrics)
    return buildRouteRecommendation(from, bestGate, metrics, STADIUM_ZONES[bestGate].label)
  }

  if (q.includes('restroom')) {
    const bestRestroom = getLeastCrowded(RESTROOM_ZONES, metrics)
    return buildRouteRecommendation(from, bestRestroom, metrics, STADIUM_ZONES[bestRestroom].label)
  }

  if (q.includes('best exit') || q.includes('leave') || q.includes('exit')) {
    const bestExit = getLeastCrowded(EXIT_ZONES, metrics)
    const routeMessage = buildRouteRecommendation(from, bestExit, metrics, STADIUM_ZONES[bestExit].label)
    const shouldLeave = metrics[bestExit].classification !== 'Critical'
    return `${routeMessage} ${shouldLeave ? 'You can leave now for a smoother exit.' : 'Hold for a few minutes if possible to avoid peak congestion.'}`
  }

  const quickInsights = getQuickInsights(metrics)
  return `Live snapshot: ${quickInsights}. Ask me for the fastest gate, least crowded restroom, best exit, or food timing.`
}

export function getQuickInsights(metrics: CrowdMetricsByZone): string {
  const critical = ZONE_SEQUENCE.filter((zoneId) => metrics[zoneId].classification === 'Critical')
  const high = ZONE_SEQUENCE.filter((zoneId) => metrics[zoneId].classification === 'High')
  const bestEntry = getLeastCrowded(ENTRY_ZONES, metrics)
  const bestExit = getLeastCrowded(EXIT_ZONES, metrics)

  if (critical.length > 0) {
    return `${critical.length} critical zone(s), ${high.length} high-density zone(s). Best gate: ${STADIUM_ZONES[bestEntry].label}. Best exit: ${STADIUM_ZONES[bestExit].label}`
  }

  return `${high.length} high-density zone(s). Best gate: ${STADIUM_ZONES[bestEntry].label}. Best exit: ${STADIUM_ZONES[bestExit].label}`
}

function buildRouteRecommendation(
  from: ZoneId,
  destination: ZoneId,
  metrics: CrowdMetricsByZone,
  destinationLabel: string,
): string {
  if (from === destination) {
    const local = metrics[destination]
    return `You are already at ${destinationLabel}. Current density is ${local.classification} (${Math.round(local.density)}%).`
  }

  const route = planSmartRoute(from, destination, metrics)
  return formatRouteMessage(route, destinationLabel)
}

function formatRouteMessage(route: RoutePlan, label: string): string {
  const primary = route.primaryPath.map((zoneId) => STADIUM_ZONES[zoneId].label).join(' → ')
  const alt = route.alternativePath.map((zoneId) => STADIUM_ZONES[zoneId].label).join(' → ')

  return `${label} is recommended. Primary route: ${primary} (~${route.etaMinutes} min). Alternate route: ${alt} (~${route.alternativeEtaMinutes} min).`
}

function getLeastCrowded(candidates: ZoneId[], metrics: CrowdMetricsByZone): ZoneId {
  return candidates.reduce((best, current) =>
    metrics[current].density < metrics[best].density ? current : best,
  )
}
