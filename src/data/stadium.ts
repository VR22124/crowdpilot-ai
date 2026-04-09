import type { ZoneDefinition, ZoneId } from '../types'

export const STADIUM_ZONES: Record<ZoneId, ZoneDefinition> = {
  gateA: {
    id: 'gateA',
    label: 'Gate A',
    category: 'entry',
    x: 18,
    y: 86,
    capacity: 500,
    neighbors: ['gateB', 'foodCourt', 'seatingA'],
  },
  gateB: {
    id: 'gateB',
    label: 'Gate B',
    category: 'entry',
    x: 50,
    y: 90,
    capacity: 700,
    neighbors: ['gateA', 'gateC', 'foodCourt', 'seatingB'],
  },
  gateC: {
    id: 'gateC',
    label: 'Gate C',
    category: 'entry',
    x: 82,
    y: 86,
    capacity: 500,
    neighbors: ['gateB', 'seatingC', 'restroomSouth'],
  },
  foodCourt: {
    id: 'foodCourt',
    label: 'Food Court',
    category: 'facility',
    x: 50,
    y: 72,
    capacity: 420,
    neighbors: ['gateA', 'gateB', 'seatingA', 'seatingB', 'seatingC', 'restroomNorth', 'restroomSouth'],
  },
  restroomNorth: {
    id: 'restroomNorth',
    label: 'Restroom North',
    category: 'facility',
    x: 34,
    y: 22,
    capacity: 210,
    neighbors: ['foodCourt', 'seatingA', 'seatingB', 'exitA'],
  },
  restroomSouth: {
    id: 'restroomSouth',
    label: 'Restroom South',
    category: 'facility',
    x: 66,
    y: 22,
    capacity: 220,
    neighbors: ['foodCourt', 'seatingB', 'seatingC', 'gateC', 'exitB'],
  },
  seatingA: {
    id: 'seatingA',
    label: 'Seating A',
    category: 'seating',
    x: 28,
    y: 38,
    capacity: 1300,
    neighbors: ['gateA', 'foodCourt', 'restroomNorth', 'seatingB'],
  },
  seatingB: {
    id: 'seatingB',
    label: 'Seating B',
    category: 'seating',
    x: 50,
    y: 30,
    capacity: 1900,
    neighbors: ['gateB', 'foodCourt', 'restroomNorth', 'restroomSouth', 'seatingA', 'seatingC'],
  },
  seatingC: {
    id: 'seatingC',
    label: 'Seating C',
    category: 'seating',
    x: 72,
    y: 38,
    capacity: 1300,
    neighbors: ['gateC', 'restroomSouth', 'seatingB', 'foodCourt'],
  },
  exitA: {
    id: 'exitA',
    label: 'Exit A',
    category: 'exit',
    x: 24,
    y: 8,
    capacity: 700,
    neighbors: ['restroomNorth', 'gateA'],
  },
  exitB: {
    id: 'exitB',
    label: 'Exit B',
    category: 'exit',
    x: 76,
    y: 8,
    capacity: 720,
    neighbors: ['restroomSouth', 'gateC'],
  },
}

export const ZONE_SEQUENCE: ZoneId[] = [
  'gateA',
  'gateB',
  'gateC',
  'foodCourt',
  'restroomNorth',
  'restroomSouth',
  'seatingA',
  'seatingB',
  'seatingC',
  'exitA',
  'exitB',
]

export const ENTRY_ZONES: ZoneId[] = ['gateA', 'gateB', 'gateC']
export const FACILITY_ZONES: ZoneId[] = ['foodCourt', 'restroomNorth', 'restroomSouth']
export const RESTROOM_ZONES: ZoneId[] = ['restroomNorth', 'restroomSouth']
export const SEATING_ZONES: ZoneId[] = ['seatingA', 'seatingB', 'seatingC']
export const EXIT_ZONES: ZoneId[] = ['exitA', 'exitB']
