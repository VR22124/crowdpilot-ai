import { initializeCrowdMetrics, updateCrowdMetrics } from '../agents/crowdIntelligenceAgent'
import { estimateQueueLengths } from '../engine/simulationEngine'
import { predictCrowdState } from '../engine/predictionEngine'
import { appEnv } from '../config/env'
import { getRemoteFeatureFlags } from '../services/firebaseClient'
import { publishFreeTierSnapshot } from '../services/firebaseFreeTier'
import { densityStream, predictionStream, queueStream } from './streams'
import { liveCrowdStore } from './liveCrowdStore'
import { invokeCloudRunSimulation } from '../services/googleCloud'
import type { CrowdMetricsByZone, MatchPhase, QueueByZone } from '../types'

interface StartLivePipelineInput {
  phase: MatchPhase
}

export function startLivePipeline(input: StartLivePipelineInput): () => void {
  const flags = getRemoteFeatureFlags()
  const tickMs = flags.simulationTickMs
  let metrics: CrowdMetricsByZone = initializeCrowdMetrics()
  let queues: QueueByZone = estimateQueueLengths(metrics, input.phase)
  let source: 'firebase' | 'simulated' = 'simulated'
  let tick = 0
  let prediction = predictCrowdState(metrics, queues, input.phase)

  liveCrowdStore.update({
    metrics,
    queues,
    prediction,
    phase: input.phase,
    source,
    updatedAt: Date.now(),
  })

  void publishFreeTierSnapshot({ metrics, queues, prediction, phase: input.phase })

  const intervalId = window.setInterval(async () => {
    tick += 1

    const cloudMetrics = await invokeCloudRunSimulation({ phase: input.phase, tick, metrics })
    if (cloudMetrics) {
      metrics = cloudMetrics
      source = 'firebase'
    } else if (appEnv.enableRealtimeFallback) {
      metrics = updateCrowdMetrics(metrics, null, input.phase)
      source = 'simulated'
    }

    queues = estimateQueueLengths(metrics, input.phase)
    prediction = predictCrowdState(metrics, queues, input.phase)

    liveCrowdStore.update({
      metrics,
      queues,
      prediction,
      phase: input.phase,
      source,
      updatedAt: Date.now(),
    })
    void publishFreeTierSnapshot({ metrics, queues, prediction, phase: input.phase })
  }, tickMs)

  const stopDensity = densityStream((incoming) => {
    metrics = incoming
    source = 'firebase'
    prediction = predictCrowdState(metrics, queues, input.phase)

    liveCrowdStore.update({
      metrics,
      queues,
      prediction,
      phase: input.phase,
      source,
      updatedAt: Date.now(),
    })
    void publishFreeTierSnapshot({ metrics, queues, prediction, phase: input.phase })
  })

  const stopQueues = queueStream((incoming) => {
    queues = incoming
    source = 'firebase'
    prediction = predictCrowdState(metrics, queues, input.phase)

    liveCrowdStore.update({
      metrics,
      queues,
      prediction,
      phase: input.phase,
      source,
      updatedAt: Date.now(),
    })
    void publishFreeTierSnapshot({ metrics, queues, prediction, phase: input.phase })
  })

  const stopPrediction = predictionStream((incoming) => {
    source = 'firebase'
    prediction = incoming

    liveCrowdStore.update({
      metrics,
      queues,
      prediction,
      phase: input.phase,
      source,
      updatedAt: Date.now(),
    })
    void publishFreeTierSnapshot({ metrics, queues, prediction, phase: input.phase })
  })

  return () => {
    window.clearInterval(intervalId)
    stopDensity()
    stopQueues()
    stopPrediction()
  }
}
