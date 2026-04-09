import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS = path.resolve('tests/report/artifacts')
const OUT_JSON = path.resolve('tests/report/tests-report.json')
const OUT_HTML = path.resolve('tests/report/tests-report.html')

function readJson(fileName, fallback = {}) {
  const filePath = path.join(ARTIFACTS, fileName)
  if (!fs.existsSync(filePath)) return fallback
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function parsePlaywright(uiJson) {
  const suites = uiJson.suites ?? []
  let total = 0
  let passed = 0
  let failed = 0

  const walk = (items) => {
    for (const suite of items) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests ?? []) {
            total += 1
            const status = test.results?.[0]?.status ?? 'unknown'
            if (status === 'passed') passed += 1
            else if (status === 'failed') failed += 1
          }
        }
      }
      walk(suite.suites ?? [])
    }
  }

  walk(suites)
  return { total, passed, failed }
}

function parseVitest(logicJson) {
  const numTotalTests = logicJson.numTotalTests ?? 0
  const numPassedTests = logicJson.numPassedTests ?? 0
  const numFailedTests = logicJson.numFailedTests ?? 0
  return {
    total: numTotalTests,
    passed: numPassedTests,
    failed: numFailedTests,
  }
}

function percent(part, total) {
  return total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0
}

const uiRaw = readJson('ui.json')
const logicRaw = readJson('logic.json')
const perfRaw = readJson('performance.json')
const lighthouseRaw = readJson('lighthouse.json')
const renderingRaw = readJson('rendering.json')

const ui = parsePlaywright(uiRaw)
const logic = parseVitest(logicRaw)

const totalTests = ui.total + logic.total
const passedTests = ui.passed + logic.passed
const failedTests = ui.failed + logic.failed
const passPercentage = percent(passedTests, totalTests)

const perfChecks = perfRaw.assertions ?? {}
const perfFailures = Object.entries(perfChecks)
  .filter(([, value]) => value === false)
  .map(([key]) => key)

const warnings = []
if ((lighthouseRaw.scores?.accessibility ?? 0) < 90) warnings.push('Accessibility score below 90')
if ((lighthouseRaw.scores?.performance ?? 0) < 50) warnings.push('Performance score below 50')
if (perfFailures.length) warnings.push(`Performance thresholds failed: ${perfFailures.join(', ')}`)

const suggestions = [
  ...(perfFailures.includes('memoryPass') ? ['Reduce label recomputation frequency and memoize heavy map paths.'] : []),
  ...(perfFailures.includes('fpsRoutePass') ? ['Lower route animation particle density for heavy scenes.'] : []),
  ...((lighthouseRaw.scores?.accessibility ?? 100) < 90 ? ['Improve keyboard navigation cues and color contrast tokens.'] : []),
]

const summary = {
  generatedAt: new Date().toISOString(),
  passPercentage,
  totals: {
    tests: totalTests,
    passed: passedTests,
    failed: failedTests,
  },
  ui,
  logic,
  performance: perfRaw,
  lighthouse: lighthouseRaw,
  rendering: renderingRaw,
  warnings,
  failures: perfFailures,
  suggestions,
  status: failedTests === 0 && perfFailures.length === 0 ? 'PASS' : 'WARN',
}

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2))

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CrowdPilot Test Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 24px; background: #0b1220; color: #e2e8f0; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .card { border: 1px solid rgba(148,163,184,.3); border-radius: 14px; padding: 16px; background: rgba(15,23,42,.7); }
    .bar { height: 10px; border-radius: 999px; background: #1e293b; overflow: hidden; }
    .bar > i { display:block; height:100%; background: linear-gradient(90deg,#3A86FF,#7dd3fc); }
    .ok { color:#4ade80; } .warn { color:#fbbf24; } .bad { color:#fb7185; }
    h1,h2,h3 { margin: 0 0 10px; }
    ul { margin: 8px 0 0 18px; }
  </style>
</head>
<body>
  <h1>IPL Stadium Digital Twin — Automated Testing Report</h1>
  <p>Status: <strong class="${summary.status === 'PASS' ? 'ok' : 'warn'}">${summary.status}</strong> · Pass ${summary.passPercentage}%</p>

  <section class="grid">
    <div class="card"><h3>UI Tests</h3><p>${ui.passed}/${ui.total} passed</p><div class="bar"><i style="width:${percent(ui.passed, ui.total)}%"></i></div></div>
    <div class="card"><h3>Logic Tests</h3><p>${logic.passed}/${logic.total} passed</p><div class="bar"><i style="width:${percent(logic.passed, logic.total)}%"></i></div></div>
    <div class="card"><h3>Lighthouse</h3><p>Perf ${lighthouseRaw.scores?.performance ?? 0} · A11y ${lighthouseRaw.scores?.accessibility ?? 0}</p></div>
    <div class="card"><h3>Runtime Metrics</h3><p>FPS map ${perfRaw.runtime?.fpsMap ?? 'n/a'} · Memory ${perfRaw.runtime?.memoryMb ?? 'n/a'}MB</p></div>
  </section>

  <section class="grid" style="margin-top:16px;">
    <div class="card">
      <h3>Warnings</h3>
      <ul>${warnings.map((w) => `<li>${w}</li>`).join('') || '<li>None</li>'}</ul>
    </div>
    <div class="card">
      <h3>Failures</h3>
      <ul>${perfFailures.map((f) => `<li>${f}</li>`).join('') || '<li>None</li>'}</ul>
    </div>
    <div class="card">
      <h3>Suggestions</h3>
      <ul>${suggestions.map((s) => `<li>${s}</li>`).join('') || '<li>No suggestions</li>'}</ul>
    </div>
  </section>
</body>
</html>`

fs.writeFileSync(OUT_HTML, html)
console.log('Report generated: tests/report/tests-report.json and tests/report/tests-report.html')
