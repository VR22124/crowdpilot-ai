# Feature Explanation

## 1) Live Crowd Operations Dashboard

- Real-time styled map view of critical stadium zones.
- Phase-driven behavior to simulate realistic event transitions.
- KPI strip for congestion, flow, and route impact.

## 2) Route Optimization

- Computes least-congested route between selected source and destination.
- Provides ETA, time saved, and alternative guidance.
- Updates route quality as crowd conditions change.

## 3) AI Ops Recommendations

- AI summary generated for current match phase.
- Congestion explanation for quick diagnosis.
- Tactical strategy generation for next window.
- Staff deployment recommendation with confidence value.

## 4) Export and Reporting

- Export report data to Sheets.
- Log simulation snapshots to Sheets.
- Export wait-time records.
- Save simulation summary artifacts.
- Source-aware status message for backend transparency.

## 5) Resilient Integration Design

- Workspace backend as primary path (free-tier friendly).
- Optional Cloud Functions fallback path.
- Local fallback response so workflows remain available.

## 6) Security and Governance

- Strict security headers and CSP.
- Client-side sanitization and rate-limiting utilities.
- Secrets kept out of repository tracking.
