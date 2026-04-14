import { firestore } from './firebaseClient'
import type { AlertItem, CrowdMetricsByZone, MatchPhase, QueueByZone } from '../types'

export async function persistSimulationSnapshot(payload: {
  phase: MatchPhase
  metrics: CrowdMetricsByZone
  queues: QueueByZone
  alerts: AlertItem[]
  timestamp: number
}): Promise<void> {
  if (!firestore) return

  try {
    const { collection, addDoc } = await import('firebase/firestore')
    await addDoc(collection(firestore, 'simulationSnapshots'), {
      phase: payload.phase,
      metrics: payload.metrics,
      queues: payload.queues,
      alerts: payload.alerts.map((item) => ({
        severity: item.severity,
        message: item.message,
      })),
      timestamp: payload.timestamp,
    })
  } catch {
    // Keep simulation resilient when persistence fails.
  }
}

export async function persistDensityHistory(payload: {
  phase: MatchPhase
  densityHistory: number[]
  timestamp: number
}): Promise<void> {
  if (!firestore) return

  try {
    const { collection, addDoc } = await import('firebase/firestore')
    await addDoc(collection(firestore, 'densityHistory'), payload)
  } catch {
    // Keep simulation resilient when persistence fails.
  }
}
