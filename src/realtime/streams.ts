import { doc, onSnapshot, type Unsubscribe as FirestoreUnsubscribe } from 'firebase/firestore'
import { onValue, ref, type Unsubscribe as RtdbUnsubscribe } from 'firebase/database'
import { appEnv } from '../config/env'
import { firestore, realtimeDb } from '../services/firebaseClient'
import type { CrowdMetricsByZone, QueueByZone } from '../types'
import type { CrowdPrediction } from '../engine/predictionEngine'

export type UnsubscribeFn = () => void

export function densityStream(onUpdate: (metrics: CrowdMetricsByZone) => void): UnsubscribeFn {
  if (!firestore) {
    return () => undefined
  }

  let unsub: FirestoreUnsubscribe | null = null

  try {
    unsub = onSnapshot(doc(firestore, 'stadium', 'density'), (snapshot) => {
      const data = snapshot.data() as { metrics?: CrowdMetricsByZone } | undefined
      if (data?.metrics) {
        onUpdate(data.metrics)
      }
    })
  } catch {
    return () => undefined
  }

  return () => {
    unsub?.()
  }
}

export function queueStream(onUpdate: (queues: QueueByZone) => void): UnsubscribeFn {
  if (!realtimeDb) {
    return () => undefined
  }

  let unsub: RtdbUnsubscribe | null = null

  try {
    const queueRef = ref(realtimeDb, 'stadium/queues')
    unsub = onValue(queueRef, (snapshot) => {
      const data = snapshot.val() as QueueByZone | null
      if (data) {
        onUpdate(data)
      }
    })
  } catch {
    return () => undefined
  }

  return () => {
    unsub?.()
  }
}

export function predictionStream(onUpdate: (prediction: CrowdPrediction) => void): UnsubscribeFn {
  if (!realtimeDb || !appEnv.firebaseRealtimeDbUrl) {
    return () => undefined
  }

  let unsub: RtdbUnsubscribe | null = null

  try {
    const predictionRef = ref(realtimeDb, 'stadium/predictions/latest')
    unsub = onValue(predictionRef, (snapshot) => {
      const data = snapshot.val() as CrowdPrediction | null
      if (data) {
        onUpdate(data)
      }
    })
  } catch {
    return () => undefined
  }

  return () => {
    unsub?.()
  }
}
