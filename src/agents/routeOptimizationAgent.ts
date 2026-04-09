import { NAV_EDGES, NAV_NODES, PITCH_BLOCK, PITCH_BLOCK_POLYGON, ZONE_TO_NAV_NODE, navPoint, queuePressureAtNode, type NavNodeId } from '../data/navigation'
import { STADIUM_ZONES } from '../data/stadium'
import type { CrowdMetricsByZone, QueueByZone, RoutePlan, ZoneId } from '../types'

interface DijkstraResult {
  nodePath: NavNodeId[]
  cost: number
}

const ADJACENCY = buildAdjacency()

export function planSmartRoute(
  from: ZoneId,
  to: ZoneId,
  metrics: CrowdMetricsByZone,
  queues: QueueByZone = {},
): RoutePlan {
  const fromNode = ZONE_TO_NAV_NODE[from]
  const toNode = ZONE_TO_NAV_NODE[to]

  const primary = dijkstra(fromNode, toNode, metrics, queues)
  const alternativePenalty = new Set(primary.nodePath.slice(1, -1))
  const alternative = dijkstra(fromNode, toNode, metrics, queues, alternativePenalty)

  const primaryZonePath = projectZonePath(from, to, primary.nodePath)
  const alternativeZonePath = projectZonePath(from, to, alternative.nodePath)

  const primaryGeometry = primary.nodePath.map((nodeId) => navPoint(nodeId))
  const alternativeGeometry = alternative.nodePath.map((nodeId) => navPoint(nodeId))
  const directEtaMinutes = estimateDirectEta(from, to, metrics)
  const timeSavedMinutes = Math.max(0, Math.round(directEtaMinutes - primary.cost))
  const avoidedZones = findAvoidedZones(primaryGeometry, primaryZonePath, metrics)
  const crowdAvoided = Math.round(avoidedZones.reduce((sum, zoneId) => sum + metrics[zoneId].density, 0))

  return {
    from,
    to,
    primaryPath: primaryZonePath,
    alternativePath: alternativeZonePath,
    primaryGeometry,
    alternativeGeometry,
    etaMinutes: Math.max(1, Math.round(primary.cost)),
    directEtaMinutes: Math.max(1, Math.round(directEtaMinutes)),
    alternativeEtaMinutes: Math.max(1, Math.round(alternative.cost)),
    timeSavedMinutes,
    crowdAvoided,
    avoidedZones,
    congestionScore: calculateCongestionScore(primary.nodePath, metrics),
    avoidsPitch: !pathTouchesPitch(primaryGeometry),
  }
}

function dijkstra(
  from: NavNodeId,
  to: NavNodeId,
  metrics: CrowdMetricsByZone,
  queues: QueueByZone,
  penalizedNodes?: Set<NavNodeId>,
): DijkstraResult {
  const allNodes = Object.keys(NAV_NODES) as NavNodeId[]
  const unvisited = new Set<NavNodeId>(allNodes)
  const dist = new Map<NavNodeId, number>()
  const prev = new Map<NavNodeId, NavNodeId | null>()

  for (const node of unvisited) {
    dist.set(node, Number.POSITIVE_INFINITY)
    prev.set(node, null)
  }
  dist.set(from, 0)

  while (unvisited.size > 0) {
    let current: NavNodeId | null = null
    let min = Number.POSITIVE_INFINITY

    for (const node of unvisited) {
      const value = dist.get(node) ?? Number.POSITIVE_INFINITY
      if (value < min) {
        min = value
        current = node
      }
    }

    if (!current || current === to) break

    unvisited.delete(current)

    for (const neighbor of ADJACENCY[current] ?? []) {
      if (!unvisited.has(neighbor)) continue

      const candidate =
        (dist.get(current) ?? 0) +
        edgeCost(current, neighbor, metrics, queues, penalizedNodes)

      if (candidate < (dist.get(neighbor) ?? Number.POSITIVE_INFINITY)) {
        dist.set(neighbor, candidate)
        prev.set(neighbor, current)
      }
    }
  }

  const nodePath: NavNodeId[] = []
  let cursor: NavNodeId | null = to

  while (cursor) {
    nodePath.unshift(cursor)
    cursor = prev.get(cursor) ?? null
  }

  if (nodePath[0] !== from) {
    return {
      nodePath: [from, to],
      cost: 10,
    }
  }

  return {
    nodePath,
    cost: dist.get(to) ?? 9,
  }
}

