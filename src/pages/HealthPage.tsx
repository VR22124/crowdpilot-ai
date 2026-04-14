import { useEffect, useMemo, useState } from 'react'
import { BrandAttribution } from '../components/BrandAttribution'
import { appEnv, isFirebaseConfigured } from '../config/env'
import { initializeFirebaseServices } from '../services/firebaseClient'

type ServiceStatus = 'healthy' | 'degraded' | 'offline' | 'checking'

interface HealthSignal {
  label: string
  status: ServiceStatus
  detail: string
  latencyMs?: number
}

function statusClass(status: ServiceStatus): string {
  if (status === 'healthy') return 'ok'
  if (status === 'degraded') return 'warn'
  if (status === 'offline') return 'down'
  return 'checking'
}

export function HealthPage() {
  const [firebaseStatus, setFirebaseStatus] = useState<HealthSignal>({
    label: 'Firebase SDK',
    status: 'checking',
    detail: 'Initializing Firebase client modules...',
  })
  const [geminiStatus, setGeminiStatus] = useState<HealthSignal>({
    label: 'Gemini API',
    status: appEnv.geminiApiKey ? 'checking' : 'offline',
    detail: appEnv.geminiApiKey ? 'Running model health check...' : 'VITE_GEMINI_API_KEY is not configured.',
  })
  const [tfliteStatus, setTfliteStatus] = useState<HealthSignal>({
    label: 'Tiny Model Asset',
    status: 'checking',
    detail: 'Checking hosted .tflite model availability...',
  })

  useEffect(() => {
    const start = performance.now()
    void initializeFirebaseServices()
      .then(() => {
        const latency = Math.round(performance.now() - start)
        setFirebaseStatus({
          label: 'Firebase SDK',
          status: 'healthy',
          detail: `Firebase initialized successfully (${appEnv.firebaseProjectId}).`,
          latencyMs: latency,
        })
      })
      .catch((error: unknown) => {
        setFirebaseStatus({
          label: 'Firebase SDK',
          status: 'offline',
          detail: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      })
  }, [])

  useEffect(() => {
    if (!appEnv.geminiApiKey) {
      return
    }

    const controller = new AbortController()
    const start = performance.now()

    void fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${appEnv.geminiModel}:generateContent?key=${appEnv.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'health' }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0 },
        }),
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const latency = Math.round(performance.now() - start)
        if (response.ok) {
          setGeminiStatus({
            label: 'Gemini API',
            status: 'healthy',
            detail: `Model ${appEnv.geminiModel} responded successfully.`,
            latencyMs: latency,
          })
          return
        }

        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
        setGeminiStatus({
          label: 'Gemini API',
          status: response.status === 429 ? 'degraded' : 'offline',
          detail: payload?.error?.message ?? `Gemini returned HTTP ${response.status}.`,
          latencyMs: latency,
        })
      })
      .catch((error: unknown) => {
        if ((error as Error)?.name === 'AbortError') return
        setGeminiStatus({
          label: 'Gemini API',
          status: 'offline',
          detail: error instanceof Error ? error.message : 'Request failed.',
        })
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const start = performance.now()
    void fetch(appEnv.tfliteModelUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) => {
        const latency = Math.round(performance.now() - start)
        if (!response.ok) {
          setTfliteStatus({
            label: 'Tiny Model Asset',
            status: 'offline',
            detail: `Model fetch failed with HTTP ${response.status}.`,
            latencyMs: latency,
          })
          return
        }

        setTfliteStatus({
          label: 'Tiny Model Asset',
          status: 'healthy',
          detail: `${appEnv.tfliteModelUrl} is reachable.`,
          latencyMs: latency,
        })
      })
      .catch((error: unknown) => {
        if ((error as Error)?.name === 'AbortError') return
        setTfliteStatus({
          label: 'Tiny Model Asset',
          status: 'offline',
          detail: error instanceof Error ? error.message : 'Unable to fetch model asset.',
        })
      })

    return () => controller.abort()
  }, [])

  const staticSignals = useMemo<HealthSignal[]>(
    () => [
      {
        label: 'Hosting Runtime',
        status: window.isSecureContext ? 'healthy' : 'degraded',
        detail: window.isSecureContext ? 'Secure HTTPS context detected.' : 'Non-secure context detected.',
      },
      {
        label: 'Firestore Rules',
        status: appEnv.firebaseProjectId ? 'healthy' : 'offline',
        detail: appEnv.firebaseProjectId ? 'Firestore project configuration loaded.' : 'Missing Firebase project ID.',
      },
      {
        label: 'Realtime Database',
        status: appEnv.firebaseRealtimeDbUrl ? 'healthy' : 'degraded',
        detail: appEnv.firebaseRealtimeDbUrl || 'Realtime DB URL is not configured.',
      },
      {
        label: 'Cloud Functions Route',
        status: appEnv.enableCloudFunctions ? 'degraded' : 'healthy',
        detail: appEnv.enableCloudFunctions
          ? 'Cloud Functions mode enabled; verify Spark compatibility if needed.'
          : 'Cloud Functions mode disabled for Spark-safe operation.',
      },
      {
        label: 'Firebase Config',
        status: isFirebaseConfigured() ? 'healthy' : 'offline',
        detail: isFirebaseConfigured() ? 'Core Firebase keys are configured.' : 'One or more core Firebase keys are missing.',
      },
    ],
    [],
  )

  const dynamicSignals = [firebaseStatus, geminiStatus, tfliteStatus]
  const overallOk = [...staticSignals, ...dynamicSignals].every((signal) => signal.status === 'healthy')

  return (
    <div className="status-page-shell">
      <header className="status-page-hero">
        <p>Operations Endpoint</p>
        <h1>/health</h1>
        <h2>{overallOk ? 'All critical systems are healthy.' : 'One or more services need attention.'}</h2>
        <nav>
          <a href="/">Open Dashboard</a>
          <a href="/dev">Open Developer Docs</a>
        </nav>
      </header>

      <section className="status-grid">
        {dynamicSignals.map((signal) => (
          <article key={signal.label} className={`status-card ${statusClass(signal.status)}`}>
            <strong>{signal.label}</strong>
            <span>{signal.status.toUpperCase()}</span>
            <p>{signal.detail}</p>
            {signal.latencyMs !== undefined ? <small>Latency: {signal.latencyMs} ms</small> : null}
          </article>
        ))}
      </section>

      <section className="status-grid static">
        {staticSignals.map((signal) => (
          <article key={signal.label} className={`status-card ${statusClass(signal.status)}`}>
            <strong>{signal.label}</strong>
            <span>{signal.status.toUpperCase()}</span>
            <p>{signal.detail}</p>
          </article>
        ))}
      </section>

      <BrandAttribution />
    </div>
  )
}
