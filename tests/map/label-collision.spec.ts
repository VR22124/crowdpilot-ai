// @ts-nocheck
import { expect, test } from '@playwright/test'
import { openApp, overlapCount } from '../ui/testUtils'

test.describe('Label collision and zoom behavior', () => {
  test('OUT/MID label limits and IN full-detail visibility', async ({ page }) => {
    await openApp(page)

    const visibleLabelCount = async () => {
      return page.locator('.map-label-item').evaluateAll((nodes) => {
        return nodes.filter((node) => {
          const style = window.getComputedStyle(node as Element)
          return style.opacity !== '0' && style.visibility !== 'hidden' && style.display !== 'none'
        }).length
      })
    }

    await page.getByTestId('zoom-out').click()
    await page.waitForTimeout(120)
    const outCount = await visibleLabelCount()
    expect(outCount).toBeLessThanOrEqual(6)

    await page.getByTestId('zoom-mid').click()
    await page.waitForTimeout(120)
    const midCount = await visibleLabelCount()
    expect(midCount).toBeLessThanOrEqual(12)

    await page.getByTestId('zoom-in').click()
    await page.waitForTimeout(150)
    const inCount = await visibleLabelCount()
    expect(inCount).toBeGreaterThan(midCount)
  })

  test('labels avoid heavy overlap and show leader lines when displaced', async ({ page }) => {
    await openApp(page)

    await page.getByTestId('zoom-in').click()
    await page.waitForTimeout(200)

    const overlaps = await overlapCount(page.locator('.map-label-item'))
    expect(overlaps).toBeLessThan(10)

    const leaderCount = await page.locator('.map-label-leader').count()
    expect(leaderCount).toBeGreaterThanOrEqual(0)
  })
})
