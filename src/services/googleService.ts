import { httpsCallable } from 'firebase/functions'
import type { CrowdMetricsByZone, MatchPhase, QueueByZone } from '../types'
import { appEnv } from '../config/env'
import { cloudFunctions } from './firebaseClient'

export interface IntegrationResult {
  ok: boolean
  message: string
  link?: string
  source?: 'workspace' | 'functions' | 'local'
}

export interface FunctionPrediction {
  summary: string
  confidence: number
  values: number[]
  source?: 'workspace' | 'functions' | 'local'
}

type WorkspaceAction =
  | 'exportToSheets'
  | 'logSimulation'
  | 'exportWaitTimes'
  | 'saveSimulation'
  | 'predictCrowdNext10Min'
  | 'suggestBestGate'
  | 'predictExitRush'
  | 'facilityLoadForecast'
  | 'staffDeploymentSuggestion'

interface WorkspaceEnvelope<T> {
  ok: boolean
  data?: T
  message?: string
  link?: string
}

interface WorkspaceRequestBody<TPayload> {
  action: WorkspaceAction
  token: string
  payload: TPayload
}

type FunctionNameMap = {
  exportToSheets: string
  logSimulation: string
  exportWaitTimes: string
  saveSimulation: string
  predictCrowdNext10Min: string
  suggestBestGate: string
  predictExitRush: string
  facilityLoadForecast: string
  staffDeploymentSuggestion: string
}

const WORKSPACE_TIMEOUT_MS = 8000

const FUNCTION_NAMES: FunctionNameMap = {
  exportToSheets: appEnv.sheetsExportFunctionName || 'exportToSheets',
  logSimulation: appEnv.simulationLogFunctionName || 'logSimulation',
  exportWaitTimes: appEnv.waitTimesExportFunctionName || 'exportWaitTimes',
  saveSimulation: appEnv.driveSaveFunctionName || 'saveSimulation',
  predictCrowdNext10Min: 'predictCrowdNext10Min',
  suggestBestGate: 'suggestBestGate',
  predictExitRush: 'predictExitRush',
  facilityLoadForecast: 'facilityLoadForecast',
  staffDeploymentSuggestion: 'staffDeploymentSuggestion',
}

function capNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeDensityHistory(values: number[]): number[] {
  return values.slice(-30).map((item) => Number(capNumber(Number(item) || 0, 0, 100).toFixed(1)))
}

