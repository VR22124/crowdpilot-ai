# CrowdPilot Automated Testing

## Commands

- `npm run test:logic` — Vitest logic + DOM tests
- `npm run test:ui` — Playwright UI, map, navigation, responsiveness, accessibility tests
- `npm run test:performance` — Puppeteer + Lighthouse + runtime Web Vitals and stress metrics
- `npm run test:report` — Generate consolidated HTML/JSON report
- `npm run test:full` — Run full suite and generate final report

## Output Artifacts

Generated in `tests/report/`:

- `tests-report.json`
- `tests-report.html`
- `artifacts/logic.json`
- `artifacts/ui.json`
- `artifacts/performance.json`
- `artifacts/lighthouse.json`
- `artifacts/rendering.json`
