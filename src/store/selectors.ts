import type { CrowdMetricsByZone, ZoneId } from '../types'

function memoizeByReference<TInput extends object, TResult>(selector: (input: TInput) => TResult) {
  let lastInput: TInput | null = null
  let lastResult: TResult | null = null

  return (input: TInput): TResult => {
    if (lastInput === input && lastResult !== null) {
      return lastResult
    }

    lastInput = input
    lastResult = selector(input)
    return lastResult
  }
}

export const selectAverageDensity = memoizeByReference((metrics: CrowdMetricsByZone): number => {
  return (
    Object.values(metrics).reduce((sum, zone) => sum + zone.density, 0) /
    Object.keys(metrics).length
  )
})

export const selectBestGate = memoizeByReference((metrics: CrowdMetricsByZone): ZoneId => {
  const gates: ZoneId[] = ['gateA', 'gateB', 'gateC']
  return gates.reduce((best, zoneId) => (metrics[zoneId].density < metrics[best].density ? zoneId : best), gates[0])
})