function hasWorkspaceApi(): boolean {
  if (!appEnv.workspaceApiUrl || !appEnv.workspaceApiToken) return false
  try {
    const parsed = new URL(appEnv.workspaceApiUrl)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function shouldUseCloudFunctions(): boolean {
  return Boolean(appEnv.enableCloudFunctions && cloudFunctions)
}

async function callWorkspaceApi<TPayload, TResult>(
  action: WorkspaceAction,
  payload: TPayload,
): Promise<TResult | null> {
  if (!hasWorkspaceApi()) return null

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), WORKSPACE_TIMEOUT_MS)

  const requestBody: WorkspaceRequestBody<TPayload> = {
    action,
    token: appEnv.workspaceApiToken,
    payload,
  }

  try {
    const response = await fetch(appEnv.workspaceApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    if (!response.ok) return null

    const envelope = (await response.json()) as WorkspaceEnvelope<TResult>
    if (!envelope.ok || !envelope.data) return null
    return envelope.data
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

async function callFunction<TPayload, TResult>(name: string, payload: TPayload): Promise<TResult | null> {
  if (!shouldUseCloudFunctions()) return null
  try {
    const fn = httpsCallable<TPayload, TResult>(cloudFunctions!, name)
    const response = await fn(payload)
    return response.data
  } catch {
    return null
  }
}

export async function exportToSheets(payload: {
  phase: MatchPhase
  densityHistory: number[]
  queueLengths: QueueByZone
  notes: string
}): Promise<IntegrationResult> {
  const normalizedPayload = {
    ...payload,
    densityHistory: normalizeDensityHistory(payload.densityHistory),
  }

  const workspaceData = await callWorkspaceApi<typeof normalizedPayload, IntegrationResult>('exportToSheets', normalizedPayload)
  if (workspaceData) return { ...workspaceData, source: workspaceData.source ?? 'workspace' }

  const data = await callFunction<typeof payload, IntegrationResult>(FUNCTION_NAMES.exportToSheets, payload)
  if (data) return { ...data, source: data.source ?? 'functions' }

  return { ok: false, message: 'Sheets export unavailable in current environment.', source: 'local' }
}

export async function logSimulation(payload: {
  phase: MatchPhase
  metrics: CrowdMetricsByZone
  queues: QueueByZone
  alerts: string[]
}): Promise<IntegrationResult> {
  const workspaceData = await callWorkspaceApi<typeof payload, IntegrationResult>('logSimulation', payload)
  if (workspaceData) return { ...workspaceData, source: workspaceData.source ?? 'workspace' }

  const data = await callFunction<typeof payload, IntegrationResult>(FUNCTION_NAMES.logSimulation, payload)
  if (data) return { ...data, source: data.source ?? 'functions' }

  return { ok: false, message: 'Simulation logging unavailable in current environment.', source: 'local' }
}

export async function exportWaitTimes(payload: {
  phase: MatchPhase
  waitTimes: Array<{ label: string; minutes: number }>
}): Promise<IntegrationResult> {
  const normalizedPayload = {
    ...payload,
    waitTimes: payload.waitTimes.slice(0, 12).map((item) => ({
      label: item.label.slice(0, 64),
      minutes: capNumber(Number(item.minutes) || 0, 0, 240),
    })),
  }

  const workspaceData = await callWorkspaceApi<typeof normalizedPayload, IntegrationResult>('exportWaitTimes', normalizedPayload)
  if (workspaceData) return { ...workspaceData, source: workspaceData.source ?? 'workspace' }

  const data = await callFunction<typeof payload, IntegrationResult>(FUNCTION_NAMES.exportWaitTimes, payload)
  if (data) return { ...data, source: data.source ?? 'functions' }

  return { ok: false, message: 'Wait-time export unavailable in current environment.', source: 'local' }
}

export async function saveSimulation(payload: {
  phase: MatchPhase
  summary: string
  densityHistory: number[]
  timestamp: number
}): Promise<IntegrationResult> {
  const normalizedPayload = {
    ...payload,
    summary: payload.summary.slice(0, 6000),
    densityHistory: normalizeDensityHistory(payload.densityHistory),
  }

  const workspaceData = await callWorkspaceApi<typeof normalizedPayload, IntegrationResult>('saveSimulation', normalizedPayload)
  if (workspaceData) return { ...workspaceData, source: workspaceData.source ?? 'workspace' }

  const data = await callFunction<typeof payload, IntegrationResult>(FUNCTION_NAMES.saveSimulation, payload)
  if (data) return { ...data, source: data.source ?? 'functions' }

  return { ok: false, message: 'Drive save unavailable in current environment.', source: 'local' }
}

function fallbackPrediction(values: number[], label: string): FunctionPrediction {
  return {
    summary: label,
    confidence: 0.62,
    values,
    source: 'local',
  }
}

export async function predictCrowdNext10Min(payload: {
  phase: MatchPhase
  densityHistory: number[]
  metrics: CrowdMetricsByZone
}): Promise<FunctionPrediction> {
  const normalizedPayload = {
    ...payload,
    densityHistory: normalizeDensityHistory(payload.densityHistory),
  }

  const workspaceData = await callWorkspaceApi<typeof normalizedPayload, FunctionPrediction>('predictCrowdNext10Min', normalizedPayload)
  if (workspaceData) return { ...workspaceData, source: workspaceData.source ?? 'workspace' }

  const data = await callFunction<typeof payload, FunctionPrediction>(FUNCTION_NAMES.predictCrowdNext10Min, payload)
  if (data) return { ...data, source: data.source ?? 'functions' }

  const recent = payload.densityHistory.slice(-3)
  const last = recent[recent.length - 1] ?? 45
  return fallbackPrediction([last, last + 2, last + 4], 'Local fallback prediction used.')
}

export async function suggestBestGate(payload: {
  metrics: CrowdMetricsByZone
}): Promise<{ gate: string; reason: string }> {
  const workspaceData = await callWorkspaceApi<typeof payload, { gate: string; reason: string }>('suggestBestGate', payload)
  if (workspaceData) return workspaceData

  const data = await callFunction<typeof payload, { gate: string; reason: string }>(FUNCTION_NAMES.suggestBestGate, payload)
  if (data) return data

  const gates = ['gateA', 'gateB', 'gateC'] as const
  const gate = gates.reduce((best, current) =>
    payload.metrics[current].density < payload.metrics[best].density ? current : best,
  gates[0])

  return {
    gate,
    reason: `Local heuristic selected ${gate} as least dense gate.`,
  }
}

export async function predictExitRush(payload: {
  phase: MatchPhase
  metrics: CrowdMetricsByZone
}): Promise<{ level: 'low' | 'medium' | 'high'; reason: string }> {
  const workspaceData = await callWorkspaceApi<typeof payload, { level: 'low' | 'medium' | 'high'; reason: string }>('predictExitRush', payload)
  if (workspaceData) return workspaceData

  const data = await callFunction<typeof payload, { level: 'low' | 'medium' | 'high'; reason: string }>(FUNCTION_NAMES.predictExitRush, payload)
  if (data) return data

  const avgExit = (payload.metrics.exitA.density + payload.metrics.exitB.density) / 2
  const level = avgExit > 72 ? 'high' : avgExit > 48 ? 'medium' : 'low'
  return { level, reason: 'Local density-based exit rush estimate.' }
}

export async function facilityLoadForecast(payload: {
  metrics: CrowdMetricsByZone
  queues: QueueByZone
}): Promise<{ busiestFacility: string; reason: string }> {
  const workspaceData = await callWorkspaceApi<typeof payload, { busiestFacility: string; reason: string }>('facilityLoadForecast', payload)
  if (workspaceData) return workspaceData

  const data = await callFunction<typeof payload, { busiestFacility: string; reason: string }>(FUNCTION_NAMES.facilityLoadForecast, payload)
  if (data) return data

  const facilities = ['foodCourt', 'restroomNorth', 'restroomSouth'] as const
  const busiest = facilities.reduce((best, current) =>
    payload.metrics[current].density > payload.metrics[best].density ? current : best,
  facilities[0])
  return { busiestFacility: busiest, reason: 'Local facility forecast based on current density.' }
}

export async function staffDeploymentSuggestion(payload: {
  phase: MatchPhase
  metrics: CrowdMetricsByZone
  queues: QueueByZone
}): Promise<{ recommendation: string; confidence: number }> {
  const workspaceData = await callWorkspaceApi<typeof payload, { recommendation: string; confidence: number }>('staffDeploymentSuggestion', payload)
  if (workspaceData) return workspaceData

  const data = await callFunction<typeof payload, { recommendation: string; confidence: number }>(FUNCTION_NAMES.staffDeploymentSuggestion, payload)
  if (data) return data

  const gateLoad = Math.max(payload.metrics.gateA.density, payload.metrics.gateB.density, payload.metrics.gateC.density)
  const recommendation = gateLoad > 70
    ? 'Assign 2 extra stewards to busiest gate and 1 floater to concourse ring.'
    : 'Maintain baseline staffing and monitor exits every 2 minutes.'

  return { recommendation, confidence: 0.58 }
}
