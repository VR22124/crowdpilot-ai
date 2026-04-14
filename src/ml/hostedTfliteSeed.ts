import { appEnv } from '../config/env'

let cachedSeedWeights: number[] | null = null

function normalizeByte(value: number): number {
  return (value % 251) / 250
}

function bytesToWeights(bytes: Uint8Array, count: number): number[] {
  const weights: number[] = []
  let rolling = 17

  for (let index = 0; index < count; index += 1) {
    const byte = bytes[index % bytes.length] ?? 0
    rolling = (rolling * 31 + byte + index) % 997
    const signed = (normalizeByte(rolling) - 0.5) * 0.9
    weights.push(Number(signed.toFixed(5)))
  }

  return weights
}

export async function loadHostedTfliteSeedWeights(featureCount: number): Promise<number[] | null> {
  if (cachedSeedWeights && cachedSeedWeights.length === featureCount) {
    return [...cachedSeedWeights]
  }

  try {
    const response = await fetch(appEnv.tfliteModelUrl, { cache: 'no-store' })
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (bytes.length === 0) return null

    const seeded = bytesToWeights(bytes, featureCount)
    cachedSeedWeights = seeded
    return [...seeded]
  } catch {
    return null
  }
}
