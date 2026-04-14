export interface PerfSnapshot {
  fps: number
  avgRenderMs: number
  routeComputeMs: number
  predictionLatencyMs: number
}

const state: PerfSnapshot = {
  fps: 0,
  avgRenderMs: 0,
  routeComputeMs: 0,
  predictionLatencyMs: 0,
}

let frameCount = 0
let lastFrameTime = performance.now()
let rafId = 0
let active = false

export function startFpsTracking(): () => void {
  if (active) {
    return () => undefined
  }

  active = true

  const step = (now: number): void => {
    frameCount += 1
    const elapsed = now - lastFrameTime

    if (elapsed >= 1000) {
      state.fps = Math.round((frameCount * 1000) / elapsed)
      state.avgRenderMs = Number((1000 / Math.max(1, state.fps)).toFixed(2))
      frameCount = 0
      lastFrameTime = now
    }

    rafId = requestAnimationFrame(step)
  }

  rafId = requestAnimationFrame(step)

  return () => {
    active = false
    cancelAnimationFrame(rafId)
  }
}

export function setRouteComputeMs(value: number): void {
  state.routeComputeMs = Number(value.toFixed(2))
}

export function setPredictionLatencyMs(value: number): void {
  state.predictionLatencyMs = Number(value.toFixed(2))
}

export function getPerfSnapshot(): PerfSnapshot {
  return { ...state }
}
