import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, set } from 'firebase/database'
import { ref as storageRef, uploadString } from 'firebase/storage'
import { firestore, realtimeDb, storage } from './firebaseClient'
import type { CrowdPrediction } from '../engine/predictionEngine'
import type { CrowdMetricsByZone, MatchPhase, QueueByZone } from '../types'

let lastFirestoreWriteAt = 0
let lastStorageWriteAt = 0

export async function publishFreeTierSnapshot(input: {
  metrics: CrowdMetricsByZone
  queues: QueueByZone
  prediction: CrowdPrediction | null
  phase: MatchPhase
}): Promise<void> {
  if (realtimeDb) {
    await Promise.allSettled([
      set(ref(realtimeDb, 'stadium/density'), { metrics: input.metrics, updatedAt: Date.now() }),
      set(ref(realtimeDb, 'stadium/queues'), input.queues),
      set(ref(realtimeDb, 'stadium/predictions/latest'), input.prediction),
      set(ref(realtimeDb, 'stadium/phase'), input.phase),
    ])
  }

  if (!firestore) return

  // Keep Firestore writes sparse to fit free tier write quotas.
  const now = Date.now()
  if (now - lastFirestoreWriteAt < 60_000) return
  lastFirestoreWriteAt = now

  const averageDensity =
    Object.values(input.metrics).reduce((sum, zone) => sum + zone.density, 0) /
    Object.keys(input.metrics).length

  await addDoc(collection(firestore, 'analytics_history'), {
    averageDensity: Number(averageDensity.toFixed(2)),
    phase: input.phase,
    queueSamples: input.queues,
    prediction: input.prediction,
    createdAt: serverTimestamp(),
  })

  if (!storage) return

  const storageNow = Date.now()
  if (storageNow - lastStorageWriteAt < 300_000) return
  lastStorageWriteAt = storageNow

  const minuteStamp = new Date(storageNow).toISOString().slice(0, 16).replace(':', '-')
  const path = `telemetry/${minuteStamp}.json`
  const payload = {
    phase: input.phase,
    averageDensity: Number(averageDensity.toFixed(2)),
    queues: input.queues,
    prediction: input.prediction,
    timestamp: storageNow,
  }

  await uploadString(storageRef(storage, path), JSON.stringify(payload), 'raw', {
    contentType: 'application/json',
  })
}
