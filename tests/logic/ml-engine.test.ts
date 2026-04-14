import { initializeCrowdMetrics } from '../../src/agents/crowdIntelligenceAgent'
import { crowdMlEngine } from '../../src/ml/crowdMlEngine'

describe('tiny ml engine', () => {
  it('returns valid gate and exit suggestions', () => {
    const metrics = initializeCrowdMetrics()
    metrics.gateA.density = 75
    metrics.gateB.density = 24
    metrics.gateC.density = 46
    metrics.exitA.density = 62
    metrics.exitB.density = 30

    const gate = crowdMlEngine.chooseGate(metrics, { gateA: 10, gateB: 4, gateC: 6 }, 'preMatch')
    const exit = crowdMlEngine.chooseExit(metrics, { exitA: 11, exitB: 5 }, 'matchEnd')

    expect(['gateA', 'gateB', 'gateC']).toContain(gate)
    expect(['exitA', 'exitB']).toContain(exit)
  })
})
