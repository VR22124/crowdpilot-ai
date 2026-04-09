import type { QueueByZone, ZoneId } from '../types'

export type NavNodeId =
  | 'outerN'
  | 'outerNE'
  | 'outerSE'
  | 'outerS'
  | 'outerSW'
  | 'outerNW'
  | 'tunnelA'
  | 'tunnelB'
  | 'tunnelC'
  | 'exitCorrA'
  | 'exitCorrB'
  | 'concN'
  | 'concNE'
  | 'concSE'
  | 'concS'
  | 'concSW'
  | 'concNW'
  | 'stairA'
  | 'stairB'
  | 'stairC'
  | ZoneId

interface NavNode {
  x: number
  y: number
  layer: 'outer' | 'concourse' | 'inner' | 'zone'
  zoneId?: ZoneId
}

export const PITCH_BLOCK = {
  cx: 50,
  cy: 44,
  rx: 14,
  ry: 9,
}

export const PITCH_BLOCK_POLYGON: Array<{ x: number; y: number }> = [
  { x: 50, y: 34 },
  { x: 60, y: 36 },
  { x: 64, y: 44 },
  { x: 60, y: 52 },
  { x: 50, y: 54 },
  { x: 40, y: 52 },
  { x: 36, y: 44 },
  { x: 40, y: 36 },
]

export const NAV_NODES: Record<NavNodeId, NavNode> = {
  outerN: { x: 50, y: 9, layer: 'outer' },
  outerNE: { x: 76, y: 16, layer: 'outer' },
  outerSE: { x: 88, y: 34, layer: 'outer' },
  outerS: { x: 50, y: 91, layer: 'outer' },
  outerSW: { x: 12, y: 34, layer: 'outer' },
  outerNW: { x: 24, y: 16, layer: 'outer' },

  tunnelA: { x: 24, y: 72, layer: 'outer' },
  tunnelB: { x: 50, y: 76, layer: 'outer' },
  tunnelC: { x: 76, y: 72, layer: 'outer' },
  exitCorrA: { x: 30, y: 18, layer: 'outer' },
  exitCorrB: { x: 70, y: 18, layer: 'outer' },

  concN: { x: 50, y: 23, layer: 'concourse' },
  concNE: { x: 70, y: 30, layer: 'concourse' },
  concSE: { x: 70, y: 61, layer: 'concourse' },
  concS: { x: 50, y: 70, layer: 'concourse' },
  concSW: { x: 30, y: 61, layer: 'concourse' },
  concNW: { x: 30, y: 30, layer: 'concourse' },

  stairA: { x: 32, y: 34, layer: 'inner' },
  stairB: { x: 50, y: 28, layer: 'inner' },
  stairC: { x: 68, y: 34, layer: 'inner' },

  gateA: { x: 18, y: 86, layer: 'zone', zoneId: 'gateA' },
  gateB: { x: 50, y: 90, layer: 'zone', zoneId: 'gateB' },
  gateC: { x: 82, y: 86, layer: 'zone', zoneId: 'gateC' },
  foodCourt: { x: 50, y: 64, layer: 'zone', zoneId: 'foodCourt' },
  restroomNorth: { x: 34, y: 26, layer: 'zone', zoneId: 'restroomNorth' },
  restroomSouth: { x: 66, y: 26, layer: 'zone', zoneId: 'restroomSouth' },
  seatingA: { x: 28, y: 38, layer: 'zone', zoneId: 'seatingA' },
  seatingB: { x: 50, y: 30, layer: 'zone', zoneId: 'seatingB' },
  seatingC: { x: 72, y: 38, layer: 'zone', zoneId: 'seatingC' },
  exitA: { x: 24, y: 8, layer: 'zone', zoneId: 'exitA' },
  exitB: { x: 76, y: 8, layer: 'zone', zoneId: 'exitB' },
}

export const NAV_EDGES: Array<[NavNodeId, NavNodeId]> = [
  ['outerN', 'outerNE'],
  ['outerNE', 'outerSE'],
  ['outerSE', 'outerS'],
  ['outerS', 'outerSW'],
  ['outerSW', 'outerNW'],
  ['outerNW', 'outerN'],

  ['concN', 'concNE'],
  ['concNE', 'concSE'],
  ['concSE', 'concS'],
  ['concS', 'concSW'],
  ['concSW', 'concNW'],
  ['concNW', 'concN'],

  ['outerN', 'concN'],
  ['outerNE', 'concNE'],
  ['outerSE', 'concSE'],
  ['outerS', 'concS'],
  ['outerSW', 'concSW'],
  ['outerNW', 'concNW'],

  ['gateA', 'tunnelA'],
  ['gateB', 'tunnelB'],
  ['gateC', 'tunnelC'],
  ['tunnelA', 'concSW'],
  ['tunnelB', 'concS'],
  ['tunnelC', 'concSE'],

  ['exitA', 'exitCorrA'],
  ['exitCorrA', 'concNW'],
  ['exitB', 'exitCorrB'],
  ['exitCorrB', 'concNE'],

  ['foodCourt', 'concS'],
  ['foodCourt', 'concSE'],
  ['foodCourt', 'concSW'],
  ['restroomNorth', 'concNW'],
  ['restroomNorth', 'concN'],
  ['restroomSouth', 'concNE'],
  ['restroomSouth', 'concN'],

  ['stairA', 'concNW'],
  ['stairA', 'concSW'],
  ['stairB', 'concN'],
  ['stairC', 'concNE'],
  ['stairC', 'concSE'],
  ['seatingA', 'stairA'],
  ['seatingB', 'stairB'],
  ['seatingC', 'stairC'],
]

export const ZONE_TO_NAV_NODE: Record<ZoneId, NavNodeId> = {
  gateA: 'gateA',
  gateB: 'gateB',
  gateC: 'gateC',
  foodCourt: 'foodCourt',
  restroomNorth: 'restroomNorth',
  restroomSouth: 'restroomSouth',
  seatingA: 'seatingA',
  seatingB: 'seatingB',
  seatingC: 'seatingC',
  exitA: 'exitA',
  exitB: 'exitB',
}

export function navPoint(nodeId: NavNodeId): { x: number; y: number } {
  const node = NAV_NODES[nodeId]
  return { x: node.x, y: node.y }
}

export function queuePressureAtNode(nodeId: NavNodeId, queues: QueueByZone): number {
  const node = NAV_NODES[nodeId]
  if (node.zoneId) {
    return (queues[node.zoneId] ?? 0) * 0.03
  }

  const proximityPenalty = Object.entries(queues).reduce((sum, [zoneId, length]) => {
    const zoneNode = NAV_NODES[zoneId as ZoneId]
    if (!zoneNode || !length) return sum
    const d = Math.hypot(node.x - zoneNode.x, node.y - zoneNode.y)
    return sum + Math.max(0, 1 - d / 28) * length * 0.004
  }, 0)

  return proximityPenalty
}
