import { initializeCrowdMetrics } from '../../src/agents/crowdIntelligenceAgent'
import { estimateQueueLengths, buildNextTenMinuteForecast, deriveKpis } from '../../src/engine/simulationEngine'

describe('simulation engine', () => {
  it('produces queue estimates for key zones', () => {
    const metrics = initializeCrowdMetrics()
    const queues = estimateQueueLengths(metrics, 'inningsBreak')

    expect(queues.gateA).toBeGreaterThan(0)
    expect(queues.foodCourt).toBeGreaterThan(0)
    expect(queues.restroomNorth).toBeGreaterThan(0)
  })

  it('computes a 3-item forecast with confidence', () => {
    const metrics = initializeCrowdMetrics()
    const forecast = buildNextTenMinuteForecast(metrics, 'preMatch')

    expect(forecast).toHaveLength(3)
    expect(forecast[0].confidence).toBeGreaterThan(0.5)
  })

  it('derives KPI risk level from density and waits', () => {
    const metrics = initializeCrowdMetrics()
    const waitTimes = [
      { zoneId: 'gateA', label: 'Gate A', minutes: 7, classification: 'Medium', queueLength: 3 },
      { zoneId: 'foodCourt', label: 'Food Court', minutes: 10, classification: 'High', queueLength: 6 },
      { zoneId: 'restroomNorth', label: 'Restroom North', minutes: 5, classification: 'Low', queueLength: 2 },
    ] as const

    const kpis = deriveKpis(metrics, [...waitTimes])
    expect(kpis.totalCrowd).toBeGreaterThan(0)
    expect(['Low', 'Medium', 'High', 'Critical']).toContain(kpis.riskLevel)
  })
})
