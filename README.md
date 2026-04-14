# CrowdPilot AI

CrowdPilot AI is an interactive, AI-powered stadium experience platform for hackathon demos and product exploration.

It simulates live crowd behavior across stadium zones and uses three internal AI agents to improve venue flow:

- Crowd Intelligence Agent (density monitoring and congestion forecasting)
- Route Optimization Agent (least-crowded route + ETA + alternate path)
- Attendee Copilot Agent (conversational recommendations from live data)

## Features

- Live crowd heatmap with animated zone updates every 5 seconds
- Dynamic wait-time prediction for entry gates, food court, and restrooms
- Smart route planner with congestion-aware pathing and fallback route
- Conversational attendee copilot panel
- Real-time alerts for congestion and flow changes
- Demo scenario controls:
  - Increase gate crowd
  - Food rush
  - Halftime surge
  - Match end exit rush

## Tech Stack

- React 19
- TypeScript
- Vite
- Firebase (Firestore, Realtime Database, Analytics, Performance, App Check, Cloud Functions)
- Google Cloud (Cloud Run simulation service, Cloud Scheduler, Cloud Monitoring/Logging)

## Run Locally

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Architecture Notes

- `src/agents`: Internal AI agent logic
- `src/engine`: Wait-time and alert generation
- `src/components`: Modular dashboard components
- `src/hooks/useCrowdPilotSimulation.ts`: State-based simulation orchestration
- `src/data/stadium.ts`: Stadium topology and zone definitions

## Production Upgrade Layers

- Realtime data layer:
  - `src/realtime/liveCrowdStore.ts`
  - `src/realtime/streams.ts` (`densityStream`, `queueStream`, `predictionStream`)
  - `src/realtime/livePipeline.ts`
- Intelligence layer:
  - `src/engine/predictionEngine.ts`
  - `src/ml/tinyLinearModel.ts` and `src/ml/crowdMlEngine.ts` (small on-device ML model)
  - cloud prediction hook: `src/services/googleCloud.ts`
- Security layer:
  - `firebase.json` secure headers and CSP
  - `src/services/security.ts` input sanitation and client-side rate limiting
- Performance layer:
  - lazy loading and code splitting
  - `src/engine/perfMetrics.ts` FPS/render/latency tracking
  - memoized selectors in `src/store/selectors.ts`

## Firebase + GCP Setup

1. Create Firebase project:
   - https://console.firebase.google.com/
2. Register web app and copy config values:
   - Project settings -> Your apps -> Web app
3. Enable products:
   - Firestore: https://console.firebase.google.com/project/_/firestore
   - Realtime DB: https://console.firebase.google.com/project/_/database
   - Analytics: https://console.firebase.google.com/project/_/analytics
   - App Check: https://console.firebase.google.com/project/_/appcheck
   - Functions: https://console.firebase.google.com/project/_/functions
4. Cloud Run service for simulation:
   - https://console.cloud.google.com/run
5. Cloud Scheduler for periodic updates:
   - https://console.cloud.google.com/cloudscheduler
6. Cloud Logging + Monitoring:
   - https://console.cloud.google.com/logs
   - https://console.cloud.google.com/monitoring

## Environment Variables

Create `.env` from `.env.example` and provide real values for all `VITE_FIREBASE_*` keys plus cloud URLs.

For Spark/free-tier Google service integration (without Functions deploy), configure:

- `VITE_WORKSPACE_API_URL`
- `VITE_WORKSPACE_API_TOKEN`

and keep:

- `VITE_ENABLE_CLOUD_FUNCTIONS=false`

Apps Script backend template and setup steps are in `workspace-backend/README.md`.

## Deploy

- Firebase Hosting:
  - `firebase deploy --only hosting,firestore:rules,database,functions`
- Cloud Run simulation:
  - `gcloud run deploy crowdpilot-sim --source cloudrun --region us-central1 --allow-unauthenticated`

Spark-safe deploy option:

- Deploy Hosting only:
  - `firebase deploy --only hosting --project <your_project_id>`
- Use Apps Script web app backend from `workspace-backend/Code.gs`.
# crowdpilot-ai
