import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported as analyticsSupported, logEvent, type Analytics } from 'firebase/analytics'
import { getPerformance, trace as perfTrace } from 'firebase/performance'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
import { fetchAndActivate, getRemoteConfig, getValue, type RemoteConfig } from 'firebase/remote-config'
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check'
import { appEnv, isFirebaseConfigured } from '../config/env'

const firebaseConfig = {
  apiKey: appEnv.firebaseApiKey,
  authDomain: appEnv.firebaseAuthDomain,
  projectId: appEnv.firebaseProjectId,
  storageBucket: appEnv.firebaseStorageBucket,
  messagingSenderId: appEnv.firebaseMessagingSenderId,
  appId: appEnv.firebaseAppId,
  measurementId: appEnv.firebaseMeasurementId,
  databaseURL: appEnv.firebaseRealtimeDbUrl,
}

const firebaseApp = isFirebaseConfigured() ? initializeApp(firebaseConfig) : null

const firestore = firebaseApp ? getFirestore(firebaseApp) : null
const realtimeDb = firebaseApp ? getDatabase(firebaseApp) : null
const storage = firebaseApp ? getStorage(firebaseApp) : null
const cloudFunctions = firebaseApp ? getFunctions(firebaseApp, appEnv.firebaseFunctionsRegion) : null
const auth = firebaseApp ? getAuth(firebaseApp) : null
const remoteConfig = firebaseApp ? getRemoteConfig(firebaseApp) : null

let analytics: Analytics | null = null
let performance: ReturnType<typeof getPerformance> | null = null
let appCheck: AppCheck | null = null
let authClient: Auth | null = null
let remoteConfigClient: RemoteConfig | null = null

const enableAnonymousAuth = import.meta.env.VITE_ENABLE_ANONYMOUS_AUTH === 'true'

export async function initializeFirebaseServices(): Promise<void> {
  if (!firebaseApp || typeof window === 'undefined') return

  if (!analytics) {
    const supported = await analyticsSupported()
    if (supported) {
      analytics = getAnalytics(firebaseApp)
    }
  }

  if (!performance) {
    performance = getPerformance(firebaseApp)
  }

  if (!appCheck && appEnv.firebaseAppCheckSiteKey) {
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(appEnv.firebaseAppCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  }

  if (auth && !authClient && enableAnonymousAuth) {
    authClient = auth
    try {
      await signInAnonymously(authClient)
    } catch {
      // Anonymous auth is optional in local development.
    }
  }

  if (remoteConfig && !remoteConfigClient) {
    remoteConfigClient = remoteConfig
    remoteConfigClient.settings = {
      minimumFetchIntervalMillis: 300_000,
      fetchTimeoutMillis: 8_000,
    }
    remoteConfigClient.defaultConfig = {
      simulation_tick_ms: '4000',
      enable_prediction_stream: 'true',
    }

    try {
      await fetchAndActivate(remoteConfigClient)
    } catch {
      // Default config is sufficient when remote fetch fails.
    }
  }
}

export function getRemoteFeatureFlags(): {
  simulationTickMs: number
  enablePredictionStream: boolean
} {
  if (!remoteConfigClient) {
    return {
      simulationTickMs: 4000,
      enablePredictionStream: true,
    }
  }

  const simulationTickMs = Number(getValue(remoteConfigClient, 'simulation_tick_ms').asString() || '4000')
  const enablePredictionStream = getValue(remoteConfigClient, 'enable_prediction_stream').asString() !== 'false'

  return {
    simulationTickMs: Number.isFinite(simulationTickMs) && simulationTickMs >= 1000 ? simulationTickMs : 4000,
    enablePredictionStream,
  }
}

export function trackAnalyticsEvent(name: string, params: Record<string, string | number> = {}): void {
  if (!analytics) return
  logEvent(analytics, name, params)
}

export function startPerformanceTrace(name: string): { stop: () => void } {
  if (!performance) {
    return { stop: () => undefined }
  }

  const current = perfTrace(performance, name)
  current.start()

  return {
    stop: () => {
      void current.stop()
    },
  }
}

export {
  firebaseApp,
  firestore,
  realtimeDb,
  storage,
  cloudFunctions,
  auth,
  remoteConfig,
  analytics,
  performance,
  appCheck,
}