function edgeCost(
  from: NavNodeId,
  to: NavNodeId,
  metrics: CrowdMetricsByZone,
  queues: QueueByZone,
  penalizedNodes?: Set<NavNodeId>,
): number {
  const fromNode = NAV_NODES[from]
  const toNode = NAV_NODES[to]

  const distance = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y)
  const baseMinutes = distance / 20

  const toZone = toNode.zoneId

  const densityPenalty =
    toZone
      ? metrics[toZone].classification === 'Low'
        ? 0.18
        : metrics[toZone].classification === 'Medium'
          ? 0.95
          : metrics[toZone].classification === 'High'
            ? 3.2
            : 6.2
      : toNode.layer === 'concourse'
        ? 0.08
        : 0.28

  const predictedPenalty =
    toZone
      ? metrics[toZone].predictedClassification === 'Critical'
        ? 1.8
        : metrics[toZone].predictedClassification === 'High'
          ? 0.6
          : 0.08
      : 0

  const queuePenalty = queuePressureAtNode(to, queues)

  const alternatePenalty = penalizedNodes?.has(to) ? 1.9 : 0

  const transitionPenalty = strictTransitionPenalty(from, to)

  return baseMinutes + densityPenalty + predictedPenalty + queuePenalty + alternatePenalty + transitionPenalty
}

function calculateCongestionScore(nodePath: NavNodeId[], metrics: CrowdMetricsByZone): number {
  const score =
    nodePath.reduce((sum, nodeId) => {
      const zoneId = NAV_NODES[nodeId].zoneId
      if (!zoneId) return sum + 28
      const density = metrics[zoneId].density
      const weight = metrics[zoneId].classification === 'Critical' ? 1.35 : 1
      return sum + density * weight
    }, 0) / nodePath.length

  return Number(score.toFixed(1))
}

function projectZonePath(from: ZoneId, to: ZoneId, nodePath: NavNodeId[]): ZoneId[] {
  const inPathZones = nodePath
    .map((nodeId) => NAV_NODES[nodeId].zoneId)
    .filter((zoneId): zoneId is ZoneId => Boolean(zoneId))

  const unique = inPathZones.filter((zoneId, idx) => inPathZones.indexOf(zoneId) === idx)
  if (unique.length === 0) return [from, to]
  if (unique[0] !== from) unique.unshift(from)
  if (unique[unique.length - 1] !== to) unique.push(to)
  return unique
}

function pathTouchesPitch(path: Array<{ x: number; y: number }>): boolean {
  for (const point of path) {
    if (pointInPitchPolygon(point.x, point.y)) return true
    const dx = (point.x - PITCH_BLOCK.cx) / PITCH_BLOCK.rx
    const dy = (point.y - PITCH_BLOCK.cy) / PITCH_BLOCK.ry
    if (dx * dx + dy * dy < 1) return true
  }

  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1]
    const b = path[i]
    for (let j = 0; j < PITCH_BLOCK_POLYGON.length; j += 1) {
      const c = PITCH_BLOCK_POLYGON[j]
      const d = PITCH_BLOCK_POLYGON[(j + 1) % PITCH_BLOCK_POLYGON.length]
      if (segmentsIntersect(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y)) {
        return true
      }
    }
  }

  return false
}

