import { BrandAttribution } from '../components/BrandAttribution'
import { appEnv } from '../config/env'

const stackItems = [
  'React 19 + TypeScript + Vite',
  'Firebase Hosting, Realtime Database, Firestore',
  'Gemini API with model fallback chain',
  'Tiny local ML + hosted .tflite artifact',
  'Client analytics and performance telemetry',
]

const securityItems = [
  'Strict CSP with explicit script/connect/image allowlists',
  'HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy',
  'Permissions-Policy and cross-origin isolation headers',
  'Input sanitization and in-memory chat rate limiter',
  'Gemini-only assistant path with graceful service fallback message',
]

const services = [
  { name: 'Firebase Hosting', detail: 'Production SPA hosting and edge delivery' },
  { name: 'Realtime Database', detail: appEnv.firebaseRealtimeDbUrl || 'Not configured' },
  { name: 'Firestore', detail: appEnv.firebaseProjectId || 'Not configured' },
  { name: 'Gemini', detail: appEnv.geminiModel || 'Not configured' },
  { name: 'Tiny Model Asset', detail: appEnv.tfliteModelUrl },
]

const flags = [
  ['Cloud Functions Enabled', String(appEnv.enableCloudFunctions)],
  ['Tiny Local ML Enabled', String(appEnv.enableTinyLocalMl)],
  ['Web Push Messaging Enabled', String(appEnv.enableWebPushMessaging)],
  ['Realtime Fallback Enabled', String(appEnv.enableRealtimeFallback)],
  ['Dev Metrics Panel Enabled', String(appEnv.enableDevMetricsPanel)],
]

export function DevPage() {
  return (
    <div className="dev-page-shell">
      <header className="dev-page-hero">
        <p>Engineering Endpoint</p>
        <h1>/dev</h1>
        <h2>Project architecture, services, security posture, and deployment notes.</h2>
        <nav>
          <a href="/">Open Dashboard</a>
          <a href="/health">Open Health Status</a>
        </nav>
      </header>

      <section className="dev-section-grid">
        <article className="dev-card">
          <h3>Project Overview</h3>
          <p>
            CrowdPilot AI is a stadium operations intelligence platform that combines realtime crowd telemetry,
            route optimization, AI guidance, and event-control workflows for match-day operations.
          </p>
          <ul>
            <li>Single-page React app with route-based specialized operational endpoints.</li>
            <li>Gemini-driven attendee assistant messages in chat.</li>
            <li>Realtime and predictive logic designed for Spark-safe deployment defaults.</li>
          </ul>
        </article>

        <article className="dev-card">
          <h3>Stack Used</h3>
          <ul>
            {stackItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="dev-card">
          <h3>Security Controls</h3>
          <ul>
            {securityItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="dev-section-grid">
        <article className="dev-card">
          <h3>Services Used</h3>
          <div className="kv-grid">
            {services.map((service) => (
              <div key={service.name}>
                <span>{service.name}</span>
                <strong>{service.detail}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="dev-card">
          <h3>Runtime Feature Flags</h3>
          <div className="kv-grid">
            {flags.map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="dev-card">
          <h3>Operational Paths</h3>
          <ul>
            <li>/ : Live dashboard for operations and attendee assist.</li>
            <li>/health : Runtime checks for Gemini, Firebase, model asset, and hosting posture.</li>
            <li>/dev : Detailed engineering documentation for stack and service visibility.</li>
          </ul>
        </article>
      </section>

      <BrandAttribution />
    </div>
  )
}
