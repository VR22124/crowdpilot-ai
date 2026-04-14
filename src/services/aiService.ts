import type { MatchPhase, CrowdMetricsByZone, QueueByZone, ZoneId } from '../types'
import { askGeminiWithPrompt } from './geminiService'

interface AiContext {
  phase: MatchPhase
  from: ZoneId
  to: ZoneId
  metrics: CrowdMetricsByZone
  queues: QueueByZone
}

function compactMetrics(metrics: CrowdMetricsByZone): string {
  return Object.entries(metrics)
    .slice(0, 8)
    .map(([zone, value]) => `${zone}:${Math.round(value.density)}%/${value.classification}`)
    .join(', ')
}

function compactQueues(queues: QueueByZone): string {
  return Object.entries(queues)
    .slice(0, 8)
    .map(([zone, value]) => `${zone}:${Math.round(value ?? 0)}`)
    .join(', ')
}

export async function generateAiOpsSummary(context: AiContext): Promise<string | null> {
  const prompt = [
    'You are an operations command advisor for stadium crowd movement.',
    'Write a concise match-ops summary in 4 short bullet points.',
    `Phase: ${context.phase}. Route focus: ${context.from} -> ${context.to}.`,
    `Metrics: ${compactMetrics(context.metrics)}.`,
    `Queues: ${compactQueues(context.queues)}.`,
    'Include one immediate action and one prevention action.',
  ].join(' ')

  return askGeminiWithPrompt(prompt, { maxOutputTokens: 260, temperature: 0.25 })
}

export async function explainCongestion(context: AiContext): Promise<string | null> {
  const prompt = [
    'Explain the likely reasons for current congestion for operations staff.',
    'Return 3 short points only.',
    `Phase=${context.phase}; key metrics=${compactMetrics(context.metrics)}; queues=${compactQueues(context.queues)}.`,
  ].join(' ')

  return askGeminiWithPrompt(prompt, { maxOutputTokens: 220, temperature: 0.2 })
}

export async function generateStrategy(context: AiContext): Promise<string | null> {
  const prompt = [
    'Generate a tactical crowd strategy for next 10 minutes.',
    'Include gate management, exit handling, and facility balancing.',
    `Phase=${context.phase}; route=${context.from} to ${context.to}.`,
    `Metrics=${compactMetrics(context.metrics)}; queues=${compactQueues(context.queues)}.`,
    'Keep under 120 words.',
  ].join(' ')

  return askGeminiWithPrompt(prompt, { maxOutputTokens: 280, temperature: 0.3 })
}
