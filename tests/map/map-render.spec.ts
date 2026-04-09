// @ts-nocheck
import { expect, test } from '@playwright/test'
import { openApp } from '../ui/testUtils'

test.describe('Map rendering', () => {
  test('map fits viewport and keeps aspect ratio', async ({ page }) => {
    await openApp(page)

    const size = await page.evaluate(() => {
      const map = document.querySelector('[data-testid="stadium-canvas"]') as HTMLElement
      const svg = document.querySelector('[data-testid="stadium-svg"]') as SVGSVGElement
      const mapRect = map.getBoundingClientRect()
      const svgRect = svg.getBoundingClientRect()
      return {
        mapWidth: mapRect.width,
        mapHeight: mapRect.height,
        svgWidth: svgRect.width,
        svgHeight: svgRect.height,
      }
    })

    expect(size.mapHeight).toBeGreaterThan(300)
    expect(size.mapHeight).toBeLessThanOrEqual(0.8 * 1080)
    expect(size.svgWidth / size.svgHeight).toBeGreaterThan(1.2)
    expect(size.svgWidth / size.svgHeight).toBeLessThan(2.5)
  })

  test('route lines, density overlays, and icons render', async ({ page }) => {
    await openApp(page)

    await page.getByTestId('tab-route').click()
    await page.getByRole('button', { name: 'Compute Smart Route' }).first().click()
    await page.getByTestId('zoom-mid').click()
    await page.waitForTimeout(120)

    await expect(page.locator('#primaryRoutePath')).toHaveCount(1)
    const facilityCount = await page.locator('.facility-icon').count()
    const zoneIconCount = await page.locator('.zone-icon').count()
    expect(facilityCount).toBeGreaterThan(2)
    expect(zoneIconCount).toBeGreaterThan(2)
  })
})
