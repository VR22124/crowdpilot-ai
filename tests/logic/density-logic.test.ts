import { initializeCrowdMetrics } from '../../src/agents/crowdIntelligenceAgent'
import { getOverallCrowdStatus } from '../../src/engine/simulationEngine'

describe('density logic', () => {
  it('classifies low average as stable', () => {
    const metrics = initializeCrowdMetrics()
    Object.values(metrics).forEach((zone) => {
      zone.density = 20
    })

    const result = getOverallCrowdStatus(metrics)
    expect(result.label).toBe('Stable')
  })

  it('classifies high average as critical', () => {
    const metrics = initializeCrowdMetrics()
    Object.values(metrics).forEach((zone) => {
      zone.density = 88
    })

    const result = getOverallCrowdStatus(metrics)
    expect(result.label).toBe('Critical')
  })
})
