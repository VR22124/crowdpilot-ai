import { httpsCallable } from 'firebase/functions'
import { appEnv } from '../config/env'
import { cloudFunctions } from './firebaseClient'
import type { CrowdMetricsByZone, MatchPhase, QueueByZone, ZoneId } from '../types'

export interface PredictionRequest {
  metrics: CrowdMetricsByZone
  queues: QueueByZone
  phase: MatchPhase
  from: ZoneId
  to: ZoneId
  timestamp: number
}

export interface PredictionResponse {
  recommendedFrom: ZoneId
  recommendedTo: ZoneId
  confidence: number
  latencyMs: number
  reason: string
}

export async function requestPredictionEngine(payload: PredictionRequest): Promise<PredictionResponse | null> {
  const started = performance.now()

  if (cloudFunctions && appEnv.enableCloudFunctions) {
    try {
      const callable = httpsCallable(cloudFunctions, appEnv.predictionFunctionName)
      const response = await callable(payload)
      const data = response.data as Omit<PredictionResponse, 'latencyMs'>
      return {
        ...data,
        latencyMs: Math.round(performance.now() - started),
      }
    } catch {
      // Fallback to direct endpoint below.
    }
  }

  if (!appEnv.predictionFunctionUrl) {
    return null
  }

  try {
    const response = await fetch(appEnv.predictionFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) return null

    const data = (await response.json()) as Omit<PredictionResponse, 'latencyMs'>
    return {
      ...data,
      latencyMs: Math.round(performance.now() - started),
    }
  } catch {
    return null
  }
}

export interface CloudRunSimulationInput {
  phase: MatchPhase
  tick: number
  metrics: CrowdMetricsByZone
}

export async function invokeCloudRunSimulation(input: CloudRunSimulationInput): Promise<CrowdMetricsByZone | null> {
  if (!appEnv.cloudRunSimulationUrl) {
    return null
  }

  try {
    const response = await fetch(`${appEnv.cloudRunSimulationUrl}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) return null
    const data = (await response.json()) as { metrics: CrowdMetricsByZone }
    return data.metrics
  } catch {
    return null
  }
}
