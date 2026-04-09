import { describe, expect, it } from 'vitest'
import { initializeCrowdMetrics } from '../../src/agents/crowdIntelligenceAgent'
import { planSmartRoute } from '../../src/agents/routeOptimizationAgent'

describe('route engine', () => {
  it('generates route with pitch avoidance and baseline metrics', () => {
    const metrics = initializeCrowdMetrics()
    const route = planSmartRoute('gateB', 'seatingB', metrics)

    expect(route.primaryPath.length).toBeGreaterThanOrEqual(2)
    expect(route.primaryPath[0]).toBe('gateB')
    expect(route.primaryPath[route.primaryPath.length - 1]).toBe('seatingB')
    expect(route.avoidsPitch).toBe(true)
    expect(route.etaMinutes).toBeGreaterThan(0)
    expect(route.directEtaMinutes).toBeGreaterThan(0)
    expect(route.congestionScore).toBeGreaterThan(0)
  })

  it('computes alternate path and time saved fields', () => {
    const metrics = initializeCrowdMetrics()
    const route = planSmartRoute('gateA', 'exitB', metrics)

    expect(route.alternativePath.length).toBeGreaterThan(1)
    expect(route.alternativeEtaMinutes).toBeGreaterThan(0)
    expect(route.timeSavedMinutes).toBeGreaterThanOrEqual(0)
    expect(route.crowdAvoided).toBeGreaterThanOrEqual(0)
  })
})