function buildAdjacency(): Record<NavNodeId, NavNodeId[]> {
  const adjacency = {} as Record<NavNodeId, NavNodeId[]>
  for (const [a, b] of NAV_EDGES) {
    if (edgeCrossesPitch(a, b)) continue
    if (!adjacency[a]) adjacency[a] = []
    if (!adjacency[b]) adjacency[b] = []
    adjacency[a].push(b)
    adjacency[b].push(a)
  }
  return adjacency
}

function edgeCrossesPitch(a: NavNodeId, b: NavNodeId): boolean {
  const p1 = NAV_NODES[a]
  const p2 = NAV_NODES[b]

  if (pointInPitchPolygon(p1.x, p1.y) || pointInPitchPolygon(p2.x, p2.y)) {
    return true
  }

  for (let i = 0; i < PITCH_BLOCK_POLYGON.length; i += 1) {
    const q1 = PITCH_BLOCK_POLYGON[i]
    const q2 = PITCH_BLOCK_POLYGON[(i + 1) % PITCH_BLOCK_POLYGON.length]
    if (segmentsIntersect(p1.x, p1.y, p2.x, p2.y, q1.x, q1.y, q2.x, q2.y)) {
      return true
    }
  }

  return false
}

function pointInPitchPolygon(x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = PITCH_BLOCK_POLYGON.length - 1; i < PITCH_BLOCK_POLYGON.length; j = i++) {
    const xi = PITCH_BLOCK_POLYGON[i].x
    const yi = PITCH_BLOCK_POLYGON[i].y
    const xj = PITCH_BLOCK_POLYGON[j].x
    const yj = PITCH_BLOCK_POLYGON[j].y
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const o1 = orientation(ax, ay, bx, by, cx, cy)
  const o2 = orientation(ax, ay, bx, by, dx, dy)
  const o3 = orientation(cx, cy, dx, dy, ax, ay)
  const o4 = orientation(cx, cy, dx, dy, bx, by)
  return o1 !== o2 && o3 !== o4
}

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return Math.sign((by - ay) * (cx - bx) - (bx - ax) * (cy - by))
}

function strictTransitionPenalty(from: NavNodeId, to: NavNodeId): number {
  const fromNode = NAV_NODES[from]
  const toNode = NAV_NODES[to]

  if (fromNode.layer === 'zone' && fromNode.zoneId?.startsWith('gate') && toNode.layer !== 'outer') {
    return 16
  }

  if (fromNode.layer === 'outer' && toNode.layer === 'inner') {
    return 12
  }

  if (fromNode.layer === 'concourse' && toNode.layer === 'zone' && toNode.zoneId?.startsWith('seating')) {
    return 10
  }

  if (fromNode.layer === 'inner' && toNode.layer === 'zone' && !toNode.zoneId?.startsWith('seating')) {
    return 8
  }

  return 0
}

function estimateDirectEta(from: ZoneId, to: ZoneId, metrics: CrowdMetricsByZone): number {
  const a = STADIUM_ZONES[from]
  const b = STADIUM_ZONES[to]
  const distance = Math.hypot(a.x - b.x, a.y - b.y)
  const densityPenalty = (metrics[from].density + metrics[to].density) / 35
  return distance / 9 + densityPenalty
}

function findAvoidedZones(
  primaryGeometry: Array<{ x: number; y: number }>,
  primaryZonePath: ZoneId[],
  metrics: CrowdMetricsByZone,
): ZoneId[] {
  const highRisk = (Object.keys(metrics) as ZoneId[]).filter(
    (zoneId) => metrics[zoneId].classification === 'High' || metrics[zoneId].classification === 'Critical',
  )

  return highRisk.filter((zoneId) => {
    if (primaryZonePath.includes(zoneId)) return false
    const zone = STADIUM_ZONES[zoneId]
    for (let i = 1; i < primaryGeometry.length; i += 1) {
      const p1 = primaryGeometry[i - 1]
      const p2 = primaryGeometry[i]
      const distance = pointToSegmentDistance(zone.x, zone.y, p1.x, p1.y, p2.x, p2.y)
      if (distance < 8) return true
    }
    return false
  })
}

function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}
