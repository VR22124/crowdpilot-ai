import { useSyncExternalStore } from 'react'
import type { CrowdMetricsByZone, MatchPhase, QueueByZone } from '../types'
import type { CrowdPrediction } from '../engine/predictionEngine'

export interface LiveCrowdSnapshot {
  metrics: CrowdMetricsByZone
  queues: QueueByZone
  prediction: CrowdPrediction | null
  phase: MatchPhase
  updatedAt: number
  source: 'firebase' | 'simulated'
}

type Listener = () => void

class LiveCrowdStore {
  private snapshot: LiveCrowdSnapshot | null = null
  private listeners = new Set<Listener>()

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): LiveCrowdSnapshot | null => this.snapshot

  update(next: LiveCrowdSnapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) {
      listener()
    }
  }
}

export const liveCrowdStore = new LiveCrowdStore()

export function useLiveCrowdStore(): LiveCrowdSnapshot | null {
  return useSyncExternalStore(liveCrowdStore.subscribe, liveCrowdStore.getSnapshot, liveCrowdStore.getSnapshot)
}
