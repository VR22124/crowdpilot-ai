export interface AppEnv {
  firebaseApiKey: string
  firebaseAuthDomain: string
  firebaseProjectId: string
  firebaseStorageBucket: string
  firebaseMessagingSenderId: string
  firebaseAppId: string
  firebaseMeasurementId: string
  firebaseRealtimeDbUrl: string
  firebaseVapidKey: string
  firebaseAppCheckSiteKey: string
  geminiApiKey: string
  geminiModel: string
  tfliteModelUrl: string
  firebaseFunctionsRegion: string
  predictionFunctionName: string
  predictionFunctionUrl: string
  cloudRunSimulationUrl: string
  enableCloudFunctions: boolean
  enableTinyLocalMl: boolean
  enableWebPushMessaging: boolean
  enableRealtimeFallback: boolean
  enableDevMetricsPanel: boolean
}

function readBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true'
}

function readString(value: string | undefined): string {
  return (value ?? '').trim()
}

export const appEnv: AppEnv = {
  firebaseApiKey: readString(import.meta.env.VITE_FIREBASE_API_KEY),
  firebaseAuthDomain: readString(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  firebaseProjectId: readString(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  firebaseStorageBucket: readString(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  firebaseMessagingSenderId: readString(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  firebaseAppId: readString(import.meta.env.VITE_FIREBASE_APP_ID),
  firebaseMeasurementId: readString(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
  firebaseRealtimeDbUrl: readString(import.meta.env.VITE_FIREBASE_DATABASE_URL),
  firebaseVapidKey: readString(import.meta.env.VITE_FIREBASE_VAPID_KEY),
  firebaseAppCheckSiteKey: readString(import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY),
  geminiApiKey: readString(import.meta.env.VITE_GEMINI_API_KEY),
  geminiModel: readString(import.meta.env.VITE_GEMINI_MODEL) || 'gemini-2.5-flash',
  tfliteModelUrl: readString(import.meta.env.VITE_TFLITE_MODEL_URL) || '/models/crowdpilot_micro_model.tflite',
  firebaseFunctionsRegion: readString(import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION) || 'us-central1',
  predictionFunctionName: readString(import.meta.env.VITE_PREDICTION_FUNCTION_NAME) || 'predictCrowdState',
  predictionFunctionUrl: readString(import.meta.env.VITE_PREDICTION_FUNCTION_URL),
  cloudRunSimulationUrl: readString(import.meta.env.VITE_CLOUD_RUN_SIMULATION_URL),
  enableCloudFunctions: readBoolean(import.meta.env.VITE_ENABLE_CLOUD_FUNCTIONS, false),
  enableTinyLocalMl: readBoolean(import.meta.env.VITE_ENABLE_TINY_LOCAL_ML, true),
  enableWebPushMessaging: readBoolean(import.meta.env.VITE_ENABLE_WEB_PUSH_MESSAGING, false),
  enableRealtimeFallback: readBoolean(import.meta.env.VITE_ENABLE_REALTIME_FALLBACK, true),
  enableDevMetricsPanel: readBoolean(import.meta.env.VITE_ENABLE_DEV_METRICS_PANEL, true),
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    appEnv.firebaseApiKey &&
      appEnv.firebaseAuthDomain &&
      appEnv.firebaseProjectId &&
      appEnv.firebaseAppId,
  )
}
