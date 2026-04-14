import { appEnv } from '../config/env'

export interface GeminiCrowdContext {
  question: string
  quickInsights: string
  fromLabel: string
}

const GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemma-3-1b-it']

function getGeminiModelCandidates(): string[] {
  const configuredModel = appEnv.geminiModel.trim()
  const ordered = [configuredModel, ...GEMINI_FALLBACK_MODELS]
  return ordered.filter((value, index) => value && ordered.indexOf(value) === index)
}

export async function askGeminiForCrowdAdvice(context: GeminiCrowdContext): Promise<string | null> {
  if (!appEnv.geminiApiKey) {
    return null
  }

  const prompt = [
    'You are CrowdPilot AI for stadium operations.',
    'Respond in under 2 sentences with practical navigation advice.',
    `Current zone: ${context.fromLabel}.`,
    `Live insights: ${context.quickInsights}.`,
    `User question: ${context.question}`,
  ].join(' ')

  const modelCandidates = getGeminiModelCandidates()

  for (const model of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${appEnv.geminiApiKey}`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 140,
            temperature: 0.35,
          },
        }),
      })

      if (!response.ok) continue

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }

      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (text) return text
    } catch {
      continue
    }
  }

  return null
}
