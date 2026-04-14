const INPUT_LIMIT = 240

export function sanitizeInput(value: string): string {
  return value
    .replace(/[<>"'`]/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, INPUT_LIMIT)
}

export interface RateLimiter {
  canProceed: () => boolean
  reset: () => void
}

export function createRateLimiter(maxActions: number, windowMs: number): RateLimiter {
  const timestamps: number[] = []

  return {
    canProceed: () => {
      const now = Date.now()
      while (timestamps.length > 0 && now - timestamps[0] > windowMs) {
        timestamps.shift()
      }

      if (timestamps.length >= maxActions) {
        return false
      }

      timestamps.push(now)
      return true
    },
    reset: () => {
      timestamps.splice(0, timestamps.length)
    },
  }
}

export const strictCspDirectives = [
  "default-src 'self'",
  "script-src 'self' https://www.gstatic.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://firebasestorage.googleapis.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.run.app",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')
