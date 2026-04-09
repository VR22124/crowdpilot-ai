import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const ARTIFACTS_DIR = path.resolve('tests/report/artifacts')
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173'

export async function runPuppeteerRenderingCheck() {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' })

  const metrics = await page.evaluate(() => {
    const map = document.querySelector('[data-testid="stadium-canvas"]')
    const svg = document.querySelector('[data-testid="stadium-svg"]')
    const routeLegend = document.querySelector('.map-route-legend')

    if (!map || !svg) {
      return {
        mapVisible: false,
        svgVisible: false,
        mapWidth: 0,
        mapHeight: 0,
        svgWidth: 0,
        svgHeight: 0,
        aspectRatio: 0,
        legendVisible: !!routeLegend,
      }
    }

    const mapRect = map.getBoundingClientRect()
    const svgRect = svg.getBoundingClientRect()

    return {
      mapVisible: !!map,
      svgVisible: !!svg,
      mapWidth: mapRect.width,
      mapHeight: mapRect.height,
      svgWidth: svgRect.width,
      svgHeight: svgRect.height,
      aspectRatio: svgRect.width / Math.max(1, svgRect.height),
      legendVisible: !!routeLegend,
    }
  })

  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'rendering.json'), JSON.stringify(metrics, null, 2))
  await browser.close()
  return metrics
}
