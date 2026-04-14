import { getToken, isSupported, getMessaging } from 'firebase/messaging'
import { appEnv } from '../config/env'
import { firebaseApp, trackAnalyticsEvent } from './firebaseClient'

export async function initializeWebPushMessaging(): Promise<string | null> {
  if (!firebaseApp || !appEnv.enableWebPushMessaging || !appEnv.firebaseVapidKey) {
    return null
  }

  const supported = await isSupported().catch(() => false)
  if (!supported || typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  if (Notification.permission !== 'granted') {
    return null
  }

  try {
    const messaging = getMessaging(firebaseApp)
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    if (!registration) return null

    const token = await getToken(messaging, {
      vapidKey: appEnv.firebaseVapidKey,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      trackAnalyticsEvent('web_push_token_ready', { tokenLength: token.length })
      return token
    }
  } catch {
    return null
  }

  return null
}
