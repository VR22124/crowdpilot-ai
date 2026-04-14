import { predictCrowdState } from '../../src/engine/predictionEngine'
import { initializeCrowdMetrics } from '../../src/agents/crowdIntelligenceAgent'

describe('prediction engine', () => {
  it('returns a valid recommendation and indexes', () => {
    const metrics = initializeCrowdMetrics()
    metrics.gateA.density = 70
    metrics.gateB.density = 25
    metrics.gateC.density = 40
    metrics.exitA.density = 62
    metrics.exitB.density = 31

    const prediction = predictCrowdState(metrics, { gateA: 18, gateB: 4, gateC: 7 }, 'preMatch')

    expect(prediction.gateSuggestion).toBe('gateB')
    expect(prediction.exitSuggestion).toBe('exitB')
    expect(prediction.growthIndex).toBeGreaterThanOrEqual(0)
    expect(prediction.queuePressureIndex).toBeGreaterThanOrEqual(0)
  })
})
