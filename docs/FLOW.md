# Product Flow

This document explains how CrowdPilot AI works during live operation.

## Operational Flow

```mermaid
flowchart LR
  A[Match Phase / Live Inputs] --> B[Simulation Update]
  B --> C[Density + Queue Computation]
  C --> D[Alert + KPI Generation]
  D --> E[AI Summary + Strategy + Forecast]
  E --> F[Route Recommendation + UI Guidance]
  F --> G[Export Actions]
  G --> H[Workspace Backend]
  H --> I[Sheets / Drive Artifacts]
```

## User Journey

1. Open dashboard and select phase (pre-match, innings break, match end, etc.).
2. Observe live crowd map, KPIs, and alerts.
3. Generate route and inspect journey metrics.
4. Trigger AI actions for congestion explanation and strategy.
5. Export operational reports to Google services.
6. Validate export status in UI and review generated artifacts.

## Export Flow Details

```mermaid
sequenceDiagram
  participant UI as Frontend UI
  participant GS as googleService.ts
  participant GAS as Apps Script Web App
  participant GSH as Google Sheets

  UI->>GS: exportToSheets(payload)
  GS->>GAS: POST action + token + payload
  GAS->>GSH: append rows
  GAS-->>GS: ok + link + source
  GS-->>UI: status message
```

## Fallback Behavior

1. Try Workspace endpoint first.
2. If enabled, try Cloud Functions fallback.
3. Return local heuristic result if no backend path works.
