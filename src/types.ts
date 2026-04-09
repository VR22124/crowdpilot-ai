export type ZoneId =
  | 'gateA'
  | 'gateB'
  | 'gateC'
  | 'foodCourt'
  | 'restroomNorth'
  | 'restroomSouth'
  | 'seatingA'
  | 'seatingB'
  | 'seatingC'
  | 'exitA'
  | 'exitB'

export type ZoneCategory = 'entry' | 'facility' | 'seating' | 'exit'

export type DensityClassification = 'Low' | 'Medium' | 'High' | 'Critical'

export interface ZoneDefinition {
  id: ZoneId
  label: string
  category: ZoneCategory
  x: number
  y: number
  capacity: number
  neighbors: ZoneId[]
}

export interface ZoneMetrics {
  density: number
  classification: DensityClassification
  predictedClassification: DensityClassification
  trend: number
}

export type CrowdMetricsByZone = Record<ZoneId, ZoneMetrics>

export interface WaitTimeItem {
  zoneId: ZoneId
  label: string
  minutes: number
  classification: DensityClassification
  queueLength: number
}

export type QueueByZone = Partial<Record<ZoneId, number>>

export interface PathPoint {
  x: number
  y: number
}

export interface RoutePlan {
  from: ZoneId
  to: ZoneId
  primaryPath: ZoneId[]
  alternativePath: ZoneId[]
  primaryGeometry: PathPoint[]
  alternativeGeometry: PathPoint[]
  etaMinutes: number
  directEtaMinutes: number
  alternativeEtaMinutes: number
  timeSavedMinutes: number
  crowdAvoided: number
  avoidedZones: ZoneId[]
  congestionScore: number
  avoidsPitch: boolean
}

export interface AlertItem {
  id: string
  createdAt: number
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
}

export type ScenarioKey = 'gateCrowd' | 'foodRush' | 'halftimeSurge' | 'exitRush'

export type MatchPhase =
  | 'preMatch'
  | 'firstInnings'
  | 'inningsBreak'
  | 'secondInnings'
  | 'matchEnd'

export interface OperationsInsight {
  bestGateForSection: string
  nearestRestroomToSeat: string
  nearestFoodToSection: string
  bestExitAfterMatch: string
  avoidCrowdedStand: string
  congestionBuilding: string
  leaveInMinutes: number
  recommendedAction: string
}

export interface ForecastItem {
  id: string
  text: string
  confidence: number
}

export interface KpiMetrics {
  totalCrowd: number
  avgWaitTime: number
  congestionScore: number
  flowEfficiency: number
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'
}

export interface NavigationPicks {
  bestGate: ZoneId
  bestExit: ZoneId
  nearestRestroom: ZoneId
  nearestFood: ZoneId
  leaveInMinutes: number
}

export type EmergencyMode = 'normal' | 'medical' | 'security' | 'evacuation'
