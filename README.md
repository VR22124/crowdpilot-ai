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
- No external APIs required

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
# crowdpilot-ai
