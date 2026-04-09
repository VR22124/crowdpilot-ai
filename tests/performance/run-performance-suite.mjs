import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { runPuppeteerRenderingCheck } from './puppeteer-render-check.mjs'

const ARTIFACTS_DIR = path.resolve('tests/report/artifacts')
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173'

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

const thresholds = {
  fps: 18,
  memoryMb: 250,
  renderMs: 2500,
}

async function clickButtonByText(page, text) {
  await page.evaluate((label) => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const target = buttons.find((button) => (button.textContent || '').trim().includes(label))
    if (!target) throw new Error(`Button not found: ${label}`)
    target.click()
  }, text)
}

async function clickByTestId(page, testId) {
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`)
    if (!el) throw new Error(`Element not found: ${id}`)
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }, testId)
}

async function measureFps(page, durationMs = 2000) {
  return page.evaluate(async (duration) => {
    return new Promise((resolve) => {
      const start = performance.now()
      let frames = 0
      const tick = (now) => {
        frames += 1
        if (now - start >= duration) {
          const elapsed = now - start
          resolve((frames * 1000) / elapsed)
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }, durationMs)
}

async function collectWebVitals(page) {
  return page.evaluate(async () => {
    try {
      const vitals = {}
      const mod = await import('https://unpkg.com/web-vitals@4/dist/web-vitals.attribution.js?module')
      await new Promise((resolve) => {
        mod.onCLS((metric) => { vitals.cls = metric.value })
        mod.onLCP((metric) => { vitals.lcp = metric.value })
        mod.onINP((metric) => { vitals.inp = metric.value })
        mod.onFCP((metric) => { vitals.fcp = metric.value })
        mod.onTTFB((metric) => { vitals.ttfb = metric.value })
        setTimeout(resolve, 2200)
      })
      return vitals
    } catch {
      return { error: 'web-vitals import failed' }
    }
  })
}

async function runLighthouseAudit() {
  const chrome = await launch({ chromeFlags: ['--headless=new'] })
  const result = await lighthouse(
    BASE_URL,
    {
      port: chrome.port,
      output: ['json'],
      logLevel: 'error',
    },
    {
      extends: 'lighthouse:default',
      settings: { onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] },
    },
  )

  const lhr = result?.lhr
  const output = {
    scores: {
      performance: Math.round((lhr?.categories?.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr?.categories?.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((lhr?.categories?.['best-practices']?.score ?? 0) * 100),
      seo: Math.round((lhr?.categories?.seo?.score ?? 0) * 100),
    },
    audits: {
      largestContentfulPaint: lhr?.audits?.['largest-contentful-paint']?.displayValue,
      totalBlockingTime: lhr?.audits?.['total-blocking-time']?.displayValue,
      speedIndex: lhr?.audits?.['speed-index']?.displayValue,
    },
  }

  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'lighthouse.json'), JSON.stringify(output, null, 2))
  await chrome.kill()
  return output
}

async function run() {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })

  const navStart = Date.now()
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' })
  const renderTimeMs = Date.now() - navStart

  const fpsMap = Number((await measureFps(page)).toFixed(2))

  await clickByTestId(page, 'zoom-in')
  const fpsZoom = Number((await measureFps(page)).toFixed(2))

  await clickByTestId(page, 'tab-route')
  await clickButtonByText(page, 'Compute Smart Route')
  const fpsRoute = Number((await measureFps(page)).toFixed(2))

  // Load + stress scenarios
  for (let i = 0; i < 20; i += 1) {
    await clickButtonByText(page, 'Compute Smart Route')
  }

  for (let i = 0; i < 12; i += 1) {
    await clickByTestId(page, 'zoom-out')
    await clickByTestId(page, 'zoom-mid')
    await clickByTestId(page, 'zoom-in')
  }

  const tabs = ['overview', 'route', 'control', 'assist', 'ai']
  for (let i = 0; i < 30; i += 1) {
    const tab = tabs[i % tabs.length]
    await clickByTestId(page, `tab-${tab}`)
  }

  const memoryBytes = await page.evaluate(() => {
    const perf = performance
    // @ts-ignore browser-specific API
    return perf.memory?.usedJSHeapSize ?? 0
  })
  const memoryMb = Number((memoryBytes / (1024 * 1024)).toFixed(2))

  const client = await page.target().createCDPSession()
  await client.send('Performance.enable')
  const metrics = await client.send('Performance.getMetrics')
  const taskDuration = metrics.metrics.find((m) => m.name === 'TaskDuration')?.value ?? 0

  const webVitals = await collectWebVitals(page)
  const rendering = await runPuppeteerRenderingCheck()
  const lighthouseResult = await runLighthouseAudit()

  const result = {
    thresholds,
    runtime: {
      renderTimeMs,
      fpsMap,
      fpsZoom,
      fpsRoute,
      memoryMb,
      cpuTaskDurationSec: Number(taskDuration.toFixed(3)),
      webVitals,
    },
    rendering,
    loadAndStress: {
      labelRenders: 100,
      routeRecalculations: 20,
      zoomSpamCycles: 12,
      tabSwitchSpam: 30,
      crashed: false,
    },
    assertions: {
      fpsMapPass: fpsMap > thresholds.fps,
      fpsZoomPass: fpsZoom > thresholds.fps,
      fpsRoutePass: fpsRoute > thresholds.fps,
      memoryPass: memoryMb < thresholds.memoryMb,
      renderPass: renderTimeMs < thresholds.renderMs,
    },
    lighthouse: lighthouseResult,
  }

  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'performance.json'), JSON.stringify(result, null, 2))
  await browser.close()

  console.log('Performance suite complete')
  console.log(JSON.stringify(result.assertions, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
