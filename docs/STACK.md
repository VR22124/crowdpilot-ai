# Technology Stack

## Frontend

- React 19
- TypeScript
- Vite
- CSS custom dashboard styling

## Core Logic

- Simulation engine for zone density, queue estimation, and alerts
- Route optimization agent
- Crowd intelligence and attendee copilot agents

## AI

- Gemini API for operational summary and strategy generation
- Local lightweight model hooks for resilient inference behavior

## Data + Platform

- Firebase Analytics
- Firebase Performance
- Firestore and Realtime Database integration hooks
- Firebase Hosting

## Google Services Integration

Primary path:
- Google Apps Script web app backend
- Google Sheets export/logging
- Google Drive artifact save

Optional fallback:
- Firebase Cloud Functions callable endpoints

## Security + Reliability

- CSP and security headers in hosting config
- Input sanitization and request rate limiting
- Integration source transparency (`workspace`, `functions`, `local`)
- Graceful fallback when external services are unavailable

## Testing

- Vitest logic suite
- Playwright UI/accessibility/performance suites
- Report generation scripts
